import { z } from "zod";

export const ReportFormatSchema = z.enum([
  "crystal",
  "rpt",
  "rdl",
  "rdlc",
  "jrxml",
  "frx",
  "repx",
  "trdx",
  "mrt",
  "json",
]);

export const ExportFormatSchema = z.enum([
  "pdf",
  "excel",
  "word",
  "html",
  "csv",
  "xml",
  "json",
  "image",
  "rtf",
  "pptx",
]);

export const FormulaSyntaxSchema = z.enum(["crystal", "basic", "sql", "javascript", "csharp", "vbnet"]);

export const FormulaEvaluationTimeSchema = z.enum([
  "beforeReadingRecords",
  "whileReadingRecords",
  "whilePrintingRecords",
  "evaluateAfter",
]);

export const VariableScopeSchema = z.enum(["local", "global", "shared"]);

export const ParameterTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "datetime",
  "time",
  "currency",
  "list",
  "range",
]);

export const DataSourceTypeSchema = z.enum([
  "sql",
  "odbc",
  "oledb",
  "ado",
  "xml",
  "json",
  "csv",
  "object",
  "storedProcedure",
  "command",
]);

export const SectionTypeSchema = z.enum([
  "reportHeader",
  "reportFooter",
  "pageHeader",
  "pageFooter",
  "groupHeader",
  "groupFooter",
  "detail",
  "subreport",
]);

export const ObjectTypeSchema = z.enum([
  "text",
  "field",
  "formula",
  "parameter",
  "summary",
  "runningTotal",
  "specialField",
  "chart",
  "crossTab",
  "map",
  "subreport",
  "oleObject",
  "line",
  "box",
  "picture",
  "barcode",
]);

export const HorizontalAlignmentSchema = z.enum(["left", "center", "right", "justify"]);

export const VerticalAlignmentSchema = z.enum(["top", "center", "bottom"]);

export const FontStyleSchema = z.enum(["normal", "bold", "italic", "boldItalic"]);

export const LineStyleSchema = z.enum(["solid", "dashed", "dotted", "dashDot", "dashDotDot"]);

export const BorderSideSchema = z.enum(["top", "right", "bottom", "left", "all"]);

export const ParameterSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: ParameterTypeSchema,
  defaultValue: z.unknown().optional(),
  allowNull: z.boolean().default(false),
  allowMultiple: z.boolean().default(false),
  valueList: z.array(z.unknown()).optional(),
  cascadingParent: z.string().optional(),
  isOptional: z.boolean().default(false),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
});

export const VariableSchema = z.object({
  name: z.string(),
  type: z.string(),
  scope: VariableScopeSchema.default("global"),
  initialValue: z.unknown().optional(),
});

export const FormulaSchema = z.object({
  name: z.string(),
  syntax: z.string(),
  syntaxType: FormulaSyntaxSchema.default("crystal"),
  evaluationTime: FormulaEvaluationTimeSchema.default("whileReadingRecords"),
  evaluateAfter: z.string().optional(),
  description: z.string().optional(),
  returnType: z.string().optional(),
  variables: z.array(VariableSchema).optional(),
});

export const ColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean().default(true),
  precision: z.number().optional(),
  scale: z.number().optional(),
  defaultValue: z.unknown().optional(),
  isPrimaryKey: z.boolean().default(false),
  isForeignKey: z.boolean().default(false),
  foreignKeyTable: z.string().optional(),
  foreignKeyColumn: z.string().optional(),
});

export const IndexSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  isUnique: z.boolean().default(false),
  isClustered: z.boolean().default(false),
});

export const TableSchema = z.object({
  name: z.string(),
  alias: z.string().optional(),
  columns: z.array(ColumnSchema),
  primaryKey: z.array(z.string()).optional(),
  indexes: z.array(IndexSchema).optional(),
});

export const JoinSchema = z.object({
  leftTable: z.string(),
  leftColumn: z.string(),
  rightTable: z.string(),
  rightColumn: z.string(),
  type: z.enum(["inner", "left", "right", "full"]).default("inner"),
});

export const DataSourceSchema = z.object({
  name: z.string(),
  type: DataSourceTypeSchema,
  connectionString: z.string().optional(),
  server: z.string().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  commandText: z.string().optional(),
  tables: z.array(TableSchema).optional(),
  storedProcedure: z.string().optional(),
  parameters: z.array(ParameterSchema).optional(),
});

export const ReportObjectSchema = z.object({
  name: z.string(),
  type: ObjectTypeSchema,
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number().default(0),
  suppress: z.boolean().default(false),
  suppressFormula: z.string().optional(),
  canGrow: z.boolean().default(false),
  keepTogether: z.boolean().default(false),
  format: z.record(z.unknown()).optional(),
  hyperlink: z.string().optional(),
  tooltip: z.string().optional(),
  cssClass: z.string().optional(),
});

