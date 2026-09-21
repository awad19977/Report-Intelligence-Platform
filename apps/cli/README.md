# @report-intelligence/cli

Preview command-line interface for the Report Intelligence Platform.

> This package currently exposes the planned command surface, but the commands are not yet connected to a report worker. It is published as a preview and must not be relied on for production extraction.

## Install

```sh
npm install --global @report-intelligence/cli
rip --help
```

The preview includes command placeholders for reading, formulas, parameters, SQL, search, documentation, validation, export, and MCP startup. Use `@report-intelligence/mcp-server` with a compatible Crystal worker for the implemented read-only inspection path.

## License

LGPL-3.0-only.
