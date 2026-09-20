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
  syntax: NullableString,
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
  qualifiedName: NullableString,
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
  procedureName: NullableString,
  parameters: z.array(CrystalParameterSchema),
}).passthrough();

export const CrystalSqlQuerySchema = z.object({
  dataSourceName: z.string(),
  dataSourceType: z.string(),
  commandText: z.string().min(1),
});

export const CrystalRunningTotalSchema = z.object({
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

export const CrystalReportMetadataSchema = z.object({
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
}).passthrough();

export const CrystalSubreportSchema = z.object({
  name: z.string(),
  reportName: z.string(),
  linkFields: z.array(z.object({
    mainReportField: z.string(),
    subreportField: z.string(),
    linkedParameterName: NullableString,
  }).passthrough()),
  isOnDemand: z.boolean(),
  metadata: CrystalReportMetadataSchema.optional(),
  dataSources: z.array(CrystalDataSourceSchema).optional(),
  formulas: z.array(CrystalFormulaSchema).optional(),
  parameters: z.array(CrystalParameterSchema).optional(),
  sections: z.array(CrystalSectionSchema).optional(),
  runningTotals: z.array(CrystalRunningTotalSchema).optional(),
  customFunctions: z.array(CrystalCustomFunctionSchema).optional(),
}).passthrough();

export const CrystalReportSchema = z.object({
  format: z.literal("crystal"),
  filePath: z.string(),
  fileName: z.string(),
  metadata: CrystalReportMetadataSchema,
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
export type CrystalReportMetadata = z.infer<typeof CrystalReportMetadataSchema>;
export type CrystalDataSource = z.infer<typeof CrystalDataSourceSchema>;
export type CrystalSqlQuery = z.infer<typeof CrystalSqlQuerySchema>;
export type CrystalParameter = z.infer<typeof CrystalParameterSchema>;
export type CrystalFormula = z.infer<typeof CrystalFormulaSchema>;
export type CrystalSection = z.infer<typeof CrystalSectionSchema>;
export type CrystalReportObject = z.infer<typeof CrystalReportObjectSchema>;
export type CrystalSubreport = z.infer<typeof CrystalSubreportSchema>;
export type CrystalRunningTotal = z.infer<typeof CrystalRunningTotalSchema>;
export type CrystalReadOptions = z.input<typeof CrystalReadOptionsSchema>;

const SENSITIVE_KEY = /(?:password|passwd|pwd|credential|secret|token|user(?:name|id)?|connectionString)/i;
const PARAMETER_VALUE_KEY = /^(?:defaultValue|currentValue|value|values|valueList)$/i;

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }

  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    const hasSensitiveParameterName = typeof source["name"] === "string"
      && SENSITIVE_KEY.test(source["name"]);
    for (const [key, child] of Object.entries(source)) {
      redacted[key] = child != null && (
        SENSITIVE_KEY.test(key)
        || (hasSensitiveParameterName && PARAMETER_VALUE_KEY.test(key))
      )
        ? "[REDACTED]"
        : redactSecrets(child);
    }
    return redacted as T;
  }

  return value;
}