export const TextObjectSchema = ReportObjectSchema.extend({
  type: z.literal("text"),
  text: z.string(),
  fontName: z.string().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  fontStyle: FontStyleSchema.optional(),
  alignment: HorizontalAlignmentSchema.optional(),
  verticalAlignment: VerticalAlignmentSchema.optional(),
  interpretation: z.enum(["none", "rtf", "html"]).default("none"),
});

export const FieldObjectSchema = ReportObjectSchema.extend({
  type: z.literal("field"),
  fieldName: z.string(),
  fieldType: z.enum(["database", "formula", "parameter", "summary", "runningTotal", "special", "sqlExpression"]),
  formatString: z.string().optional(),
  suppressIfZero: z.boolean().default(false),
  suppressIfDuplicated: z.boolean().default(false),
});

export const ChartObjectSchema = ReportObjectSchema.extend({
  type: z.literal("chart"),
  chartType: z.string(),
  dataSource: z.string().optional(),
  series: z.array(z.record(z.unknown())).optional(),
  categories: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
});

export const CrossTabObjectSchema = ReportObjectSchema.extend({
  type: z.literal("crossTab"),
  rows: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
  summarizedFields: z.array(z.string()).optional(),
});

export const SubreportObjectSchema = ReportObjectSchema.extend({
  type: z.literal("subreport"),
  subreportPath: z.string(),
  isOnDemand: z.boolean().default(false),
  links: z.array(z.object({
    mainReportField: z.string(),
    subreportParameter: z.string(),
  })).optional(),
});

export const LineObjectSchema = ReportObjectSchema.extend({
  type: z.literal("line"),
  lineStyle: LineStyleSchema.default("solid"),
  lineWidth: z.number().default(1),
  lineColor: z.string().optional(),
});

export const BoxObjectSchema = ReportObjectSchema.extend({
  type: z.literal("box"),
  borderStyle: LineStyleSchema.default("solid"),
  borderWidth: z.number().default(1),
  borderColor: z.string().optional(),
  fillColor: z.string().optional(),
  rounding: z.number().default(0),
});

export const PictureObjectSchema = ReportObjectSchema.extend({
  type: z.literal("picture"),
  imagePath: z.string().optional(),
  imageData: z.string().optional(),
  isDynamic: z.boolean().default(false),
  dynamicImageFormula: z.string().optional(),
});

export const RunningTotalSchema = z.object({
  name: z.string(),
  fieldName: z.string(),
  summaryType: z.enum(["sum", "average", "count", "minimum", "maximum", "distinctCount"]),
  evaluateType: z.enum(["forEachRecord", "onChangeOfField", "onChangeOfGroup", "formula"]),
  evaluateField: z.string().optional(),
  evaluateFormula: z.string().optional(),
  resetType: z.enum(["never", "onChangeOfField", "onChangeOfGroup", "formula"]),
  resetField: z.string().optional(),
  resetFormula: z.string().optional(),
});

export const GroupSchema = z.object({
  name: z.string(),
  fieldName: z.string(),
  sortDirection: z.enum(["ascending", "descending"]).default("ascending"),
  keepTogether: z.boolean().default(false),
  repeatHeader: z.boolean().default(false),
  startNewPage: z.boolean().default(false),
  resetPageNumber: z.boolean().default(false),
  condition: z.string().optional(),
  isTopN: z.boolean().default(false),
  topNCount: z.number().optional(),
  topNField: z.string().optional(),
});

export const CustomFunctionSchema = z.object({
  name: z.string(),
  syntax: z.string(),
  syntaxType: FormulaSyntaxSchema.default("crystal"),
  description: z.string().optional(),
  arguments: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
  })).optional(),
  returnType: z.string().optional(),
});

export const DependencySchema = z.object({
  type: z.enum(["report", "database", "formula", "parameter", "subreport", "image", "font", "function"]),
  name: z.string(),
  path: z.string().optional(),
  description: z.string().optional(),
  isMissing: z.boolean().default(false),
});

export const SubreportSchema = z.object({
  name: z.string(),
  path: z.string(),
  isOnDemand: z.boolean().default(false),
  links: z.array(z.object({
    mainReportField: z.string(),
    subreportParameter: z.string(),
  })).optional(),
});

export const SectionSchema = z.object({
  name: z.string(),
  type: SectionTypeSchema,
  height: z.number().default(0),
  canGrow: z.boolean().default(false),
  keepTogether: z.boolean().default(false),
  suppress: z.boolean().default(false),
  suppressFormula: z.string().optional(),
  printAtBottom: z.boolean().default(false),
  resetPageNumber: z.boolean().default(false),
  newPageBefore: z.boolean().default(false),
  newPageAfter: z.boolean().default(false),
  objects: z.array(ReportObjectSchema).default([]),
});

