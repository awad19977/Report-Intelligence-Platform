import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMUNITY_WORKER_PACKAGE,
  PRO_WORKER_PACKAGE,
  resolveCrystalWorker,
} from "../src/worker-resolution.js";

const exists = async () => true;

function missingModule(packageName: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`Cannot find module '${packageName}'`), { code: "MODULE_NOT_FOUND" });
}

describe("resolveCrystalWorker", () => {
  it("uses the Store execution alias ahead of the unsigned Community npm worker", async () => {
    const resolution = await resolveCrystalWorker({
      platform: "win32",
      arch: "x64",
      env: { LOCALAPPDATA: "C:/Users/test/AppData/Local" },
      loadPackage(packageName) {
        if (packageName === PRO_WORKER_PACKAGE) throw missingModule(packageName);
        return { workerPath: "C:/npm/community/CrystalWorker.exe" };
      },
      fileExists: async (candidate) => candidate.includes("WindowsApps"),
    });
    expect(resolution).toMatchObject({ edition: "community", source: "installed" });
    expect(resolution.workerPath).toContain("report-intelligence-crystal-worker.exe");
  });
  it("honors CRYSTAL_WORKER_PATH before platform and package discovery", async () => {
    const resolution = await resolveCrystalWorker({
      explicitPath: "C:/workers/custom/CrystalWorker.exe",
      platform: "linux",
      arch: "arm64",
      fileExists: exists,
    });

    expect(resolution).toMatchObject({
      workerPath: path.resolve("C:/workers/custom/CrystalWorker.exe"),
      edition: "custom",
      source: "environment",
    });
  });

  it("prefers an installed Pro npm worker over Community", async () => {
    const loaded: string[] = [];
    const resolution = await resolveCrystalWorker({
      platform: "win32",
      arch: "x64",
      env: {},
      loadPackage(packageName) {
        loaded.push(packageName);
        if (packageName === PRO_WORKER_PACKAGE) {
          return { getWorkerPath: () => "C:/npm/pro/CrystalWorker.exe" };
        }
        return { getWorkerPath: () => "C:/npm/community/CrystalWorker.exe" };
      },
      fileExists: exists,
    });

    expect(loaded).toEqual([PRO_WORKER_PACKAGE]);
    expect(resolution).toMatchObject({
      edition: "pro",
      source: "npm",
      packageName: PRO_WORKER_PACKAGE,
    });
  });

  it("falls back to the Community npm worker when Pro is unavailable", async () => {
    const resolution = await resolveCrystalWorker({
      platform: "win32",
      arch: "x64",
      env: {},
      loadPackage(packageName) {
        if (packageName === PRO_WORKER_PACKAGE) throw missingModule(packageName);
        return { workerPath: "C:/npm/community/CrystalWorker.exe" };
      },
      fileExists: exists,
    });

    expect(resolution).toMatchObject({
      edition: "community",
      source: "npm",
      packageName: COMMUNITY_WORKER_PACKAGE,
    });
  });

  it("prefers a conventionally installed Pro worker over npm Community", async () => {
    const proPath = path.join(
      "C:/Program Files",
      "Report Intelligence",
      "Crystal Worker Pro",
      "CrystalWorker.exe",
    );
    const resolution = await resolveCrystalWorker({
      platform: "win32",
      arch: "x64",
      env: { ProgramFiles: "C:/Program Files" },
      loadPackage(packageName) {
        if (packageName === PRO_WORKER_PACKAGE) throw missingModule(packageName);
        return { workerPath: "C:/npm/community/CrystalWorker.exe" };
      },
      fileExists: async (candidate) => candidate === proPath,
    });

    expect(resolution).toMatchObject({ edition: "pro", source: "installed" });
  });

  it("does not hide a broken installed worker package", async () => {
    await expect(resolveCrystalWorker({
      platform: "win32",
      arch: "x64",
      loadPackage(packageName) {
        throw new Error(`broken package: ${packageName}`);
      },
      fileExists: exists,
    })).rejects.toThrow(`Worker package '${PRO_WORKER_PACKAGE}' could not be loaded`);
  });

  it("reports an actionable error on unsupported local platforms", async () => {
    await expect(resolveCrystalWorker({
      platform: "linux",
      arch: "x64",
    })).rejects.toThrow("requires Windows x64");
  });

  it("reports a missing explicit worker instead of silently falling back", async () => {
    await expect(resolveCrystalWorker({
      explicitPath: "C:/missing/CrystalWorker.exe",
      fileExists: async () => false,
    })).rejects.toThrow("CRYSTAL_WORKER_PATH does not point to an existing file");
  });
});
