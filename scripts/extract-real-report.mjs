import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const reportPath = process.env.CRYSTAL_TEST_REPORT;
const workerPath = process.env.CRYSTAL_WORKER_PATH;

if (!reportPath || !workerPath) {
  throw new Error("CRYSTAL_TEST_REPORT and CRYSTAL_WORKER_PATH are required");
}

const absoluteReportPath = path.resolve(reportPath);
const serverEntry = path.resolve("apps/mcp-server/dist/index.js");
const outputPath = path.resolve(
  process.env.RIP_REPORT_JSON_OUTPUT
    ?? path.join("test-results", `${path.basename(reportPath, path.extname(reportPath))}.read-report.json`),
);

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

const beforeBytes = await readFile(absoluteReportPath);
const beforeHash = sha256(beforeBytes);
const reportStat = await stat(absoluteReportPath);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  cwd: process.cwd(),
  env: {
    ...process.env,
    CRYSTAL_WORKER_PATH: path.resolve(workerPath),
    RIP_ALLOWED_REPORT_ROOTS: process.env.RIP_ALLOWED_REPORT_ROOTS ?? path.dirname(absoluteReportPath),
    LOG_LEVEL: process.env.LOG_LEVEL ?? "error",
  },
  stderr: "pipe",
});
const client = new Client({ name: "rip-real-report-extractor", version: "0.1.0" });

let report;
let warnings = [];
let toolsPassed = [];
try {
  await client.connect(transport);
  const callTool = async (name) => {
    const result = await client.callTool({ name, arguments: { filePath: absoluteReportPath } });
    if (result.isError) {
      const errorContent = result.content[0];
      const detail = errorContent?.type === "text" ? errorContent.text : "No text error payload";
      throw new Error(`Real Crystal ${name} failed: ${detail}`);
    }
    const dataContent = result.content[0];
    if (dataContent?.type !== "text") throw new Error(`Expected a text result from ${name}`);
    const toolWarnings = [];
    for (const content of result.content.slice(1)) {
      if (content.type !== "text") continue;
      const parsed = JSON.parse(content.text);
      if (Array.isArray(parsed.warnings)) toolWarnings.push(...parsed.warnings);
    }
    toolsPassed.push(name);
    return { data: JSON.parse(dataContent.text), warnings: toolWarnings };
  };

  const full = await callTool("read_report");
  report = full.data;
  report.filePath = "<REPORT_PATH>";
  warnings = full.warnings;

  const metadata = await callTool("read_metadata");
  const dataSources = await callTool("read_data_sources");
  const sql = await callTool("extract_sql");
  const parameters = await callTool("read_parameters");
  const formulas = await callTool("read_formulas");
  const sections = await callTool("read_sections");
  const objects = await callTool("read_objects");
  const subreports = await callTool("read_subreports");
  const runningTotals = await callTool("read_running_totals");

  assert.deepEqual(metadata.data, report.metadata);
  assert.deepEqual(dataSources.data, report.dataSources);
  assert.deepEqual(sql.data, report.dataSources.flatMap((source) => {
    const commandText = source.commandText?.trim();
    return commandText ? [{
      dataSourceName: source.name,
      dataSourceType: source.type,
      commandText,
    }] : [];
  }));
  assert.deepEqual(parameters.data, report.parameters);
  assert.deepEqual(formulas.data, report.formulas);
  assert.deepEqual(sections.data, report.sections);
  assert.deepEqual(objects.data, report.sections.flatMap((section) => section.objects));
  assert.deepEqual(subreports.data, report.subreports);
  assert.deepEqual(runningTotals.data, report.runningTotals);
} finally {
  await client.close();
}

const afterHash = sha256(await readFile(absoluteReportPath));
if (afterHash !== beforeHash) {
  throw new Error(`Report changed during extraction (${beforeHash} -> ${afterHash})`);
}

const artifact = {
  schemaVersion: "1.0",
  generatedAt: new Date().toISOString(),
  source: {
    fileName: path.basename(absoluteReportPath),
    sizeBytes: reportStat.size,
    sha256Before: beforeHash,
    sha256After: afterHash,
    unchanged: true,
  },
  verification: {
    toolsPassed,
    projectionsMatchFullReport: true,
  },
  report,
  warnings,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

const objectCount = report.sections.reduce((total, section) => total + section.objects.length, 0);
console.log(JSON.stringify({
  outputPath,
  sizeBytes: reportStat.size,
  sha256: beforeHash,
  metadata: report.metadata,
  counts: {
    dataSources: report.dataSources.length,
    formulas: report.formulas.length,
    parameters: report.parameters.length,
    sections: report.sections.length,
    objects: objectCount,
    subreports: report.subreports.length,
    runningTotals: report.runningTotals.length,
    customFunctions: report.customFunctions.length,
    warnings: warnings.length,
  },
  toolsPassed,
}, null, 2));
