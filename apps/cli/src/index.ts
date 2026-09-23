#!/usr/bin/env node
import { program } from "commander";
import { fileURLToPath } from "url";
import { dirname } from "path";
import winston from "winston";
import { spawn } from "node:child_process";
import { installCodingAgent } from "./agent-install.js";

const __filename = fileURLToPath(import.meta.url);
dirname(__filename);

function runMcpServer(args: string[]): Promise<void> {
  const serverEntry = fileURLToPath(import.meta.resolve("@report-intelligence/mcp-server"));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverEntry, ...args], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`MCP server exited on ${signal}`));
      else {
        process.exitCode = code ?? 1;
        resolve();
      }
    });
  });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

program
  .name("rip")
  .description("Report Intelligence Platform CLI")
  .version("0.1.2");

program
  .command("doctor")
  .description("Check the Community or Pro worker and Crystal runtime")
  .option("--report <path>", "Open a .rpt file to verify the SAP Crystal runtime")
  .option("--json", "Print machine-readable diagnostics")
  .action(async (options: { report?: string; json?: boolean }) => {
    await runMcpServer(["doctor", ...(options.report ? ["--report", options.report] : []), ...(options.json ? ["--json"] : [])]);
  });

program
  .command("agents")
  .description("Configure a coding agent to use the Crystal MCP server")
  .command("install <agent>")
  .description("Install for codex, claude, cursor, or vscode")
  .option("--reports <directory>", "Directory containing .rpt files", process.cwd())
  .action(async (agent: string, options: { reports: string }) => {
    const destination = await installCodingAgent(agent, options.reports);
    process.stdout.write(`Configured ${agent}: ${destination}\n`);
  });

program
  .command("read <filePath>")
  .description("Read a Crystal Report file")
  .option("-f, --format <format>", "Output format (json, markdown)", "json")
  .option("--include-saved-data", "Include saved data", false)
  .option("--include-formatting", "Include formatting", true)
  .option("--include-subreports", "Include subreports", true)
  .action(async (filePath, _options) => {
    logger.info("Reading report", { filePath });
    console.log(`Reading ${filePath} - Crystal Worker not implemented yet`);
  });

program
  .command("formulas <filePath>")
  .description("Extract formulas from a report")
  .action(async (filePath) => {
    logger.info("Extracting formulas", { filePath });
    console.log(`Extracting formulas from ${filePath} - Crystal Worker not implemented yet`);
  });

program
  .command("parameters <filePath>")
  .description("Extract parameters from a report")
  .action(async (filePath) => {
    logger.info("Extracting parameters", { filePath });
    console.log(`Extracting parameters from ${filePath} - Crystal Worker not implemented yet`);
  });

program
  .command("sql <filePath>")
  .description("Extract SQL queries from a report")
  .action(async (filePath) => {
    logger.info("Extracting SQL", { filePath });
    console.log(`Extracting SQL from ${filePath} - Crystal Worker not implemented yet`);
  });

program
  .command("search <query>")
  .description("Search across reports")
  .requiredOption("-p, --paths <paths...>", "Paths to search")
  .option("-t, --type <type>", "Search type (formula, field, parameter, sql, text, object, all)", "all")
  .option("-c, --case-sensitive", "Case sensitive search", false)
  .option("-r, --regex", "Use regex", false)
  .action(async (query, _options) => {
    logger.info("Searching reports", { query });
    console.log(`Searching for ${query} - Crystal Worker not implemented yet`);
  });

program
  .command("document <filePath>")
  .description("Generate documentation for a report")
  .option("-f, --format <format>", "Output format (markdown, html, pdf)", "markdown")
  .option("-d, --detail <level>", "Detail level (summary, detailed, comprehensive)", "detailed")
  .option("--output <path>", "Output file path")
  .action(async (filePath, _options) => {
    logger.info("Generating documentation", { filePath });
    console.log(`Generating documentation for ${filePath} - Crystal Worker not implemented yet`);
  });

program
  .command("validate <filePath>")
  .description("Validate a report")
  .action(async (filePath) => {
    logger.info("Validating report", { filePath });
    console.log(`Validating ${filePath} - Crystal Worker not implemented yet`);
  });

program
  .command("export <filePath> <outputPath>")
  .description("Export a report")
  .option("-f, --format <format>", "Export format (pdf, excel, word, html, csv)", "pdf")
  .action(async (filePath, outputPath, _options) => {
    logger.info("Exporting report", { filePath, outputPath });
    console.log(`Exporting ${filePath} to ${outputPath} - Crystal Worker not implemented yet`);
  });

program
  .command("mcp")
  .description("Start the MCP server")
  .action(async () => {
    await runMcpServer([]);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
