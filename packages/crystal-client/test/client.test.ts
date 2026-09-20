import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CrystalWorkerClient, CrystalWorkerError } from "../src/client.js";
import { CrystalDataSourceSchema, CrystalFormulaSchema, redactSecrets } from "../src/report.js";

const mockWorker = fileURLToPath(new URL("./fixtures/mock-worker.mjs", import.meta.url));

function createClient(requestTimeoutMs = 1_000): CrystalWorkerClient {
  return new CrystalWorkerClient({
    workerPath: process.execPath,
    workerArgs: [mockWorker],
    requestTimeoutMs,
    startupTimeoutMs: 1_000,
    shutdownTimeoutMs: 1_000,
  });
}

describe("CrystalWorkerClient", () => {
  it("models stored procedures without pretending their server-side SQL is embedded", () => {
    const storedProcedure = CrystalDataSourceSchema.parse({
      name: "USR_RPT_ACC_AccStatmentS;1",
      type: "StoredProcedure",
      procedureName: "salihco.dbo.USR_RPT_ACC_AccStatmentS;1",
      tables: [{
        name: "USR_RPT_ACC_AccStatmentS;1",
        alias: "USR_RPT_ACC_AccStatmentS;1",
        qualifiedName: "salihco.dbo.USR_RPT_ACC_AccStatmentS;1",
        fields: [],
      }],
      joins: [],
      parameters: [{
        name: "@accsub_no",
        type: "crFieldValueTypeStringField",
        allowNull: false,
        allowMultiple: false,
        isOptional: false,
      }],
    });

    expect(storedProcedure).toMatchObject({
      type: "StoredProcedure",
      procedureName: "salihco.dbo.USR_RPT_ACC_AccStatmentS;1",
    });
    expect(storedProcedure).not.toHaveProperty("commandText");
  });

  it("accepts unavailable formula syntax for incomplete worker extraction", () => {
    expect(CrystalFormulaSchema.parse({
      name: "UserName",
      evaluationTime: "unknown",
      isGlobal: false,
      isShared: false,
      referencedFields: [],
      referencedFormulas: [],
      dependencies: [],
    })).toMatchObject({ name: "UserName" });
  });

  it("negotiates protocol v1 and validates read_report responses", async () => {
    const client = createClient();
    await client.connect();

    const report = await client.readReport("C:/reports/sample.rpt");

    expect(report.format).toBe("crystal");
    expect(report.fileName).toBe("sample.rpt");
    expect(report.metadata.title).toBe("Sample");
    await client.disconnect();
  });

  it("returns request-correlated standalone and success-envelope warnings", async () => {
    const client = createClient();
    await client.connect();

    const result = await client.readReportResult("C:/reports/sample.rpt");

    expect(result.data.fileName).toBe("sample.rpt");
    expect(result.warnings).toEqual([{
      code: "PARTIAL_FORMATTING",
      message: "Only supported formatting properties were extracted.",
      path: "sections[0].objects[0].format",
    }, {
      code: "UNSUPPORTED_FEATURE",
      message: "Map object internals are not supported by this worker version.",
      path: "sections[0]",
    }]);
    await client.disconnect();
  });

  it("projects metadata from the validated read_report response", async () => {
    const client = createClient();
    await client.connect();

    const metadata = await client.readMetadata("C:/reports/sample.rpt");

    expect(metadata).toMatchObject({
      title: "Sample",
      author: "Test",
      savedData: false,
      pageSize: { width: 8.5, height: 11 },
    });
    await client.disconnect();
  });

  it("projects data sources from the validated read_report response", async () => {
    const client = createClient();
    await client.connect();

    const dataSources = await client.readDataSources("C:/reports/sample.rpt");

    expect(dataSources).toHaveLength(1);
    expect(dataSources[0]).toMatchObject({
      name: "Main",
      type: "sql",
      connectionString: "Server=db;User Id=admin;Password=secret",
    });
    await client.disconnect();
  });

  it("extracts non-empty SQL commands with their data source identity", async () => {
    const client = createClient();
    await client.connect();

    const queries = await client.extractSql("C:/reports/sample.rpt");

    expect(queries).toEqual([{
      dataSourceName: "Main",
      dataSourceType: "sql",
      commandText: "SELECT Id, Name FROM Patients WHERE VisitId = {?VisitId}",
    }]);
    await client.disconnect();
  });

  it("projects report parameters from the validated read_report response", async () => {
    const client = createClient();
    await client.connect();

    const parameters = await client.readParameters("C:/reports/sample.rpt");

    expect(parameters).toHaveLength(2);
    expect(parameters[0]).toMatchObject({
      name: "VisitId",
      type: "number",
      defaultValue: 1001,
      allowMultiple: false,
    });
    await client.disconnect();
  });

  it("projects formulas and their dependencies from the validated read_report response", async () => {
    const client = createClient();
    await client.connect();

    const formulas = await client.readFormulas("C:/reports/sample.rpt");

    expect(formulas).toEqual([{
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
    await client.disconnect();
  });

  it("projects sections and their contained objects from the validated read_report response", async () => {
    const client = createClient();
    await client.connect();

    const sections = await client.readSections("C:/reports/sample.rpt");

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      name: "Details a",
      type: "Details",
      height: 720,
      keepTogether: true,
      objects: [{ name: "PatientName", type: "FieldObject", section: "Details a" }],
    });
    await client.disconnect();
  });

  it("flattens report objects and supports an exact section-name filter", async () => {
    const client = createClient();
    await client.connect();

    const objects = await client.readObjects("C:/reports/sample.rpt", "Details a");
    const missingSectionObjects = await client.readObjects("C:/reports/sample.rpt", "Report Header a");

    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({
      name: "PatientName",
      type: "FieldObject",
      section: "Details a",
      formulaName: "PatientDisplayName",
      format: { horizontalAlignment: "Left" },
    });
    expect(missingSectionObjects).toEqual([]);
    await client.disconnect();
  });

  it("projects subreports and their link fields from the validated read_report response", async () => {
    const client = createClient();
    await client.connect();

    const subreports = await client.readSubreports("C:/reports/sample.rpt");

    expect(subreports).toEqual([{
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
    await client.disconnect();
  });

  it("projects running-total evaluation and reset metadata from the validated response", async () => {
    const client = createClient();
    await client.connect();

    const runningTotals = await client.readRunningTotals("C:/reports/sample.rpt");

    expect(runningTotals).toEqual([{
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
    await client.disconnect();
  });

  it("redacts secret-bearing fields recursively", () => {
    const value = redactSecrets({
      connectionString: "Server=db;Password=secret",
      nested: { password: "secret", ordinary: "visible" },
    });

    expect(value).toEqual({
      connectionString: "[REDACTED]",
      nested: { password: "[REDACTED]", ordinary: "visible" },
    });
  });

  it("redacts values carried by sensitively named parameters", () => {
    const value = redactSecrets({
      name: "ApiToken",
      prompt: "Service token",
      defaultValue: "secret-token",
      valueList: ["secret-token"],
      description: "Visible metadata",
    });

    expect(value).toEqual({
      name: "ApiToken",
      prompt: "Service token",
      defaultValue: "[REDACTED]",
      valueList: "[REDACTED]",
      description: "Visible metadata",
    });
  });

  it("rejects timed-out requests with a stable code", async () => {
    const client = createClient(25);
    await client.connect();

    await expect(client.request("delay")).rejects.toMatchObject<Partial<CrystalWorkerError>>({
      code: "WORKER_TIMEOUT",
    });
    await client.disconnect();
  });

  it("fails the connection when stdout contains malformed JSON", async () => {
    const client = createClient();
    await client.connect();

    await expect(client.request("malformed")).rejects.toMatchObject<Partial<CrystalWorkerError>>({
      code: "INTERNAL_ERROR",
    });
    await client.disconnect();
  });

  it("rejects pending requests when the worker exits", async () => {
    const client = createClient();
    await client.connect();

    await expect(client.request("exit")).rejects.toMatchObject<Partial<CrystalWorkerError>>({
      code: "WORKER_DISCONNECTED",
    });
    await client.disconnect();
  });
});
