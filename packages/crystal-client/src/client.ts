import { EventEmitter } from "node:events";
import { access } from "node:fs/promises";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { z, type ZodType } from "zod";
import {
  WORKER_PROTOCOL_VERSION,
  WorkerErrorEnvelopeSchema,
  WorkerReadyEnvelopeSchema,
  WorkerSuccessEnvelopeSchema,
  WorkerWarningEnvelopeSchema,
  type WorkerErrorCode,
  type WorkerRequestEnvelope,
  type WorkerWarning,
} from "./protocol.js";
import {
  CrystalReadOptionsSchema,
  CrystalReportSchema,
  CrystalSqlQuerySchema,
  type CrystalDataSource,
  type CrystalFormula,
  type CrystalParameter,
  type CrystalReadOptions,
  type CrystalReport,
  type CrystalReportMetadata,
  type CrystalReportObject,
  type CrystalRunningTotal,
  type CrystalSection,
  type CrystalSqlQuery,
  type CrystalSubreport,
} from "./report.js";

export interface CrystalWorkerClientLogger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export interface CrystalWorkerClientConfig {
  workerPath: string;
  workerArgs?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  startupTimeoutMs?: number;
  requestTimeoutMs?: number;
  shutdownTimeoutMs?: number;
  maxMessageBytes?: number;
  logger?: CrystalWorkerClientLogger;
}

export class CrystalWorkerError extends Error {
  constructor(
    public readonly code: WorkerErrorCode,
    message: string,
    public readonly retryable = false,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CrystalWorkerError";
  }
}

interface PendingRequest {
  resolve: (value: unknown, warnings: WorkerWarning[]) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  warnings: WorkerWarning[];
}

interface StartupWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

const DEFAULT_STARTUP_TIMEOUT_MS = 10_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_MESSAGE_BYTES = 16 * 1024 * 1024;

export interface CrystalWorkerResult<T> {
  data: T;
  warnings: WorkerWarning[];
}

export class CrystalWorkerClient extends EventEmitter {
  private process?: ChildProcessWithoutNullStreams;
  private buffer = "";
  private pending = new Map<string, PendingRequest>();
  private startup?: StartupWaiter;
  private sequence = 0;
  private connected = false;
  private stopping = false;

