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

describe.skipIf(!workerPath || !reportPath)("real Crystal read_report", () => {
  it("reads a sanitized report without changing it", async () => {
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
      const result = await client.callTool({ name: "read_report", arguments: { filePath: reportPath } });
      expect(result.isError).not.toBe(true);
      const content = result.content[0];
      if (content?.type !== "text") throw new Error("Expected a text MCP result");
      expect(JSON.parse(content.text)).toMatchObject({ format: "crystal" });
      const after = createHash("sha256").update(await readFile(reportPath)).digest("hex");
      expect(after).toBe(before);
    } finally {
      await client.close();
    }
  });
});
