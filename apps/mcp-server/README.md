# @report-intelligence/mcp-server

Model Context Protocol server for validated, read-only Crystal Reports inspection.

The server exposes metadata, data sources, SQL, parameters, formulas, sections, objects, subreports, and running totals through a separately distributed Windows worker. This package does **not** include SAP Crystal Reports runtime components or the production worker.

## Install

```sh
npm install @report-intelligence/mcp-server
```

## MCP client configuration

```json
{
  "mcpServers": {
    "report-intelligence": {
      "command": "npx",
      "args": ["--yes", "@report-intelligence/mcp-server"],
      "env": {
        "CRYSTAL_WORKER_PATH": "C:\\path\\to\\crystal-worker.exe",
        "RIP_ALLOWED_REPORT_ROOTS": "C:\\reports"
      }
    }
  }
}
```

`RIP_ALLOWED_REPORT_ROOTS` uses the operating system path delimiter and defaults to the server's working directory. Optional settings are `CRYSTAL_WORKER_ARGS` (a JSON array), `CRYSTAL_WORKER_STARTUP_TIMEOUT_MS`, `CRYSTAL_WORKER_TIMEOUT_MS`, `CRYSTAL_WORKER_SHUTDOWN_TIMEOUT_MS`, `RIP_MAX_REPORT_BYTES`, and `LOG_LEVEL`.

For repeatable production setups, install an exact package version and remove `--yes` from the `npx` invocation.

## Security boundary

Requests are restricted to canonical paths beneath the configured allowed roots, and report size is checked before dispatch. Keep the worker and SAP runtime on a trusted Windows host and grant access only to intended report directories.

## License

LGPL-3.0-only. The separate production worker remains under its own license.
