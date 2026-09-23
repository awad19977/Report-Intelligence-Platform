# @report-intelligence/mcp-server

Model Context Protocol server for validated, read-only Crystal Reports inspection.

The server exposes metadata, data sources, SQL, parameters, formulas, sections, objects, subreports, and running totals through a Windows worker. On Windows x64, npm installs and discovers the free-to-use Community worker as an optional dependency. The worker is binary-only and separately licensed. SAP Crystal Reports runtime components are not included.

## Install

```sh
npm install @report-intelligence/mcp-server
```

If your package manager is configured to omit optional dependencies, install the worker explicitly:

```sh
npm install @report-intelligence/mcp-server @report-intelligence/crystal-worker-community-win32-x64
```

The server checks `CRYSTAL_WORKER_PATH` first, then Pro, a Store-installed Community execution alias, and the Community npm worker. This permits a Pro upgrade without changing MCP configuration.

Check the local setup before connecting an agent:

```sh
npx --yes @report-intelligence/mcp-server doctor --report C:\reports\example.rpt
```

Use `--json` for automation. Without `--report`, the command verifies discovery and the worker protocol but cannot prove that the SAP runtime can open reports.

## MCP client configuration

```json
{
  "mcpServers": {
    "report-intelligence": {
      "command": "npx",
      "args": ["--yes", "@report-intelligence/mcp-server"],
      "env": {
        "RIP_ALLOWED_REPORT_ROOTS": "C:\\reports"
      }
    }
  }
}
```

`RIP_ALLOWED_REPORT_ROOTS` uses the operating system path delimiter and defaults to the server's working directory. Optional settings are `CRYSTAL_WORKER_PATH` (an explicit Community, Pro, or custom worker override), `CRYSTAL_WORKER_ARGS` (a JSON array), `CRYSTAL_WORKER_STARTUP_TIMEOUT_MS`, `CRYSTAL_WORKER_TIMEOUT_MS`, `CRYSTAL_WORKER_SHUTDOWN_TIMEOUT_MS`, `RIP_MAX_REPORT_BYTES`, and `LOG_LEVEL`.

For repeatable production setups, install an exact package version and remove `--yes` from the `npx` invocation.

For Codex, Claude Code, Cursor, and VS Code project setup, install the CLI and run `rip agents install <agent> --reports C:\reports`. See the CLI README for the generated configuration locations.

## Security boundary

Requests are restricted to canonical paths beneath the configured allowed roots, and report size is checked before dispatch. Keep the worker and SAP runtime on a trusted Windows host and grant access only to intended report directories. Local extraction requires Windows x64 and a compatible separately installed SAP Crystal Reports runtime.

## License

The MCP server is LGPL-3.0-only. Community and Pro worker binaries use their own licenses and are not part of the LGPL-covered source.