export const ReportSchema = z.object({
  name: z.string(),
  format: ReportFormatSchema,
  filePath: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  title: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  comments: z.string().optional(),
  createdDate: z.date().optional(),
  modifiedDate: z.date().optional(),
  savedData: z.boolean().optional(),
  pageWidth: z.number().default(8.5),
  pageHeight: z.number().default(11),
  leftMargin: z.number().default(0.75),
  rightMargin: z.number().default(0.75),
  topMargin: z.number().default(0.75),
  bottomMargin: z.number().default(0.75),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  dataSources: z.array(DataSourceSchema).default([]),
  tables: z.array(TableSchema).default([]),
  joins: z.array(JoinSchema).default([]),
  formulas: z.array(FormulaSchema).default([]),
  parameters: z.array(ParameterSchema).default([]),
  runningTotals: z.array(RunningTotalSchema).default([]),
  sections: z.array(SectionSchema).default([]),
  groups: z.array(GroupSchema).default([]),
  customFunctions: z.array(CustomFunctionSchema).default([]),
  sqlQuery: z.string().optional(),
  recordSelectionFormula: z.string().optional(),
  groupSelectionFormula: z.string().optional(),
  dependencies: z.array(DependencySchema).default([]),
  subreports: z.array(SubreportSchema).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
    severity: z.enum(["error", "warning", "info"]).default("error"),
  })).default([]),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
  })).default([]),
  info: z.array(z.object({
    code: z.string(),
    message: z.string(),
    path: z.string().optional(),
  })).default([]),
});

export const SearchResultSchema = z.object({
  filePath: z.string(),
  reportName: z.string(),
  matches: z.array(z.object({
    type: z.string(),
    name: z.string(),
    context: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
  })).default([]),
  score: z.number().default(0),
});

export const DocumentationSchema = z.object({
  reportName: z.string(),
  generatedAt: z.date(),
  summary: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    items: z.array(z.record(z.unknown())).optional(),
  })).default([]),
  formulas: z.array(z.object({
    name: z.string(),
    syntax: z.string(),
    description: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
  })).default([]),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    defaultValue: z.unknown().optional(),
  })).default([]),
  dataSources: z.array(z.object({
    name: z.string(),
    type: z.string(),
    tables: z.array(z.string()).optional(),
    query: z.string().optional(),
  })).default([]),
  dependencies: z.array(z.object({
    type: z.string(),
    name: z.string(),
    description: z.string().optional(),
  })).default([]),
});

export const SearchQuerySchema = z.object({
  query: z.string(),
  type: z.enum(["formula", "field", "parameter", "sql", "text", "object", "all"]).optional(),
  formulaName: z.string().optional(),
  fieldName: z.string().optional(),
  parameterName: z.string().optional(),
  tableName: z.string().optional(),
  regex: z.boolean().default(false),
  caseSensitive: z.boolean().default(false),
});

export const SearchFilterSchema = z.object({
  field: z.string(),
  operator: z.enum(["equals", "contains", "startsWith", "endsWith", "regex"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const IndexStatsSchema = z.object({
  totalReports: z.number(),
  totalFormulas: z.number(),
  totalFields: z.number(),
  totalParameters: z.number(),
  lastIndexed: z.date(),
  indexSize: z.number(),
});

export const DocumentationOptionsSchema = z.object({
  includeFormulas: z.boolean().default(true),
  includeParameters: z.boolean().default(true),
  includeDataSources: z.boolean().default(true),
  includeSections: z.boolean().default(true),
  includeObjects: z.boolean().default(true),
  includeDependencies: z.boolean().default(true),
  includeSQL: z.boolean().default(true),
  detailLevel: z.enum(["summary", "standard", "detailed"]).default("standard"),
});

export const ReadOptionsSchema = z.object({
  includeSavedData: z.boolean().default(false),
  includeFormatting: z.boolean().default(true),
  includeSubreports: z.boolean().default(true),
  maxDepth: z.number().optional(),
});

export const DependencyGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.enum(["formula", "field", "parameter", "subreport", "table", "group"]),
    label: z.string(),
  })),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.enum(["references", "dependsOn", "contains", "linksTo"]),
  })),
});

export const ImpactAnalysisSchema = z.object({
  affectedFormulas: z.array(z.string()),
  affectedParameters: z.array(z.string()),
  affectedSections: z.array(z.string()),
  affectedObjects: z.array(z.string()),
  affectedSubreports: z.array(z.string()),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  recommendations: z.array(z.string()),
});

export const ValidationContextSchema = z.object({
  report: z.any().optional(),
  availableFields: z.array(z.string()).optional(),
  availableFormulas: z.array(z.string()).optional(),
  availableParameters: z.array(z.string()).optional(),
});

