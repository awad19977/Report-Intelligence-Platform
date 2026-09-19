import { z } from "zod";

export const WORKER_PROTOCOL_VERSION = "1.0" as const;

export const WorkerErrorCodeSchema = z.enum([
  "RUNTIME_NOT_FOUND",
  "WORKER_START_FAILED",
  "WORKER_DISCONNECTED",
  "WORKER_TIMEOUT",
  "FILE_NOT_FOUND",
  "FILE_OUTSIDE_ALLOWED_ROOTS",
  "UNSUPPORTED_FILE",
  "REPORT_OPEN_FAILED",
  "REPORT_PASSWORD_REQUIRED",
  "REPORT_CORRUPT",
  "UNSUPPORTED_FEATURE",
  "INVALID_ARGUMENT",
  "INTERNAL_ERROR",
]);

export type WorkerErrorCode = z.infer<typeof WorkerErrorCodeSchema>;

export const WorkerWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
});

export type WorkerWarning = z.infer<typeof WorkerWarningSchema>;

export const WorkerReadyEnvelopeSchema = z.object({
  type: z.literal("ready"),
  protocolVersion: z.string(),
  worker: z.object({
    name: z.string(),
    version: z.string(),
  }),
  capabilities: z.array(z.string()).default([]),
});

export const WorkerRequestEnvelopeSchema = z.object({
  type: z.literal("request"),
  protocolVersion: z.literal(WORKER_PROTOCOL_VERSION),
  id: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.unknown()).default([]),
  timeoutMs: z.number().int().positive().optional(),
});

export const WorkerShutdownEnvelopeSchema = WorkerRequestEnvelopeSchema.extend({
  command: z.literal("shutdown"),
});

export const WorkerSuccessEnvelopeSchema = z.object({
  type: z.literal("response"),
  protocolVersion: z.string(),
  id: z.string(),
  ok: z.literal(true),
  result: z.unknown(),
  warnings: z.array(WorkerWarningSchema).default([]),
});

export const WorkerErrorEnvelopeSchema = z.object({
  type: z.literal("response"),
  protocolVersion: z.string(),
  id: z.string(),
  ok: z.literal(false),
  error: z.object({
    code: WorkerErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean().default(false),
  }),
});

export const WorkerWarningEnvelopeSchema = z.object({
  type: z.literal("warning"),
  protocolVersion: z.string(),
  id: z.string().optional(),
  warning: WorkerWarningSchema,
});

export const WorkerResponseEnvelopeSchema = z.union([
  WorkerSuccessEnvelopeSchema,
  WorkerErrorEnvelopeSchema,
]);

export type WorkerReadyEnvelope = z.infer<typeof WorkerReadyEnvelopeSchema>;
export type WorkerRequestEnvelope = z.infer<typeof WorkerRequestEnvelopeSchema>;
export type WorkerSuccessEnvelope = z.infer<typeof WorkerSuccessEnvelopeSchema>;
export type WorkerErrorEnvelope = z.infer<typeof WorkerErrorEnvelopeSchema>;
export type WorkerResponseEnvelope = z.infer<typeof WorkerResponseEnvelopeSchema>;
