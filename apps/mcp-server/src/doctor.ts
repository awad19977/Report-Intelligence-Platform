import { realpath } from "node:fs/promises";
import path from "node:path";
import { CrystalWorkerClient } from "@report-intelligence/crystal-client";
import { z } from "zod";
import { resolveCrystalWorker } from "./worker-resolution.js";

export interface DoctorCheck {
  name: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheck[];
}

export async function diagnose(reportPath?: string): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({
    name: "Node.js",
    status: nodeMajor >= 20 ? "ok" : "error",
    detail: `v${process.versions.node}; version 20 or newer is required`,
  });

  if (process.platform !== "win32" || process.arch !== "x64") {
    checks.push({
      name: "Windows",
      status: "error",
      detail: `Local Crystal extraction requires Windows x64; found ${process.platform}/${process.arch}`,
    });
    return { ok: false, checks };
  }
  checks.push({ name: "Windows", status: "ok", detail: "Windows x64" });

  let resolution;
  try {
    resolution = await resolveCrystalWorker({ explicitPath: process.env["CRYSTAL_WORKER_PATH"] });
    checks.push({
      name: "Worker",
      status: "ok",
      detail: `${resolution.edition} (${resolution.source}): ${resolution.workerPath}`,
    });
  } catch (error) {
    checks.push({
      name: "Worker",
      status: "error",
      detail: error instanceof Error ? error.message : "Worker discovery failed",
    });
    return { ok: false, checks };
  }

  const worker = new CrystalWorkerClient({
    workerPath: resolution.workerPath,
    startupTimeoutMs: 10_000,
    requestTimeoutMs: 30_000,
    shutdownTimeoutMs: 3_000,
  });

  try {
    await worker.connect();
    const health = await worker.request(
      "health_check",
      [],
      z.object({ healthy: z.literal(true), protocolVersion: z.literal("1.0") }),
    );
    checks.push({
      name: "Protocol",
      status: "ok",
      detail: `Worker responds to health_check (protocol ${health.protocolVersion})`,
    });

    if (reportPath) {
      try {
        if (path.extname(reportPath).toLowerCase() !== ".rpt") {
          throw new Error("The smoke-test file must have a .rpt extension");
        }
        const canonicalPath = await realpath(path.resolve(reportPath));
        const metadata = await worker.readMetadata(canonicalPath);
        checks.push({
          name: "Crystal runtime",
          status: "ok",
          detail: `Opened ${canonicalPath}${metadata.title ? ` (${metadata.title})` : ""}`,
        });
      } catch (error) {
        checks.push({
          name: "Crystal runtime",
          status: "error",
          detail: error instanceof Error ? error.message : "Report smoke test failed",
        });
      }
    } else {
      checks.push({
        name: "Crystal runtime",
        status: "warning",
        detail: "Not verified by health_check; run doctor --report C:\\path\\to\\report.rpt to test extraction",
      });
    }
  } catch (error) {
    checks.push({
      name: "Protocol",
      status: "error",
      detail: error instanceof Error ? error.message : "Worker did not start",
    });
  } finally {
    await worker.disconnect();
  }

  return { ok: !checks.some((check) => check.status === "error"), checks };
}

export async function doctorCommand(args: string[]): Promise<number> {
  let reportPath: string | undefined;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") json = true;
    else if (arg === "--report" && args[index + 1]) reportPath = args[++index];
    else {
      process.stderr.write(`Unknown or incomplete doctor option: ${arg}\n`);
      return 2;
    }
  }

  const result = await diagnose(reportPath);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const check of result.checks) {
      process.stdout.write(`${check.status.toUpperCase().padEnd(7)} ${check.name}: ${check.detail}\n`);
    }
  }
  return result.ok ? 0 : 1;
}