  constructor(private readonly config: CrystalWorkerClientConfig) {
    super();
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    if (this.startup) {
      throw new CrystalWorkerError("WORKER_START_FAILED", "Worker startup is already in progress");
    }

    try {
      await access(this.config.workerPath);
    } catch (cause) {
      throw new CrystalWorkerError(
        "RUNTIME_NOT_FOUND",
        `Crystal worker executable was not found: ${this.config.workerPath}`,
        false,
        { cause },
      );
    }

    this.stopping = false;
    this.buffer = "";

    return new Promise<void>((resolve, reject) => {
      const startupTimeoutMs = this.config.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
      const timer = setTimeout(() => {
        this.failProtocol(new CrystalWorkerError(
          "WORKER_START_FAILED",
          `Crystal worker did not become ready within ${startupTimeoutMs} ms`,
          true,
        ));
      }, startupTimeoutMs);

      this.startup = { resolve, reject, timer };

      try {
        this.process = spawn(this.config.workerPath, this.config.workerArgs ?? [], {
          cwd: this.config.cwd,
          env: { ...process.env, ...this.config.env },
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (cause) {
        this.failProtocol(new CrystalWorkerError(
          "WORKER_START_FAILED",
          "Failed to start the Crystal worker",
          true,
          { cause },
        ));
        return;
      }

      this.process.stdout.setEncoding("utf8");
      this.process.stdout.on("data", (chunk: string) => this.handleData(chunk));
      this.process.stderr.setEncoding("utf8");
      this.process.stderr.on("data", (chunk: string) => {
        const message = chunk.trim();
        if (message) this.config.logger?.debug?.("Crystal worker stderr", { message });
      });
      this.process.once("error", (cause) => {
        this.failProtocol(new CrystalWorkerError(
          "WORKER_START_FAILED",
          "Crystal worker process failed",
          true,
          { cause },
        ));
      });
      this.process.once("close", (code, signal) => this.handleClose(code, signal));
    });
  }

  async readReport(filePath: string, options: CrystalReadOptions = {}): Promise<CrystalReport> {
    return (await this.readReportResult(filePath, options)).data;
  }

  async readReportResult(
    filePath: string,
    options: CrystalReadOptions = {},
  ): Promise<CrystalWorkerResult<CrystalReport>> {
    const parsedOptions = CrystalReadOptionsSchema.parse(options);
    const result = await this.requestWithWarnings("read_report", [filePath, parsedOptions], CrystalReportSchema);
    const warnings = [...result.warnings];
    const addFormulaWarnings = (
      formulas: CrystalReport["formulas"],
      pathPrefix: string,
    ) => formulas.forEach((formula, index) => {
      if (formula.syntax != null) return;
      const path = `${pathPrefix}[${index}].syntax`;
      if (warnings.some((warning) => warning.code === "INCOMPLETE_FORMULA_SYNTAX" && warning.path === path)) return;
      warnings.push({
        code: "INCOMPLETE_FORMULA_SYNTAX",
        message: `Formula '${formula.name}' did not include readable syntax.`,
        path,
      });
    });

    addFormulaWarnings(result.data.formulas, "formulas");
    result.data.subreports.forEach((subreport, index) => {
      if (subreport.formulas) addFormulaWarnings(subreport.formulas, `subreports[${index}].formulas`);
    });
    return { data: result.data, warnings };
  }

  async readMetadata(filePath: string): Promise<CrystalReportMetadata> {
    return (await this.readMetadataResult(filePath)).data;
  }

  async readMetadataResult(filePath: string): Promise<CrystalWorkerResult<CrystalReportMetadata>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: false,
      includeSubreports: false,
    });
    return { data: result.data.metadata, warnings: result.warnings };
  }

  async readDataSources(filePath: string): Promise<CrystalDataSource[]> {
    return (await this.readDataSourcesResult(filePath)).data;
  }

