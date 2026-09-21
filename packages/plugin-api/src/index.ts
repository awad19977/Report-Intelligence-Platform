import { z } from "zod";
import {
  Report,
  ReportFormat,
  ReportFormatSchema,
  Parameter,
  Formula,
  Section,
  DataSource,
  SearchResult,
  DependencyGraph,
  Documentation,
  ValidationResult,
  ExportFormat,
  ReportObject,
  Subreport,
  RunningTotal,
  SearchQuery,
  SearchFilter,
  IndexStats,
  DocumentationOptions,
  ImpactAnalysis,
  ValidationContext,
  ReadOptions,
  Logger,
  Cache,
  Storage,
  WorkerClient,
  GenerationContext,
} from "@report-intelligence/core";

export const PluginCapabilitySchema = z.enum([
  "read",
  "write",
  "generate",
  "render",
  "validate",
  "export",
  "search",
  "document",
  "modify",
]);

export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

export const PluginInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string().optional(),
  supportedFormats: z.array(z.enum(ReportFormatSchema.options)),
  capabilities: z.array(PluginCapabilitySchema),
  minPlatformVersion: z.string(),
  maxPlatformVersion: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
});

export type PluginInfo = z.infer<typeof PluginInfoSchema>;

export const PluginConfigSchema = z.object({
  workerPath: z.string().optional(),
  runtimePath: z.string().optional(),
  licenseKey: z.string().optional(),
  customSettings: z.record(z.unknown()).default({}),
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;

export interface IReportReader {
  canRead(filePath: string): Promise<boolean>;
  readReport(filePath: string, options?: ReadOptions): Promise<Report>;
  readMetadata(filePath: string): Promise<Report["metadata"]>;
  readFormulas(filePath: string): Promise<Formula[]>;
  readParameters(filePath: string): Promise<Parameter[]>;
  readSections(filePath: string): Promise<Section[]>;
  readDataSources(filePath: string): Promise<DataSource[]>;
  readObjects(filePath: string, sectionName?: string): Promise<ReportObject[]>;
  readSubreports(filePath: string): Promise<Subreport[]>;
  readRunningTotals(filePath: string): Promise<RunningTotal[]>;
  readSQL(filePath: string): Promise<string[]>;
}

export interface IReportWriter {
  canWrite(filePath: string): Promise<boolean>;
  writeReport(report: Report, filePath: string): Promise<void>;
  updateFormula(filePath: string, formulaName: string, newSyntax: string): Promise<void>;
  updateParameter(filePath: string, parameterName: string, updates: Partial<Parameter>): Promise<void>;
  updateSection(filePath: string, sectionName: string, updates: Partial<Section>): Promise<void>;
  updateObject(filePath: string, objectName: string, updates: Partial<ReportObject>): Promise<void>;
  addFormula(filePath: string, formula: Formula): Promise<void>;
  addParameter(filePath: string, parameter: Parameter): Promise<void>;
  addSection(filePath: string, section: Section): Promise<void>;
  addObject(filePath: string, sectionName: string, object: ReportObject): Promise<void>;
  deleteFormula(filePath: string, formulaName: string): Promise<void>;
  deleteParameter(filePath: string, parameterName: string): Promise<void>;
  deleteSection(filePath: string, sectionName: string): Promise<void>;
  deleteObject(filePath: string, objectName: string): Promise<void>;
  saveAs(filePath: string, newPath: string, format?: ReportFormat): Promise<void>;
}

export interface GenerationSpec {
  format: ReportFormat;
  name: string;
  dataSources: DataSource[];
  layout: LayoutSpec;
  formulas?: Formula[];
  parameters?: Parameter[];
  sections?: Section[];
}

export interface LayoutSpec {
  pageSize: { width: number; height: number };
  margins: { left: number; right: number; top: number; bottom: number };
  orientation: "portrait" | "landscape";
  bands: BandSpec[];
}

export interface BandSpec {
  type: Section["type"];
  name: string;
  height: number;
  objects: ReportObject[];
}

export interface IReportGenerator {
  canGenerate(spec: GenerationSpec): Promise<boolean>;
  generateReport(spec: GenerationSpec): Promise<Report>;
  generateFromTemplate(templatePath: string, data: Record<string, unknown>): Promise<Report>;
  generateFromNaturalLanguage(prompt: string, context?: GenerationContext): Promise<Report>;
}

export interface IReportRenderer {
  canRender(format: ExportFormat): Promise<boolean>;
  renderToFile(report: Report, outputPath: string, format: ExportFormat, options?: RenderOptions): Promise<void>;
  renderToBuffer(report: Report, format: ExportFormat, options?: RenderOptions): Promise<Buffer>;
  renderToStream(report: Report, format: ExportFormat, options?: RenderOptions): Promise<NodeJS.ReadableStream>;
}

export interface RenderOptions {
  pageRange?: { from: number; to: number };
  quality?: "draft" | "normal" | "high";
  embedFonts?: boolean;
  compress?: boolean;
}

export interface IReportValidator {
  canValidate(filePath: string): Promise<boolean>;
  validateReport(filePath: string): Promise<ValidationResult>;
  validateFormula(syntax: string, context?: ValidationContext): Promise<ValidationResult>;
  validateParameter(parameter: Parameter, context?: ValidationContext): Promise<ValidationResult>;
  validateDataSource(dataSource: DataSource): Promise<ValidationResult>;
}

export interface IReportExporter {
  canExport(format: ExportFormat): Promise<boolean>;
  exportReport(filePath: string, outputPath: string, format: ExportFormat, options?: ExportOptions): Promise<void>;
  exportToBuffer(filePath: string, format: ExportFormat, options?: ExportOptions): Promise<Buffer>;
}

export interface ExportOptions {
  pageRange?: { from: number; to: number };
  includeParameters?: boolean;
  includeFormulas?: boolean;
}

export interface IReportSearcher {
  canSearch(): Promise<boolean>;
  searchReports(query: SearchQuery): Promise<SearchResult[]>;
  searchInReport(filePath: string, query: string): Promise<SearchResult>;
  indexReport(filePath: string): Promise<void>;
  removeFromIndex(filePath: string): Promise<void>;
  clearIndex(): Promise<void>;
}

export interface IDocumentGenerator {
  canDocument(): Promise<boolean>;
  generateDocumentation(report: Report, options?: DocumentationOptions): Promise<Documentation>;
  generateMarkdown(report: Report, options?: DocumentationOptions): Promise<string>;
  generateHTML(report: Report, options?: DocumentationOptions): Promise<string>;
  generatePDF(report: Report, options?: DocumentationOptions): Promise<Buffer>;
}

export interface IDependencyAnalyzer {
  canAnalyze(): Promise<boolean>;
  analyzeDependencies(filePath: string): Promise<DependencyGraph>;
  findDependents(filePath: string, dependencyType?: string): Promise<string[]>;
  findDependencies(filePath: string, dependencyType?: string): Promise<string[]>;
  checkCircularDependencies(filePath: string): Promise<string[]>;
  getImpactAnalysis(filePath: string, changeType: string, targetName: string): Promise<ImpactAnalysis>;
}

export interface IReportModifier {
  canModify(): Promise<boolean>;
  modifyFormula(filePath: string, formulaName: string, newSyntax: string): Promise<void>;
  modifyParameter(filePath: string, parameterName: string, updates: Partial<Parameter>): Promise<void>;
  modifySection(filePath: string, sectionName: string, updates: Partial<Section>): Promise<void>;
  modifyObject(filePath: string, objectName: string, updates: Partial<ReportObject>): Promise<void>;
  renameFormula(filePath: string, oldName: string, newName: string): Promise<void>;
  renameParameter(filePath: string, oldName: string, newName: string): Promise<void>;
  renameSection(filePath: string, oldName: string, newName: string): Promise<void>;
  renameObject(filePath: string, oldName: string, newName: string): Promise<void>;
}

export interface Plugin {
  info: PluginInfo;
  config: PluginConfig;
  initialize(config: PluginConfig): Promise<void>;
  shutdown(): Promise<void>;
  getCapabilities(): PluginCapability[];
  supportsFormat(format: ReportFormat): boolean;
  
  reader?: IReportReader;
  writer?: IReportWriter;
  generator?: IReportGenerator;
  renderer?: IReportRenderer;
  validator?: IReportValidator;
  exporter?: IReportExporter;
  searcher?: IReportSearcher;
  documenter?: IDocumentGenerator;
  analyzer?: IDependencyAnalyzer;
  modifier?: IReportModifier;
}

// Re-export core interfaces
export type { 
  Logger, 
  Cache, 
  Storage, 
  WorkerClient, 
  GenerationContext,
  DependencyGraph,
  ImpactAnalysis,
  ValidationContext,
  ReadOptions,
  ReportFormat,
  SearchQuery,
  SearchFilter,
  DocumentationOptions,
} from "@report-intelligence/core";

export type PluginConstructor = new (context: {
  logger: Logger;
  cache: Cache;
  storage: Storage;
  worker: WorkerClient;
}) => Plugin;
