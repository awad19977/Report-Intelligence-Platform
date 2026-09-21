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
- A separately licensed commercial Crystal worker on Windows for real `.rpt` access
- SAP Crystal Reports Runtime compatible with that worker

### Installation

```bash
# Install dependencies
npm install

# Build all public packages
npm run build
```

The production Crystal worker is not included in this public repository. Obtain and build it from the separate commercial distribution, then point the MCP server at its executable.

### Running the MCP Server

```bash
# Set environment variables
export CRYSTAL_WORKER_PATH="C:/Program Files/Report Intelligence/CrystalWorker/CrystalWorker.exe"

# Start the MCP server
npm run start --workspace=apps/mcp-server
```

### Using the CLI (planned)

The CLI surface below is the intended interface. Its command handlers remain placeholders and are not part of the current public release candidate.

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

### Crystal Client and Commercial Adapter

The public Crystal client contains shared models, the worker protocol, transport clients, test doubles, and developer helpers. The production SAP Crystal runtime adapter and Windows worker are maintained in the separate commercial repository.

### MCP Server (@report-intelligence/mcp-server)

Model Context Protocol server:
- Exposes tools to AI agents
- Manages plugin lifecycle
- Handles resource/prompt requests

### Crystal Worker (C# .NET, commercial implementation)

Windows worker process:
- Hosts SAP Crystal Reports Runtime
- Executes Crystal SDK operations
- Communicates through the versioned worker protocol, using stdio first

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CRYSTAL_WORKER_PATH` | Path to CrystalWorker executable | Yes |
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
