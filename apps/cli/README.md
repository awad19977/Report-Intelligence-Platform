# @report-intelligence/cli

Preview command-line interface for the Report Intelligence Platform.

> This package currently exposes the planned command surface, but the commands are not yet connected to a report worker. It is published as a preview and must not be relied on for production extraction.

## Install

```sh
npm install --global @report-intelligence/cli
rip --help
```

The read, formulas, parameters, SQL, search, documentation, validation, and export commands remain previews. `rip doctor`, `rip mcp`, and `rip agents install` are functional.

```sh
rip doctor --report C:\reports\example.rpt
rip mcp
rip agents install codex --reports C:\reports
```

`doctor` is also available as `rip doctor --json` for scripts. Without `--report`, it checks worker discovery and the protocol; opening a report is required to verify the SAP Crystal runtime. `rip mcp` starts the same stdio server as `@report-intelligence/mcp-server`.

`rip agents install` supports `codex`, `claude`, `cursor`, and `vscode`. Codex uses its MCP registration command. The other agents receive project configuration in `.mcp.json`, `.cursor/mcp.json`, or `.vscode/mcp.json` respectively. Existing unrelated servers are preserved. Run the command from the project where the coding agent will work; `--reports` sets the only directory the MCP server can read. The generated configuration starts the pinned npm MCP server and its optional Windows worker automatically.

## License

LGPL-3.0-only.
