import { spawn } from "node:child_process";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

const SERVER_PACKAGE = "@report-intelligence/mcp-server@0.1.2";
const SERVER_NAME = "report-intelligence";

export type CodingAgent = "codex" | "claude" | "cursor" | "vscode";

function serverConfig(reportRoot: string) {
  return {
    command: process.platform === "win32" ? "cmd.exe" : "npx",
    args: process.platform === "win32"
      ? ["/d", "/c", "npx.cmd", "--yes", SERVER_PACKAGE]
      : ["--yes", SERVER_PACKAGE],
    env: { RIP_ALLOWED_REPORT_ROOTS: reportRoot },
  };
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code ?? "unknown"}`));
    });
  });
}

async function updateJsonConfig(
  filePath: string,
  collectionKey: "mcpServers" | "servers",
  reportRoot: string,
): Promise<void> {
  let document: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${filePath} must contain a JSON object`);
    }
    document = parsed as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const existing = document[collectionKey];
  if (existing !== undefined && (typeof existing !== "object" || existing === null || Array.isArray(existing))) {
    throw new Error(`${filePath}: '${collectionKey}' must be a JSON object`);
  }
  const servers = { ...(existing as Record<string, unknown> | undefined) };
  const config = {
    ...(collectionKey === "servers" ? { type: "stdio" } : {}),
    ...serverConfig(reportRoot),
  };
  if (servers[SERVER_NAME] !== undefined) {
    if (JSON.stringify(servers[SERVER_NAME]) === JSON.stringify(config)) return;
    throw new Error(`${filePath} already has '${SERVER_NAME}'; review it before replacing it`);
  }

  servers[SERVER_NAME] = config;
  document[collectionKey] = servers;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

export async function installCodingAgent(
  agent: string,
  reports: string,
  projectDir = process.cwd(),
): Promise<string> {
  if (!["codex", "claude", "cursor", "vscode"].includes(agent)) {
    throw new Error(`Unknown coding agent '${agent}'; choose codex, claude, cursor, or vscode`);
  }
  const reportRoot = await realpath(path.resolve(reports));
  const config = serverConfig(reportRoot);

  if (agent === "codex") {
    await run("codex", [
      "mcp", "add", "--env", `RIP_ALLOWED_REPORT_ROOTS=${reportRoot}`,
      SERVER_NAME, "--", config.command, ...config.args,
    ]);
    return "Codex MCP configuration";
  }

  const filePath = agent === "claude"
    ? path.join(projectDir, ".mcp.json")
    : agent === "cursor"
      ? path.join(projectDir, ".cursor", "mcp.json")
      : path.join(projectDir, ".vscode", "mcp.json");
  await updateJsonConfig(filePath, agent === "vscode" ? "servers" : "mcpServers", reportRoot);
  return filePath;
}
