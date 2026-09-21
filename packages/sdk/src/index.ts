import type { Logger, Cache, Storage } from "@report-intelligence/plugin-api";

export function createLogger(): Logger {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => console.debug(`[DEBUG] ${message}`, meta),
    info: (message: string, meta?: Record<string, unknown>) => console.info(`[INFO] ${message}`, meta),
    warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[WARN] ${message}`, meta),
    error: (message: string, meta?: Record<string, unknown>) => console.error(`[ERROR] ${message}`, meta),
  };
}

export function createCache(): Cache {
  const store = new Map<string, { value: unknown; expires: number }>();
  
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const entry = store.get(key);
      if (!entry) return undefined;
      
      if (Date.now() > entry.expires) {
        store.delete(key);
        return undefined;
      }
      
      return entry.value as T;
    },
    
    async set<T>(key: string, value: T, ttl = 300000): Promise<void> {
      store.set(key, { value, expires: Date.now() + ttl });
    },
    
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    
    async clear(): Promise<void> {
      store.clear();
    },
  };
}

export function createStorage(): Storage {
  return {
    async readFile(filePath: string): Promise<Uint8Array> {
      const fs = await import("fs/promises");
      const buffer = await fs.readFile(filePath);
      return new Uint8Array(buffer);
    },
    
    async writeFile(filePath: string, data: Uint8Array): Promise<void> {
      const fs = await import("fs/promises");
      const path = await import("path");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, Buffer.from(data));
    },
    
    async exists(filePath: string): Promise<boolean> {
      const fs = await import("fs/promises");
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    
    async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
      const fs = await import("fs/promises");
      const files = await fs.readdir(dirPath, { recursive: true });
      if (pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        return files.filter(f => regex.test(f));
      }
      return files;
    },
    
    async deleteFile(filePath: string): Promise<void> {
      const fs = await import("fs/promises");
      await fs.unlink(filePath);
    },
  };
}

// Re-export core types
export * from "@report-intelligence/core";
// Re-export plugin-api types but avoid duplicate PluginConfig
export type {
  PluginInfo, 
  PluginCapability, 
  PluginConstructor,
  IReportReader,
  IReportWriter,
  IReportGenerator,
  IReportRenderer,
  IReportValidator,
  IReportExporter,
  IReportSearcher,
  IDocumentGenerator,
  IDependencyAnalyzer,
  IReportModifier,
  GenerationSpec,
  LayoutSpec,
  BandSpec,
  ReadOptions,
  RenderOptions,
  ExportOptions,
  SearchQuery,
  SearchFilter,
  DocumentationOptions,
  DependencyGraph,
  ImpactAnalysis,
  ValidationContext,
  GenerationContext
} from "@report-intelligence/plugin-api";
