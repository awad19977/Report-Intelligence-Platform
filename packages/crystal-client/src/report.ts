import { z } from "zod";

const NullableString = z.string().nullable().optional();
const NullableNumber = z.number().nullable().optional();

export const CrystalReportObjectSchema = z.object({
  name: z.string(),
  type: z.string(),
  section: z.string(),
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
  suppress: z.boolean(),
  canGrow: z.boolean(),
  format: z.record(z.unknown()).nullable().optional(),
  text: NullableString,
  formulaName: NullableString,
  fieldName: NullableString,
  subreportName: NullableString,
}).passthrough();

export const CrystalSectionSchema = z.object({
  name: z.string(),
  type: z.string(),
  groupName: NullableString,
  groupField: NullableString,
  groupCondition: NullableString,
  height: z.number(),
  suppress: z.boolean(),
  newPageBefore: z.boolean(),
  newPageAfter: z.boolean(),
  resetPageNumber: z.boolean(),
  keepTogether: z.boolean(),
  printAtBottom: z.boolean(),
  objects: z.array(CrystalReportObjectSchema),
}).passthrough();

export const CrystalFormulaSchema = z.object({
  name: z.string(),
  syntax: z.string(),
  evaluationTime: z.string(),
  isGlobal: z.boolean(),
  isShared: z.boolean(),
  referencedFields: z.array(z.string()),
  referencedFormulas: z.array(z.string()),
  dependencies: z.array(z.string()),
}).passthrough();

export const CrystalParameterSchema = z.object({
  name: z.string(),
  prompt: NullableString,
  type: z.string(),
  defaultValue: z.unknown().optional(),
  allowNull: z.boolean(),
  allowMultiple: z.boolean(),
  valueList: z.array(z.unknown()).nullable().optional(),
  cascadingParent: NullableString,
  isOptional: z.boolean(),
  description: NullableString,
}).passthrough();

const CrystalFieldSchema = z.object({
  name: z.string(),
  table: z.string(),
  type: z.string(),
  length: NullableNumber,
  precision: NullableNumber,
  scale: NullableNumber,
  isNullable: z.boolean(),
}).passthrough();

const CrystalTableSchema = z.object({
  name: z.string(),
  alias: NullableString,
  fields: z.array(CrystalFieldSchema),
  location: NullableString,
}).passthrough();

const CrystalJoinSchema = z.object({
  fromTable: z.string(),
  fromField: z.string(),
  toTable: z.string(),
  toField: z.string(),
  type: z.string(),
  isEnforced: z.boolean(),
}).passthrough();

export const CrystalDataSourceSchema = z.object({
  name: z.string(),
  type: z.string(),
  connectionString: NullableString,
  tables: z.array(CrystalTableSchema),
  joins: z.array(CrystalJoinSchema),
  commandText: NullableString,
  parameters: z.array(CrystalParameterSchema),
}).passthrough();

const CrystalSubreportSchema = z.object({
  name: z.string(),
  reportName: z.string(),
  linkFields: z.array(z.object({
    mainReportField: z.string(),
    subreportField: z.string(),
  }).passthrough()),
  isOnDemand: z.boolean(),
}).passthrough();

const CrystalRunningTotalSchema = z.object({
  name: z.string(),
  field: z.string(),
  type: z.string(),
  evaluate: z.string(),
  evaluateFormula: NullableString,
  reset: z.string(),
  resetFormula: NullableString,
  groupName: NullableString,
  fieldName: NullableString,
}).passthrough();

const CrystalCustomFunctionSchema = z.object({
  name: z.string(),
  syntax: z.string(),
  language: z.string(),
}).passthrough();

export const CrystalReportSchema = z.object({
  format: z.literal("crystal"),
  filePath: z.string(),
  fileName: z.string(),
  metadata: z.object({
    title: NullableString,
    subject: NullableString,
    author: NullableString,
    keywords: NullableString,
    comments: NullableString,
    createdDate: NullableString,
    modifiedDate: NullableString,
    savedData: z.boolean(),
    pageSize: z.object({ width: z.number(), height: z.number() }).nullable().optional(),
    margins: z.object({
      left: z.number(),
      right: z.number(),
      top: z.number(),
      bottom: z.number(),
    }).nullable().optional(),
  }).passthrough(),
  dataSources: z.array(CrystalDataSourceSchema),
  formulas: z.array(CrystalFormulaSchema),
  parameters: z.array(CrystalParameterSchema),
  sections: z.array(CrystalSectionSchema),
  subreports: z.array(CrystalSubreportSchema),
  runningTotals: z.array(CrystalRunningTotalSchema),
  customFunctions: z.array(CrystalCustomFunctionSchema),
}).passthrough();

export const CrystalReadOptionsSchema = z.object({
  includeSavedData: z.boolean().default(false),
  includeFormatting: z.boolean().default(true),
  includeSubreports: z.boolean().default(true),
});

export type CrystalReport = z.infer<typeof CrystalReportSchema>;
export type CrystalReadOptions = z.input<typeof CrystalReadOptionsSchema>;

const SENSITIVE_KEY = /(?:password|passwd|pwd|credential|secret|token|user(?:name|id)?|connectionString)/i;

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      redacted[key] = SENSITIVE_KEY.test(key) && child != null
        ? "[REDACTED]"
        : redactSecrets(child);
    }
    return redacted as T;
  }

  return value;
}
