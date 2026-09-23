import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

export const COMMUNITY_WORKER_PACKAGE = "@report-intelligence/crystal-worker-community-win32-x64";
export const PRO_WORKER_PACKAGE = "@report-intelligence/crystal-worker-pro-win32-x64";

type WorkerEdition = "community" | "pro" | "custom";
type WorkerSource = "environment" | "npm" | "installed";

interface WorkerPackage {
  edition?: unknown;
  getWorkerPath?: unknown;
  workerPath?: unknown;
}

export interface CrystalWorkerResolution {
  workerPath: string;
  edition: WorkerEdition;
  source: WorkerSource;
  packageName?: string;
}

export interface CrystalWorkerResolutionOptions {
  explicitPath?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  env?: NodeJS.ProcessEnv;
  loadPackage?: (packageName: string) => unknown;
  fileExists?: (candidate: string) => Promise<boolean>;
}

const requireFromHere = createRequire(import.meta.url);

async function defaultFileExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function defaultLoadPackage(packageName: string): unknown {
  return requireFromHere(packageName);
}

function isMissingPackageError(error: unknown, packageName: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "MODULE_NOT_FOUND"
    && typeof candidate.message === "string"
    && candidate.message.includes(packageName);
}

function packageWorkerPath(value: unknown, packageName: string): string {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Worker package '${packageName}' has an invalid export`);
  }

  const workerPackage = value as WorkerPackage;
  const candidate = typeof workerPackage.getWorkerPath === "function"
    ? (workerPackage.getWorkerPath as () => unknown)()
    : workerPackage.workerPath;

  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new Error(`Worker package '${packageName}' did not export a worker path`);
  }

  return path.resolve(candidate);
}

function installedWorkerCandidates(env: NodeJS.ProcessEnv): Array<{
  workerPath: string;
  edition: Exclude<WorkerEdition, "custom">;
}> {
  const roots = [env["ProgramFiles"], env["LOCALAPPDATA"]].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const candidates: Array<{ workerPath: string; edition: Exclude<WorkerEdition, "custom"> }> = [];

  for (const root of roots) {
    candidates.push({
      workerPath: path.join(root, "Report Intelligence", "Crystal Worker Pro", "CrystalWorker.exe"),
      edition: "pro",
    });
    candidates.push({
      workerPath: path.join(root, "Report Intelligence", "Crystal Worker Community", "CrystalWorker.exe"),
      edition: "community",
    });
  }

  if (env["LOCALAPPDATA"]) {
    candidates.unshift({
      workerPath: path.join(
        env["LOCALAPPDATA"],
        "Microsoft", "WindowsApps", "report-intelligence-crystal-worker.exe",
      ),
      edition: "community",
    });
  }

  return candidates;
}

export async function resolveCrystalWorker(
  options: CrystalWorkerResolutionOptions = {},
): Promise<CrystalWorkerResolution> {
  const fileExists = options.fileExists ?? defaultFileExists;
  const explicitPath = options.explicitPath?.trim();

  if (explicitPath) {
    const candidate = path.resolve(explicitPath);
    if (!await fileExists(candidate)) {
      throw new Error(`CRYSTAL_WORKER_PATH does not point to an existing file: ${candidate}`);
    }
    return { workerPath: candidate, edition: "custom", source: "environment" };
  }

  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  if (platform !== "win32" || arch !== "x64") {
    throw new Error(
      "Local Crystal extraction requires Windows x64. Run the MCP server on Windows, configure CRYSTAL_WORKER_PATH for a compatible worker, or use a future remote worker transport.",
    );
  }

  const loadPackage = options.loadPackage ?? defaultLoadPackage;
  async function resolvePackage(
    packageName: string,
    edition: Exclude<WorkerEdition, "custom">,
  ): Promise<CrystalWorkerResolution | undefined> {
    let loaded: unknown;
    try {
      loaded = loadPackage(packageName);
    } catch (error) {
      if (isMissingPackageError(error, packageName)) return undefined;
      throw new Error(`Worker package '${packageName}' could not be loaded`, { cause: error });
    }

    const candidate = packageWorkerPath(loaded, packageName);
    if (!await fileExists(candidate)) {
      throw new Error(
        `Worker package '${packageName}' is installed but its executable is missing: ${candidate}`,
      );
    }

    return {
      workerPath: candidate,
      edition,
      source: "npm",
      packageName,
    };
  }

  const installed = installedWorkerCandidates(options.env ?? process.env);
  const npmPro = await resolvePackage(PRO_WORKER_PACKAGE, "pro");
  if (npmPro) return npmPro;

  for (const candidate of installed.filter((item) => item.edition === "pro")) {
    if (await fileExists(candidate.workerPath)) {
      return { ...candidate, source: "installed" };
    }
  }

  for (const candidate of installed.filter((item) => item.edition === "community")) {
    if (await fileExists(candidate.workerPath)) {
      return { ...candidate, source: "installed" };
    }
  }

  const npmCommunity = await resolvePackage(COMMUNITY_WORKER_PACKAGE, "community");
  if (npmCommunity) return npmCommunity;

  throw new Error(
    `No Crystal worker was found. Install ${COMMUNITY_WORKER_PACKAGE}, or set CRYSTAL_WORKER_PATH to a Community or Pro CrystalWorker.exe. The SAP Crystal Reports x64 runtime must also be installed separately.`,
  );
}
