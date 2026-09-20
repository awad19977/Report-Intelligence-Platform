import readline from "node:readline";

const protocolVersion = "1.0";

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

send({
  type: "ready",
  protocolVersion,
  worker: { name: "mock-crystal-worker", version: "0.1.0-test" },
  capabilities: ["read_report", "shutdown"],
});

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  const request = JSON.parse(line);

  if (request.command === "shutdown") {
    send({
      type: "response",
      protocolVersion,
      id: request.id,
      ok: true,
      result: { shuttingDown: true },
      warnings: [],
    });
    process.exit(0);
  }

  if (request.command === "malformed") {
    process.stdout.write("this is not json\n");
    continue;
  }

  if (request.command === "delay") continue;

  if (request.command === "exit") {
    process.exit(17);
  }

  if (request.command !== "read_report") {
    send({
      type: "response",
      protocolVersion,
      id: request.id,
      ok: false,
      error: { code: "UNSUPPORTED_FEATURE", message: "Unsupported mock command", retryable: false },
    });
    continue;
  }

  send({
    type: "warning",
    protocolVersion,
    id: request.id,
    warning: {
      code: "PARTIAL_FORMATTING",
      message: "Only supported formatting properties were extracted.",
      path: "sections[0].objects[0].format",
    },
  });

  send({
    type: "response",
    protocolVersion,
    id: request.id,
    ok: true,
    result: {
      format: "crystal",
      filePath: request.args[0],
      fileName: "sample.rpt",
      metadata: {
        title: "Sample",
        subject: null,
        author: "Test",
        keywords: null,
        comments: null,
        createdDate: "2026-09-19T00:00:00Z",
        modifiedDate: "2026-09-19T00:00:00Z",
        savedData: false,
        pageSize: { width: 8.5, height: 11 },
        margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 },
      },
      dataSources: [{
        name: "Main",
        type: "sql",
        connectionString: "Server=db;User Id=admin;Password=secret",
        tables: [],
        joins: [],
        commandText: "SELECT Id, Name FROM Patients WHERE VisitId = {?VisitId}",
        parameters: [],
      }],
      formulas: [{
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
      }],
      parameters: [{
        name: "VisitId",
        prompt: "Visit identifier",
        type: "number",
        defaultValue: 1001,
        allowNull: false,
        allowMultiple: false,
        valueList: null,
        cascadingParent: null,
        isOptional: false,
        description: "Selects one visit",
      }, {
        name: "ApiToken",
        prompt: "Service token",
        type: "string",
        defaultValue: "secret-token",
        allowNull: false,
        allowMultiple: false,
        valueList: ["secret-token"],
        cascadingParent: null,
        isOptional: true,
        description: "Sensitive test parameter",
      }],
      sections: [{
        name: "Details a",
        type: "Details",
        groupName: null,
        groupField: null,
        groupCondition: null,
        height: 720,
        suppress: false,
        newPageBefore: false,
        newPageAfter: false,
        resetPageNumber: false,
        keepTogether: true,
        printAtBottom: false,
        objects: [{
          name: "PatientName",
          type: "FieldObject",
          section: "Details a",
          left: 120,
          top: 60,
          width: 2400,
          height: 300,
          suppress: false,
          canGrow: true,
          format: { horizontalAlignment: "Left" },
          text: null,
          formulaName: "PatientDisplayName",
          fieldName: null,
          subreportName: null,
        }],
      }],
      subreports: [{
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
      }],
      runningTotals: [{
        name: "PatientCount",
        field: "Patients.Id",
        type: "Count",
        evaluate: "OnChangeOfField",
        evaluateFormula: null,
        reset: "OnChangeOfGroup",
        resetFormula: null,
        groupName: "PatientGroup",
        fieldName: "Patients.Id",
      }],
      customFunctions: [{
        name: "FormatPatientName",
        syntax: "Function FormatPatientName(value As String) As String\nFormatPatientName = value\nEnd Function",
        language: "Basic",
      }],
    },
    warnings: [{
      code: "UNSUPPORTED_FEATURE",
      message: "Map object internals are not supported by this worker version.",
      path: "sections[0]",
    }],
  });
}
