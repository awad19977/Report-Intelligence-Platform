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
        commandText: null,
        parameters: [],
      }],
      formulas: [],
      parameters: [],
      sections: [],
      subreports: [],
      runningTotals: [],
      customFunctions: [],
    },
    warnings: [],
  });
}
