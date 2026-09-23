import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installCodingAgent } from "../src/agent-install.js";

const created: string[] = [];

afterEach(async () => {
  for (const directory of created.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe("coding agent installation", () => {
  it("preserves existing Claude servers and is repeatable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "rip-agent-test-"));
    created.push(directory);
    const configPath = path.join(directory, ".mcp.json");
    await writeFile(configPath, JSON.stringify({ mcpServers: { existing: { command: "other" } } }));

    await installCodingAgent("claude", directory, directory);
    await installCodingAgent("claude", directory, directory);

    const config = JSON.parse(await readFile(configPath, "utf8"));
    expect(config.mcpServers.existing.command).toBe("other");
    expect(config.mcpServers["report-intelligence"].env.RIP_ALLOWED_REPORT_ROOTS).toBe(directory);
    expect(config.mcpServers["report-intelligence"].args).toContain("@report-intelligence/mcp-server@0.1.2");
  });

  it("refuses to replace a customized server", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "rip-agent-test-"));
    created.push(directory);
    await writeFile(path.join(directory, ".mcp.json"), JSON.stringify({
      mcpServers: { "report-intelligence": { command: "custom" } },
    }));

    await expect(installCodingAgent("claude", directory, directory)).rejects.toThrow("already has");
  });
});