export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type FormulaSyntax = z.infer<typeof FormulaSyntaxSchema>;
export type FormulaEvaluationTime = z.infer<typeof FormulaEvaluationTimeSchema>;
export type VariableScope = z.infer<typeof VariableScopeSchema>;
export type ParameterType = z.infer<typeof ParameterTypeSchema>;
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>;
export type SectionType = z.infer<typeof SectionTypeSchema>;
export type ObjectType = z.infer<typeof ObjectTypeSchema>;
export type HorizontalAlignment = z.infer<typeof HorizontalAlignmentSchema>;
export type VerticalAlignment = z.infer<typeof VerticalAlignmentSchema>;
export type FontStyle = z.infer<typeof FontStyleSchema>;
export type LineStyle = z.infer<typeof LineStyleSchema>;
export type BorderSide = z.infer<typeof BorderSideSchema>;

export type Parameter = z.infer<typeof ParameterSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type Formula = z.infer<typeof FormulaSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type Index = z.infer<typeof IndexSchema>;
export type Join = z.infer<typeof JoinSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type ReportObject = z.infer<typeof ReportObjectSchema>;
export type TextObject = z.infer<typeof TextObjectSchema>;
export type FieldObject = z.infer<typeof FieldObjectSchema>;
export type ChartObject = z.infer<typeof ChartObjectSchema>;
export type CrossTabObject = z.infer<typeof CrossTabObjectSchema>;
export type SubreportObject = z.infer<typeof SubreportObjectSchema>;
export type LineObject = z.infer<typeof LineObjectSchema>;
export type BoxObject = z.infer<typeof BoxObjectSchema>;
export type PictureObject = z.infer<typeof PictureObjectSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type RunningTotal = z.infer<typeof RunningTotalSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type CustomFunction = z.infer<typeof CustomFunctionSchema>;
export type Dependency = z.infer<typeof DependencySchema>;
export type Subreport = z.infer<typeof SubreportSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type Documentation = z.infer<typeof DocumentationSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchFilter = z.infer<typeof SearchFilterSchema>;
export type IndexStats = z.infer<typeof IndexStatsSchema>;
export type DocumentationOptions = z.infer<typeof DocumentationOptionsSchema>;
export type ReadOptions = z.infer<typeof ReadOptionsSchema>;
export type DependencyGraph = z.infer<typeof DependencyGraphSchema>;
export type ImpactAnalysis = z.infer<typeof ImpactAnalysisSchema>;
export type ValidationContext = z.infer<typeof ValidationContextSchema>;

export type GenerationContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Storage {
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(path: string, pattern?: string): Promise<string[]>;
  deleteFile(path: string): Promise<void>;
}

export interface WorkerClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute<T>(command: string, args: unknown[]): Promise<T>;
  executeStream<T>(command: string, args: unknown[]): AsyncIterable<T>;
  healthCheck(): Promise<WorkerHealth>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
}

export interface WorkerHealth {
  healthy: boolean;
  version: string;
  uptimeMs: number;
  activeReports: number;
  memoryBytes: number;
}

export interface WorkerClientConfig {
  host: string;
  port: number;
  tls?: {
    caPath: string;
    certPath: string;
    keyPath: string;
  };
  timeout?: number;
}

// Cross-platform types
export type Platform = "win32" | "linux" | "darwin";
export type WorkerTransport = "stdio" | "grpc-local" | "grpc-remote";

export interface WorkerConfig {
  transport: WorkerTransport;
  stdio?: {
    workerPath: string;
  };
  grpcLocal?: {
    host: string;
    port: number;
  };
  grpcRemote?: {
    endpoints: string[];
    tls: TlsConfig;
    loadBalancer: "round-robin" | "least-loaded";
  };
}

export interface TlsConfig {
  caPath: string;
  certPath: string;
  keyPath: string;
}

export interface PluginConfig {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
  worker?: WorkerConfig;
}

export interface AppConfig {
  pluginDirectories: string[];
  coreServices: string[];
  plugins: Record<string, PluginConfig>;
  worker: {
    transport: WorkerTransport;
    grpc: {
      host: string;
      port: number;
      tls: boolean;
    };
    stdio: {
      workerPath: string;
    };
    poolSize: number;
    loadBalancer: "round-robin" | "least-loaded";
  };
  tls: {
    certDir: string;
    autoGenerate: boolean;
  };
  mcp: {
    transport: "stdio" | "http";
    httpPort?: number;
  };
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  main: string;
  ripPlugin: true;
  ripPluginApi: string;
  supportedFormats: string[];
  capabilities: string[];
  minPlatformVersion: string;
  maxPlatformVersion?: string;
  dependencies?: string[];
  platform?: "win32" | "linux" | "darwin" | "any";
  worker?: {
    required: boolean;
    transport: WorkerTransport[];
    platform: "win32" | "linux" | "darwin";
  };
}