import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  CrystalReadOptionsSchema,
  CrystalWorkerClient,
  CrystalWorkerError,
  redactSecrets,
  type WorkerErrorCode,
} from "@rip/crystal-client";
import winston from "winston";
import { z } from "zod";

const ALL_LOG_LEVELS = ["error", "warn", "info", "http", "verbose", "debug", "silly"];
const DEFAULT_MAX_REPORT_BYTES = 256 * 1024 * 1024;

const logger = winston.createLogger({
  level: process.env["LOG_LEVEL"] ?? "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ stderrLevels: ALL_LOG_LEVELS })],
});

const ReadReportInputSchema = z.object({
  filePath: z.string().trim().min(1),
  includeSavedData: z.boolean().optional(),
  includeFormatting: z.boolean().optional(),
  includeSubreports: z.boolean().optional(),
});

interface ServerConfig {
  allowedReportRoots: string[];
  maxReportBytes: number;
}

class ToolError extends Error {
  constructor(public readonly code: WorkerErrorCode, message: string) {
    super(message);
    this.name = "ToolError";
  }
}

function createServer(worker: CrystalWorkerClient, config: ServerConfig): Server {
  const server = new Server(
    { name: "report-intelligence-platform", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "read_report",
        description: "Read a Crystal Report file and return its validated structure",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
            includeSavedData: { type: "boolean", default: false },
            includeFormatting: { type: "boolean", default: true },
            includeSubreports: { type: "boolean", default: true },
          },
          required: ["filePath"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "read_report") {
      return toolFailure("UNSUPPORTED_FEATURE", `Tool '${request.params.name}' is not available in this milestone`);
    }

    try {
      const input = ReadReportInputSchema.parse(request.params.arguments ?? {});
      const filePath = await authorizeReportPath(input.filePath, config);
      const options = CrystalReadOptionsSchema.parse({
        includeSavedData: input.includeSavedData,
        includeFormatting: input.includeFormatting,
        includeSubreports: input.includeSubreports,
      });

      logger.info("Reading Crystal report", { filePath });
      const report = redactSecrets(await worker.readReport(filePath, options));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
      };
    } catch (error) {
      const safe = mapToolError(error);
      logger.warn("Crystal report request failed", { code: safe.code, message: safe.message });
      return toolFailure(safe.code, safe.message);
    }
  });

  return server;
}

async function authorizeReportPath(inputPath: string, config: ServerConfig): Promise<string> {
  if (path.extname(inputPath).toLowerCase() !== ".rpt") {
    throw new ToolError("UNSUPPORTED_FILE", "Only .rpt files are supported");
  }

  let canonicalPath: string;
  try {
    canonicalPath = await realpath(path.resolve(inputPath));
  } catch {
    throw new ToolError("FILE_NOT_FOUND", "Report file was not found");
  }

  const allowed = config.allowedReportRoots.some((root) => isPathInside(root, canonicalPath));
  if (!allowed) {
    throw new ToolError("FILE_OUTSIDE_ALLOWED_ROOTS", "Report file is outside the configured allowed roots");
  }

  const file = await stat(canonicalPath);
  if (!file.isFile()) {
    throw new ToolError("UNSUPPORTED_FILE", "Report path must identify a regular file");
  }
  if (file.size > config.maxReportBytes) {
    throw new ToolError("INVALID_ARGUMENT", `Report exceeds the ${config.maxReportBytes} byte size limit`);
  }

  return canonicalPath;
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function mapToolError(error: unknown): ToolError | CrystalWorkerError {
  if (error instanceof ToolError || error instanceof CrystalWorkerError) return error;
  if (error instanceof z.ZodError) {
    return new ToolError("INVALID_ARGUMENT", "Tool arguments or worker response did not match the expected schema");
  }
  return new ToolError("INTERNAL_ERROR", "The report could not be read because of an internal error");
}

function toolFailure(code: WorkerErrorCode, message: string) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({ error: { code, message: redactErrorMessage(message) } }),
    }],
    isError: true,
  };
}

function redactErrorMessage(message: string): string {
  return message.replace(
    /\b(password|passwd|pwd|user\s*id|username|token|secret)\s*=\s*[^;\s]+/gi,
    "$1=[REDACTED]",
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received '${value}'`);
  }
  return parsed;
}

function parseWorkerArgs(value: string | undefined): string[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("CRYSTAL_WORKER_ARGS must be a JSON array of strings");
  }
  return parsed;
}

async function resolveAllowedRoots(value: string | undefined): Promise<string[]> {
  const configured = value?.split(path.delimiter).filter(Boolean) ?? [process.cwd()];
  if (configured.length === 0) throw new Error("At least one allowed report root is required");
  return Promise.all(configured.map((root) => realpath(path.resolve(root))));
}

async function main(): Promise<void> {
  const workerPath = process.env["CRYSTAL_WORKER_PATH"];
  if (!workerPath) {
    throw new Error("CRYSTAL_WORKER_PATH is required");
  }

  const worker = new CrystalWorkerClient({
    workerPath: path.resolve(workerPath),
    workerArgs: parseWorkerArgs(process.env["CRYSTAL_WORKER_ARGS"]),
    startupTimeoutMs: parsePositiveInteger(process.env["CRYSTAL_WORKER_STARTUP_TIMEOUT_MS"], 10_000),
    requestTimeoutMs: parsePositiveInteger(process.env["CRYSTAL_WORKER_TIMEOUT_MS"], 60_000),
    shutdownTimeoutMs: parsePositiveInteger(process.env["CRYSTAL_WORKER_SHUTDOWN_TIMEOUT_MS"], 3_000),
    logger,
  });

  const config: ServerConfig = {
    allowedReportRoots: await resolveAllowedRoots(process.env["RIP_ALLOWED_REPORT_ROOTS"]),
    maxReportBytes: parsePositiveInteger(process.env["RIP_MAX_REPORT_BYTES"], DEFAULT_MAX_REPORT_BYTES),
  };

  await worker.connect();
  const server = createServer(worker, config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP server started", { allowedReportRoots: config.allowedReportRoots });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("MCP server shutting down");
    await worker.disconnect();
    await server.close();
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
  process.stdin.once("end", () => void shutdown());
}

main().catch((error: unknown) => {
  logger.error("MCP server failed", {
    message: error instanceof Error ? redactErrorMessage(error.message) : "Unknown startup error",
  });
  process.exitCode = 1;
});