  async readDataSourcesResult(filePath: string): Promise<CrystalWorkerResult<CrystalDataSource[]>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: false,
      includeSubreports: false,
    });
    return { data: result.data.dataSources, warnings: result.warnings };
  }

  async extractSql(filePath: string): Promise<CrystalSqlQuery[]> {
    return (await this.extractSqlResult(filePath)).data;
  }

  async extractSqlResult(filePath: string): Promise<CrystalWorkerResult<CrystalSqlQuery[]>> {
    const result = await this.readDataSourcesResult(filePath);
    const data = result.data.flatMap((dataSource) => {
      const commandText = dataSource.commandText?.trim();
      if (!commandText) return [];
      return [CrystalSqlQuerySchema.parse({
        dataSourceName: dataSource.name,
        dataSourceType: dataSource.type,
        commandText,
      })];
    });
    return { data, warnings: result.warnings };
  }

  async readParameters(filePath: string): Promise<CrystalParameter[]> {
    return (await this.readParametersResult(filePath)).data;
  }

  async readParametersResult(filePath: string): Promise<CrystalWorkerResult<CrystalParameter[]>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: false,
      includeSubreports: true,
    });
    return { data: result.data.parameters, warnings: result.warnings };
  }

  async readFormulas(filePath: string): Promise<CrystalFormula[]> {
    return (await this.readFormulasResult(filePath)).data;
  }

  async readFormulasResult(filePath: string): Promise<CrystalWorkerResult<CrystalFormula[]>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: false,
      includeSubreports: true,
    });
    return { data: result.data.formulas, warnings: result.warnings };
  }

  async readSections(filePath: string): Promise<CrystalSection[]> {
    return (await this.readSectionsResult(filePath)).data;
  }

  async readSectionsResult(filePath: string): Promise<CrystalWorkerResult<CrystalSection[]>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: true,
      includeSubreports: true,
    });
    return { data: result.data.sections, warnings: result.warnings };
  }

  async readObjects(filePath: string, sectionName?: string): Promise<CrystalReportObject[]> {
    return (await this.readObjectsResult(filePath, sectionName)).data;
  }

  async readObjectsResult(
    filePath: string,
    sectionName?: string,
  ): Promise<CrystalWorkerResult<CrystalReportObject[]>> {
    const result = await this.readSectionsResult(filePath);
    const data = result.data
      .filter((section) => sectionName === undefined || section.name === sectionName)
      .flatMap((section) => section.objects);
    return { data, warnings: result.warnings };
  }

  async readSubreports(filePath: string): Promise<CrystalSubreport[]> {
    return (await this.readSubreportsResult(filePath)).data;
  }

  async readSubreportsResult(filePath: string): Promise<CrystalWorkerResult<CrystalSubreport[]>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: true,
      includeSubreports: true,
    });
    return { data: result.data.subreports, warnings: result.warnings };
  }

  async readRunningTotals(filePath: string): Promise<CrystalRunningTotal[]> {
    return (await this.readRunningTotalsResult(filePath)).data;
  }

  async readRunningTotalsResult(filePath: string): Promise<CrystalWorkerResult<CrystalRunningTotal[]>> {
    const result = await this.readReportResult(filePath, {
      includeSavedData: false,
      includeFormatting: false,
      includeSubreports: true,
    });
    return { data: result.data.runningTotals, warnings: result.warnings };
  }

  async request<T>(
    command: string,
    args: unknown[] = [],
    responseSchema?: ZodType<T>,
    timeoutMs = this.config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    return (await this.requestWithWarnings(command, args, responseSchema, timeoutMs)).data;
  }

  async requestWithWarnings<T>(
    command: string,
    args: unknown[] = [],
    responseSchema?: ZodType<T>,
    timeoutMs = this.config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<CrystalWorkerResult<T>> {
    if (!this.connected || !this.process) {
      throw new CrystalWorkerError("WORKER_DISCONNECTED", "Crystal worker is not connected", true);
    }

    const id = `${process.pid}-${Date.now()}-${++this.sequence}`;
    const envelope: WorkerRequestEnvelope = {
      type: "request",
      protocolVersion: WORKER_PROTOCOL_VERSION,
      id,
      command,
      args,
      timeoutMs,
    };

    return new Promise<CrystalWorkerResult<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CrystalWorkerError(
          "WORKER_TIMEOUT",
          `Crystal worker command '${command}' timed out after ${timeoutMs} ms`,
          true,
        ));
      }, timeoutMs);

      this.pending.set(id, {
        timer,
        warnings: [],
        resolve: (result, warnings) => {
          try {
            resolve({
              data: responseSchema ? responseSchema.parse(result) : result as T,
              warnings,
            });
          } catch (cause) {
            reject(new CrystalWorkerError(
              "INTERNAL_ERROR",
              `Crystal worker returned an invalid '${command}' response`,
              false,
              { cause },
            ));
          }
        },
        reject,
      });

      this.process?.stdin.write(`${JSON.stringify(envelope)}\n`, (error) => {
        if (!error) return;
        const pending = this.pending.get(id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(id);
        pending.reject(new CrystalWorkerError(
          "WORKER_DISCONNECTED",
          "Failed to write to the Crystal worker",
          true,
          { cause: error },
        ));
      });
    });
  }

  async disconnect(): Promise<void> {
    const child = this.process;
    if (!child) return;

    this.stopping = true;
    if (this.connected) {
      try {
        await this.request("shutdown", [], z.object({ shuttingDown: z.literal(true) }), this.config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS);
      } catch (error) {
        this.config.logger?.warn?.("Crystal worker did not shut down gracefully", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
    this.connected = false;
    this.process = undefined;
  }

  private handleData(chunk: string): void {
    this.buffer += chunk;
    const maxMessageBytes = this.config.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES;
    if (Buffer.byteLength(this.buffer, "utf8") > maxMessageBytes) {
      this.failProtocol(new CrystalWorkerError(
        "INTERNAL_ERROR",
        `Crystal worker protocol frame exceeded ${maxMessageBytes} bytes`,
      ));
      return;
    }

    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this.handleLine(trimmed);
    }
  }

  private handleLine(line: string): void {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (cause) {
      this.failProtocol(new CrystalWorkerError(
        "INTERNAL_ERROR",
        "Crystal worker wrote malformed JSON to stdout",
        false,
        { cause },
      ));
      return;
    }

    const ready = WorkerReadyEnvelopeSchema.safeParse(value);
    if (ready.success) {
      if (ready.data.protocolVersion !== WORKER_PROTOCOL_VERSION) {
        this.failProtocol(new CrystalWorkerError(
          "WORKER_START_FAILED",
          `Unsupported Crystal worker protocol version '${ready.data.protocolVersion}' (expected '${WORKER_PROTOCOL_VERSION}')`,
        ));
        return;
      }
      this.connected = true;
      this.finishStartup();
      this.emit("ready", ready.data);
      return;
    }

    const warning = WorkerWarningEnvelopeSchema.safeParse(value);
    if (warning.success) {
      if (warning.data.id) {
        this.pending.get(warning.data.id)?.warnings.push(warning.data.warning);
      }
      this.emit("warning", warning.data.warning satisfies WorkerWarning);
      return;
    }

    const success = WorkerSuccessEnvelopeSchema.safeParse(value);
    if (success.success) {
      if (!this.ensureResponseVersion(success.data.protocolVersion)) return;
      const pending = this.takePending(success.data.id);
      pending?.resolve(success.data.result, [
        ...(pending?.warnings ?? []),
        ...success.data.warnings,
      ]);
      for (const item of success.data.warnings) this.emit("warning", item);
      return;
    }

    const failure = WorkerErrorEnvelopeSchema.safeParse(value);
    if (failure.success) {
      if (!this.ensureResponseVersion(failure.data.protocolVersion)) return;
      const pending = this.takePending(failure.data.id);
      pending?.reject(new CrystalWorkerError(
        failure.data.error.code,
        failure.data.error.message,
        failure.data.error.retryable,
      ));
      return;
    }

    this.failProtocol(new CrystalWorkerError(
      "INTERNAL_ERROR",
      "Crystal worker wrote an invalid protocol envelope to stdout",
    ));
  }

  private ensureResponseVersion(version: string): boolean {
    if (version === WORKER_PROTOCOL_VERSION) return true;
    this.failProtocol(new CrystalWorkerError(
      "WORKER_DISCONNECTED",
      `Crystal worker response used protocol version '${version}'`,
    ));
    return false;
  }

  private takePending(id: string): PendingRequest | undefined {
    const pending = this.pending.get(id);
    if (!pending) return undefined;
    clearTimeout(pending.timer);
    this.pending.delete(id);
    return pending;
  }

  private finishStartup(): void {
    if (!this.startup) return;
    clearTimeout(this.startup.timer);
    const { resolve } = this.startup;
    this.startup = undefined;
    resolve();
  }

  private failProtocol(error: CrystalWorkerError): void {
    if (this.startup) {
      clearTimeout(this.startup.timer);
      const { reject } = this.startup;
      this.startup = undefined;
      reject(error);
    }

    this.connected = false;
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }

    if (this.process && this.process.exitCode === null && this.process.signalCode === null) {
      this.process.kill();
    }
    this.emit("protocolError", error);
  }

  private handleClose(code: number | null, signal: NodeJS.Signals | null): void {
    const wasStopping = this.stopping;
    this.connected = false;
    this.process = undefined;

    if (this.startup || this.pending.size > 0) {
      this.failProtocol(new CrystalWorkerError(
        "WORKER_DISCONNECTED",
        `Crystal worker exited${code === null ? "" : ` with code ${code}`}${signal ? ` (${signal})` : ""}`,
        !wasStopping,
      ));
    }
    this.emit("close", code, signal);
  }
}
