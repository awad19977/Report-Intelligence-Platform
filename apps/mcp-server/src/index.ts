#!/usr/bin/env node
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
  type WorkerWarning,
} from "@report-intelligence/crystal-client";
import winston from "winston";
import { z } from "zod";
import { resolveCrystalWorker } from "./worker-resolution.js";
import { doctorCommand } from "./doctor.js";

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

const ReadMetadataInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ReadDataSourcesInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ExtractSqlInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ReadParametersInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ReadFormulasInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ReadSectionsInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ReadObjectsInputSchema = z.object({
  filePath: z.string().trim().min(1),
  sectionName: z.string().trim().min(1).optional(),
});

const ReadSubreportsInputSchema = z.object({
  filePath: z.string().trim().min(1),
});

const ReadRunningTotalsInputSchema = z.object({
  filePath: z.string().trim().min(1),
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
    { name: "report-intelligence-platform", version: "0.1.2" },
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
      {
        name: "read_metadata",
        description: "Read validated metadata and page settings from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_data_sources",
        description: "Read validated data sources, tables, fields, joins, and commands from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "extract_sql",
        description: "Extract validated SQL command text with its data source identity from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_parameters",
        description: "Read validated parameter definitions from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_formulas",
        description: "Read validated formulas and dependency references from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_sections",
        description: "Read validated sections, layout settings, and contained objects from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_objects",
        description: "Read a flattened list of validated report objects, optionally filtered by exact section name",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
            sectionName: { type: "string", description: "Optional exact section name" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_subreports",
        description: "Read validated subreports and their main-to-subreport link fields from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
      {
        name: "read_running_totals",
        description: "Read validated running-total evaluation and reset definitions from a Crystal Report file",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            filePath: { type: "string", description: "Path to the .rpt file" },
          },
          required: ["filePath"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (
      request.params.name !== "read_report"
      && request.params.name !== "read_metadata"
      && request.params.name !== "read_data_sources"
      && request.params.name !== "extract_sql"
      && request.params.name !== "read_parameters"
      && request.params.name !== "read_formulas"
      && request.params.name !== "read_sections"
      && request.params.name !== "read_objects"
      && request.params.name !== "read_subreports"
      && request.params.name !== "read_running_totals"
    ) {
      return toolFailure("UNSUPPORTED_FEATURE", `Tool '${request.params.name}' is not available in this milestone`);
    }

    try {
      if (request.params.name === "read_running_totals") {
        const input = ReadRunningTotalsInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal running totals", { filePath });
        const result = await worker.readRunningTotalsResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_subreports") {
        const input = ReadSubreportsInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal subreports", { filePath });
        const result = await worker.readSubreportsResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_objects") {
        const input = ReadObjectsInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal report objects", { filePath, sectionName: input.sectionName });
        const result = await worker.readObjectsResult(filePath, input.sectionName);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_sections") {
        const input = ReadSectionsInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal report sections", { filePath });
        const result = await worker.readSectionsResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_formulas") {
        const input = ReadFormulasInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal report formulas", { filePath });
        const result = await worker.readFormulasResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_parameters") {
        const input = ReadParametersInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal report parameters", { filePath });
        const result = await worker.readParametersResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "extract_sql") {
        const input = ExtractSqlInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Extracting Crystal report SQL", { filePath });
        const result = await worker.extractSqlResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_data_sources") {
        const input = ReadDataSourcesInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal report data sources", { filePath });
        const result = await worker.readDataSourcesResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      if (request.params.name === "read_metadata") {
        const input = ReadMetadataInputSchema.parse(request.params.arguments ?? {});
        const filePath = await authorizeReportPath(input.filePath, config);

        logger.info("Reading Crystal report metadata", { filePath });
        const result = await worker.readMetadataResult(filePath);
        return toolSuccess(redactSecrets(result.data), result.warnings);
      }

      const input = ReadReportInputSchema.parse(request.params.arguments ?? {});
      const filePath = await authorizeReportPath(input.filePath, config);
      const options = CrystalReadOptionsSchema.parse({
        includeSavedData: input.includeSavedData,
        includeFormatting: input.includeFormatting,
        includeSubreports: input.includeSubreports,
      });

      logger.info("Reading Crystal report", { filePath });
      const result = await worker.readReportResult(filePath, options);
      return toolSuccess(redactSecrets(result.data), result.warnings);
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

function toolSuccess<T>(data: T, warnings: WorkerWarning[]) {
  const content = [{
    type: "text" as const,
    text: JSON.stringify(data, null, 2),
  }];

  if (warnings.length > 0) {
    content.push({
      type: "text" as const,
      text: JSON.stringify({
        warnings: warnings.map((warning) => ({
          ...warning,
          message: redactErrorMessage(warning.message),
        })),
      }, null, 2),
    });
  }

  return { content };
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
  const resolution = await resolveCrystalWorker({
    explicitPath: process.env["CRYSTAL_WORKER_PATH"],
  });

  const worker = new CrystalWorkerClient({
    workerPath: resolution.workerPath,
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
  logger.info("MCP server started", {
    allowedReportRoots: config.allowedReportRoots,
    workerEdition: resolution.edition,
    workerSource: resolution.source,
  });

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

const command = process.argv[2] === "doctor"
  ? doctorCommand(process.argv.slice(3))
  : main();

command.catch((error: unknown) => {
  logger.error("MCP server failed", {
    message: error instanceof Error ? redactErrorMessage(error.message) : "Unknown startup error",
  });
  process.exitCode = 1;
}).then((exitCode) => {
  if (typeof exitCode === "number") process.exitCode = exitCode;
});
