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
      const report = JSON.parse(content.text) as { dataSources: Array<{ connectionString: string }> };
      expect(report.dataSources[0]?.connectionString).toBe("[REDACTED]");
      const afterHash = createHash("sha256").update(await readFile(reportPath)).digest("hex");
      expect(afterHash).toBe(beforeHash);
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
