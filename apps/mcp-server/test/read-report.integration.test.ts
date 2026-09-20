import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterEach, describe, expect, it } from "vitest";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const serverEntry = path.join(appRoot, "dist", "index.js");
const mockWorker = fileURLToPath(new URL("../../../packages/crystal-client/test/fixtures/mock-worker.mjs", import.meta.url));
const mockGoldenFixture = path.resolve(appRoot, "../../tests/fixtures/crystal/mock-report.golden.json");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("read_report MCP vertical slice", () => {
  it("calls the stdio worker, validates the report, and redacts connection secrets", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-mcp-test-"));
    temporaryDirectories.push(reportRoot);
    await mkdir(reportRoot, { recursive: true });
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");
    const beforeHash = createHash("sha256").update(await readFile(reportPath)).digest("hex");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: "read_report",
        arguments: { filePath: reportPath },
      });

      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      expect(content?.type).toBe("text");
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      const report = JSON.parse(content.text) as Record<string, unknown> & {
        dataSources: Array<{ connectionString: string }>;
      };
      expect(report.dataSources[0]?.connectionString).toBe("[REDACTED]");

      const warningContent = result.content[1];
      if (warningContent?.type !== "text") throw new Error("Expected a structured warning MCP result");
      const warningResult = JSON.parse(warningContent.text) as { warnings: unknown[] };
      expect(warningResult).toEqual({
        warnings: [{
          code: "PARTIAL_FORMATTING",
          message: "Only supported formatting properties were extracted.",
          path: "sections[0].objects[0].format",
        }, {
          code: "UNSUPPORTED_FEATURE",
          message: "Map object internals are not supported by this worker version.",
          path: "sections[0]",
        }],
      });

      const golden = JSON.parse(await readFile(mockGoldenFixture, "utf8")) as unknown;
      expect({
        report: { ...report, filePath: "<REPORT_PATH>" },
        warnings: warningResult.warnings,
      }).toEqual(golden);
      const afterHash = createHash("sha256").update(await readFile(reportPath)).digest("hex");
      expect(afterHash).toBe(beforeHash);
    } finally {
      await client.close();
    }
  });

  it("advertises read_metadata and returns only validated metadata", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-metadata-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_metadata");

      const result = await client.callTool({ name: "read_metadata", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      const metadata = JSON.parse(content.text) as Record<string, unknown>;
      expect(metadata).toMatchObject({
        title: "Sample",
        author: "Test",
        savedData: false,
        pageSize: { width: 8.5, height: 11 },
      });
      expect(metadata).not.toHaveProperty("dataSources");
    } finally {
      await client.close();
    }
  });

  it("advertises read_data_sources and redacts connection secrets", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-data-sources-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_data_sources");

      const result = await client.callTool({ name: "read_data_sources", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      const dataSources = JSON.parse(content.text) as Array<Record<string, unknown>>;
      expect(dataSources).toHaveLength(1);
      expect(dataSources[0]).toMatchObject({
        name: "Main",
        type: "sql",
        connectionString: "[REDACTED]",
      });
    } finally {
      await client.close();
    }
  });

  it("advertises extract_sql and returns SQL with its data source identity", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-sql-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("extract_sql");

      const result = await client.callTool({ name: "extract_sql", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      expect(JSON.parse(content.text)).toEqual([{
        dataSourceName: "Main",
        dataSourceType: "sql",
        commandText: "SELECT Id, Name FROM Patients WHERE VisitId = {?VisitId}",
      }]);
    } finally {
      await client.close();
    }
  });

  it("advertises read_parameters and redacts sensitive parameter values", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-parameters-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_parameters");

      const result = await client.callTool({ name: "read_parameters", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      const parameters = JSON.parse(content.text) as Array<Record<string, unknown>>;
      expect(parameters).toHaveLength(2);
      expect(parameters[0]).toMatchObject({ name: "VisitId", defaultValue: 1001 });
      expect(parameters[1]).toMatchObject({
        name: "ApiToken",
        defaultValue: "[REDACTED]",
        valueList: "[REDACTED]",
      });
    } finally {
      await client.close();
    }
  });

  it("advertises read_formulas and returns dependency references", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-formulas-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_formulas");

      const result = await client.callTool({ name: "read_formulas", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      expect(JSON.parse(content.text)).toEqual([{
        name: "PatientDisplayName",
        syntax: "{@Title} + {Patients.LastName} + ', ' + {Patients.FirstName} + ToText({?VisitId})",
        evaluationTime: "WhileReadingRecords",
        isGlobal: false,
        isShared: false,
        referencedFields: ["Patients.LastName", "Patients.FirstName"],
        referencedFormulas: ["Title"],
        dependencies: [
          "formula:Title",
          "field:Patients.LastName",
          "field:Patients.FirstName",
          "parameter:VisitId",
        ],
      }]);
    } finally {
      await client.close();
    }
  });

  it("advertises read_sections and returns layout settings with contained objects", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-sections-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_sections");

      const result = await client.callTool({ name: "read_sections", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      const sections = JSON.parse(content.text) as Array<Record<string, unknown>>;
      expect(sections).toHaveLength(1);
      expect(sections[0]).toMatchObject({
        name: "Details a",
        type: "Details",
        height: 720,
        keepTogether: true,
        objects: [{ name: "PatientName", type: "FieldObject", section: "Details a" }],
      });
    } finally {
      await client.close();
    }
  });

  it("advertises read_objects and filters by exact section name", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-objects-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_objects");

      const result = await client.callTool({
        name: "read_objects",
        arguments: { filePath: reportPath, sectionName: "Details a" },
      });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      const objects = JSON.parse(content.text) as Array<Record<string, unknown>>;
      expect(objects).toHaveLength(1);
      expect(objects[0]).toMatchObject({
        name: "PatientName",
        type: "FieldObject",
        section: "Details a",
        formulaName: "PatientDisplayName",
        format: { horizontalAlignment: "Left" },
      });
    } finally {
      await client.close();
    }
  });

  it("advertises read_subreports and returns link fields", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-subreports-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_subreports");

      const result = await client.callTool({ name: "read_subreports", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      expect(JSON.parse(content.text)).toEqual([{
        name: "VisitDetails",
        reportName: "VisitDetails.rpt",
        linkFields: [{
          mainReportField: "Patients.VisitId",
          subreportField: "VisitDetails.VisitId",
          linkedParameterName: "?Pm-VisitDetails.VisitId",
        }],
        isOnDemand: false,
        metadata: {
          title: "Visit details",
          subject: null,
          author: "Test",
          keywords: null,
          comments: null,
          savedData: false,
          pageSize: { width: 8.5, height: 11 },
          margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25 },
        },
        dataSources: [],
        formulas: [],
        parameters: [],
        sections: [],
        runningTotals: [],
        customFunctions: [],
      }]);
    } finally {
      await client.close();
    }
  });

  it("advertises read_running_totals and returns evaluation and reset metadata", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-running-totals-test-"));
    temporaryDirectories.push(reportRoot);
    const reportPath = path.join(reportRoot, "sample.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("read_running_totals");

      const result = await client.callTool({ name: "read_running_totals", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      expect(JSON.parse(content.text)).toEqual([{
        name: "PatientCount",
        field: "Patients.Id",
        type: "Count",
        evaluate: "OnChangeOfField",
        evaluateFormula: null,
        reset: "OnChangeOfGroup",
        resetFormula: null,
        groupName: "PatientGroup",
        fieldName: "Patients.Id",
      }]);
    } finally {
      await client.close();
    }
  });

  it("rejects reports outside configured roots before calling the worker", async () => {
    const reportRoot = await mkdtemp(path.join(tmpdir(), "rip-allowed-"));
    const outsideRoot = await mkdtemp(path.join(tmpdir(), "rip-outside-"));
    temporaryDirectories.push(reportRoot, outsideRoot);
    const reportPath = path.join(outsideRoot, "outside.rpt");
    await writeFile(reportPath, "mock report fixture");

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: process.execPath,
        CRYSTAL_WORKER_ARGS: JSON.stringify([mockWorker]),
        RIP_ALLOWED_REPORT_ROOTS: reportRoot,
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-integration-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const result = await client.callTool({ name: "read_report", arguments: { filePath: reportPath } });
      expect(result.isError).toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP error");
      expect(JSON.parse(content.text)).toMatchObject({
        error: { code: "FILE_OUTSIDE_ALLOWED_ROOTS" },
      });
    } finally {
      await client.close();
    }
  });
});
