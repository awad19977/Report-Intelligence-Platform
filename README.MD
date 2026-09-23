# Report Intelligence Platform (RIP)

An AI-native platform for understanding, analyzing, documenting, modifying, generating, and converting enterprise reporting systems.

## Current Focus: Crystal MCP v1

The active milestone is a production-ready, read-only Crystal Reports MCP. The immediate target is one verified end-to-end path:

```text
MCP client -> Node.js MCP server -> Windows Crystal worker -> real .rpt -> validated JSON
```

The universal Report IR, multi-engine runtime, generalized plugin process manager, cloud platform, and separately deployed core-service plugins are future work. They are not prerequisites for the v1 Crystal reader.

See [CRYSTAL_MCP_V1_PLAN.md](CRYSTAL_MCP_V1_PLAN.md) for the authoritative implementation plan. When older planning or research documents conflict with it, the v1 plan takes precedence.

## Architecture Overview

```
report-intelligence-platform/
├── apps/
│   ├── mcp-server/          # MCP Server (Node.js/TypeScript)
│   └── cli/                 # CLI Tool
├── packages/
│   ├── core/                # Core types, interfaces, utilities
│   ├── crystal-client/      # Public versioned worker protocol and stdio client
│   ├── grpc-transport/      # Experimental transport abstractions
│   ├── plugin-api/          # Plugin interface definitions
│   └── sdk/                 # SDK for building plugins
├── docs/                    # Public protocols and developer documentation
├── tests/                   # Public integration tests and fixture metadata
├── 00 Research/             # Research documentation
├── 01 Specifications/       # Technical specifications
├── 02 Architecture/         # Architecture decisions
├── 03 Notes/                # Development notes
└── 04 Images/               # Diagrams and images
```

## Quick Start

> **Milestone status:** The public MCP server implements all 10 advertised read tools and has been exercised locally through the separately licensed Crystal worker against multiple real reports. Mock integration coverage is committed; a sanitized, redistributable `.rpt` fixture is still required before the real-runtime acceptance matrix can run in public CI.

### Prerequisites

- Node.js 20+
- Windows x64 for local `.rpt` extraction
- SAP Crystal Reports Runtime compatible with that worker

### Installation

```bash
# Install dependencies
npm install

# Build all public packages
npm run build
```

The published MCP server installs the free-to-use binary-only Community Crystal worker as an optional dependency on Windows x64. The worker source remains in the private commercial repository, and SAP runtime components are not redistributed.

For a consumer installation, install `@report-intelligence/cli` globally, run `rip doctor --report C:\reports\example.rpt`, then run `rip agents install codex --reports C:\reports` (or choose `claude`, `cursor`, or `vscode`). The MCP server also exposes `report-intelligence-mcp doctor`. The worker npm release is unsigned; a separate Store MSIX distribution is prepared in `scripts/build-community-store-msix.ps1` and will be signed by Microsoft only after Store certification.

### Running the MCP Server

```bash
# Start the MCP server
npm run start --workspace=apps/mcp-server
```

`CRYSTAL_WORKER_PATH` is optional and overrides discovery when selecting a Pro, custom, or separately installed worker.

### Crystal Worker Community

`@report-intelligence/crystal-worker-community-win32-x64` contains the compiled read-only Community worker and its non-SAP managed dependencies. It is free to use under its included proprietary binary license, but it is not open-source or LGPL-covered. Package contents carry a SHA-256 manifest and deliberately exclude SAP `CrystalDecisions.*` assemblies.

The MCP server prefers an installed Pro worker when available, then a Store-installed Community worker, and finally the npm Community worker. The future Pro edition will add advanced editing, generation, validation, migration, and supported enterprise deployment capabilities without changing the public worker protocol.

### Using the CLI

`rip doctor`, `rip mcp`, and `rip agents install` are implemented. The report reading, search, documentation, validation, and export CLI commands below remain placeholders; use the MCP server for report extraction.

```bash
# Read a report
npx rip read report.rpt

# List formulas
npx rip formulas report.rpt

# List parameters
npx rip parameters report.rpt

# Extract SQL
npx rip sql report.rpt

# Generate documentation
npx rip document report.rpt -f markdown -o docs.md

# Validate a report
npx rip validate report.rpt

# Export to PDF
npx rip export report.rpt output.pdf -f pdf
```

## Delivery Roadmap

- **Milestone 0**: Align v1 scope, licensing boundary, and documentation
- **Milestone 1**: Wire `read_report` end to end through the real worker
- **Milestone 2**: Complete and verify read-only Crystal extraction
- **Milestone 3**: Documentation, dependency analysis, and deterministic search
- **Milestone 4**: Setup diagnostics and optional remote Windows workers
- **Milestone 5**: Safe editing with save-as and read-after-write verification
- **Milestone 6**: Template-based report generation
- **Milestone 7**: Multi-engine support and evidence-driven Report IR

## Licensing

This project follows an **Open Core** model:

- **Public Platform**: GNU Lesser General Public License v3.0 only (`LGPL-3.0-only`)
- **Crystal Reports Plugin**: Commercial (proprietary)
- **Enterprise Features**: Commercial (proprietary)

