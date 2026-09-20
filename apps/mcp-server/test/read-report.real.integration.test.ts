import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

const workerPath = process.env["CRYSTAL_WORKER_PATH"];
const reportPath = process.env["CRYSTAL_TEST_REPORT"];
const appRoot = fileURLToPath(new URL("..", import.meta.url));
const serverEntry = path.join(appRoot, "dist", "index.js");

describe.skipIf(!workerPath || !reportPath)("real Crystal MCP read tools", () => {
  it("reads a local report through every advertised extraction tool without changing it", async () => {
    if (!workerPath || !reportPath) throw new Error("Real Crystal test configuration is missing");
    const before = createHash("sha256").update(await readFile(reportPath)).digest("hex");
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [serverEntry],
      cwd: path.resolve(appRoot, "../.."),
      env: {
        ...process.env,
        CRYSTAL_WORKER_PATH: workerPath,
        RIP_ALLOWED_REPORT_ROOTS: process.env["RIP_ALLOWED_REPORT_ROOTS"] ?? path.dirname(reportPath),
        LOG_LEVEL: "error",
      } as Record<string, string>,
      stderr: "pipe",
    });
    const client = new Client({ name: "rip-real-crystal-test", version: "0.1.0" });

    try {
      await client.connect(transport);
      const expectedTools = [
        "read_report",
        "read_metadata",
        "read_data_sources",
        "extract_sql",
        "read_parameters",
        "read_formulas",
        "read_sections",
        "read_objects",
        "read_subreports",
        "read_running_totals",
      ];
      const listed = await client.listTools();
      expect(listed.tools.map((tool) => tool.name)).toEqual(expectedTools);

      const outputs = new Map<string, unknown>();
      for (const name of expectedTools) {
        const result = await client.callTool({ name, arguments: { filePath: reportPath } });
        if (result.isError) {
          const errorContent = result.content[0];
          const detail = errorContent?.type === "text" ? errorContent.text : "No text error payload";
          throw new Error(`Real Crystal ${name} failed: ${detail}`);
        }
        const content = result.content[0];
        if (content?.type !== "text") throw new Error(`Expected a text MCP result from ${name}`);
        outputs.set(name, JSON.parse(content.text));

        const warningContent = result.content[1];
        if (warningContent !== undefined) {
          if (warningContent.type !== "text") throw new Error(`Expected text warnings from ${name}`);
          expect(JSON.parse(warningContent.text)).toMatchObject({ warnings: expect.any(Array) });
        }
      }

      const report = outputs.get("read_report") as {
        format: string;
        dataSources: Array<{ connectionString?: unknown }>;
      };
      expect(report).toMatchObject({ format: "crystal" });
      expect(report.dataSources.every((source) => (
        source.connectionString == null || source.connectionString === "[REDACTED]"
      ))).toBe(true);
      expect(outputs.get("read_metadata")).toMatchObject({ savedData: true });
      expect(outputs.get("read_data_sources")).toHaveLength(3);
      expect(outputs.get("extract_sql")).toEqual([]);
      expect(outputs.get("read_parameters")).toHaveLength(1);
      expect(outputs.get("read_formulas")).toEqual([]);
      expect(outputs.get("read_sections")).toHaveLength(5);
      expect(outputs.get("read_objects")).toHaveLength(13);
      expect(outputs.get("read_subreports")).toEqual([]);
      expect(outputs.get("read_running_totals")).toEqual([]);
    } finally {
      await client.close();
      const after = createHash("sha256").update(await readFile(reportPath)).digest("hex");
      expect(after).toBe(before);
    }
  }, 30_000);
});