See [LICENSING.md](LICENSING.md) for the implemented public/commercial source boundary.

Each published workspace has its own npm-facing README and metadata. Maintainers should follow the [npm publishing guide](docs/npm-publishing.md) for the first release and subsequent OIDC/provenance releases.

## MCP Tools

The MCP server currently advertises these tested tools:

### Available
- `read_report` - Read full report structure
- `read_metadata` - Read validated report metadata and page settings
- `read_data_sources` - Read validated data sources, tables, fields, joins, and commands
- `extract_sql` - Extract non-empty SQL commands with their data source identity
- `read_parameters` - Read validated parameter definitions with sensitive values redacted
- `read_formulas` - Read validated formulas and dependency references
- `read_sections` - Read validated section layout settings and contained objects
- `read_objects` - Read flattened validated objects with optional exact section filtering
- `read_subreports` - Read validated subreports, embedded metadata/content, and main-to-subreport link fields
- `read_running_totals` - Read validated running-total evaluation and reset definitions

Successful tool calls return extracted data in the first text content item. When the worker reports incomplete or unsupported extraction, a second JSON text item contains structured `warnings` with stable codes, messages, and optional report-element paths.

Formula dependencies are classified as fields, formulas, parameters, running totals, or SQL expressions. Database table links and report custom functions are included in the full report model; SDK limitations are surfaced with `UNSUPPORTED_DATABASE_JOINS`, `UNSUPPORTED_SUBREPORT_LINKS`, or `UNSUPPORTED_CUSTOM_FUNCTIONS` warnings.

The following capabilities are planned and will be advertised only after their worker-backed implementations meet the same validation and error-handling standard:

### Planned read operations

### Search Operations
- `search_reports` - Search across multiple reports
- `search_in_report` - Search within a single report

### Documentation
- `generate_documentation` - Generate docs (markdown/html/openapi)

### Validation
- `validate_report` - Validate report integrity
- `check_integrity` - Check file integrity

### Export
- `export_report` - Export to PDF, Excel, Word, etc.

### Modification (future safe-editing milestone)
- `update_parameter` - Update parameter values
- `update_formula` - Update formula syntax
- `update_formatting` - Update object formatting
- `update_text` - Update text objects
- `save_report` - Save report to new file

### Generation (future template-generation milestone)
- `generate_report` - Generate from specification
- `generate_from_template` - Generate from template
- `generate_from_natural_language` - Generate from prompt

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Run strict type checking: `npm run typecheck`
6. Submit a PR

## Project Structure Details

### Core Package (@report-intelligence/core)

Contains all shared types and utilities:
- Report, Formula, Parameter, Section, DataSource types
- Search, Validation, Documentation types
- Zod schemas for validation

### Plugin API (@report-intelligence/plugin-api)

Defines the plugin interface:
- `Plugin` interface with capabilities
- Reader, Writer, Generator, Renderer interfaces
- Validator, Exporter, Searcher, Documenter interfaces
- Dependency Analyzer, Modifier interfaces

### Crystal Client and Worker Editions

The public Crystal client contains shared models, the worker protocol, transport clients, test doubles, and developer helpers. Community and Pro SAP Crystal runtime adapter source is maintained in the separate commercial repository. The compiled Community worker is distributed through npm under its own free-to-use binary license.

### MCP Server (@report-intelligence/mcp-server)

Model Context Protocol server:
- Exposes tools to AI agents
- Manages plugin lifecycle
- Handles resource/prompt requests

### Crystal Workers (C# .NET, proprietary implementations)

Windows worker process:
- Hosts SAP Crystal Reports Runtime
- Executes Crystal SDK operations
- Communicates through the versioned worker protocol, using stdio first
- Offers read-only extraction in Community and future advanced capabilities in Pro

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CRYSTAL_WORKER_PATH` | Optional override path to a Community, Pro, or custom CrystalWorker executable | No |
| `CRYSTAL_WORKER_ARGS` | JSON array of worker process arguments | No |
| `CRYSTAL_WORKER_TIMEOUT_MS` | Per-request worker timeout in milliseconds | No |
| `RIP_ALLOWED_REPORT_ROOTS` | OS-delimited roots from which `.rpt` files may be read | No |
| `RIP_MAX_REPORT_BYTES` | Maximum accepted `.rpt` file size in bytes | No |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | No |

See [the worker protocol v1 specification](docs/worker-protocol-v1.md) for the stdio contract.

## Research Documentation

The `00 Research/` directory contains comprehensive research on:
- Crystal Reports architecture, objects, formulas, rendering
- MCP protocol architecture and implementation
- Language Server Protocol patterns
- Plugin architecture comparisons (VS Code, Terraform, Eclipse, MCP)
- Reporting engine comparisons (8 engines)
- Universal reporting concepts

## License

All project-owned source in this repository is licensed under LGPL-3.0-only. The LGPL terms are in [LICENSE](LICENSE), with the incorporated GPLv3 terms in [COPYING](COPYING). Separate applications may use the public libraries under LGPL's linking terms without placing the entire application under LGPL. The Crystal runtime adapter and Windows worker are separate processes distributed under commercial terms; see [LICENSING.md](LICENSING.md).
