# Report Intelligence Platform - Implementation Plan

## Active objective

Deliver Crystal MCP v1: a production-ready MCP server that lets AI agents read and understand real SAP Crystal Reports.

The authoritative detailed plan is [CRYSTAL_MCP_V1_PLAN.md](CRYSTAL_MCP_V1_PLAN.md). This file provides the implementation order and current-state summary.

## Scope correction

Earlier plans made generalized plugin orchestration, gRPC everywhere, numerous core-service processes, and a universal Report IR prerequisites for the first release. They are no longer on the critical path.

Version 1 is Crystal-first:

```text
MCP client
    -> Node.js/TypeScript MCP server
    -> typed worker client
    -> Windows Crystal worker
    -> SAP Crystal Reports runtime
    -> .rpt
```

Use stdio locally first. Preserve a transport boundary so remote gRPC can be added later without changing MCP tools.

## Current implementation state

### Available foundations

- TypeScript report models and validation schemas.
- Plugin capability interfaces.
- A public Crystal client with a versioned stdio protocol and test doubles.
- A separately maintained commercial C# worker.
- MCP tool descriptions.
- Initial protocol-buffer and gRPC transport experiments.

### Remaining product gaps

- The MCP `read_report` path is implemented; the remaining read-only tools are not yet wired.
- The CLI commands are placeholders.
- Worker startup is configurable; automatic runtime discovery remains planned.
- Mock-worker tests exist, but there is no sanitized real-report fixture yet.
- Public and commercial source boundaries are physically separated.
- `core-service.proto` contains duplicate service/message declarations and is not a v1 dependency.

## Implementation order

### 1. Protocol contract

Define and test:

- Protocol version.
- Request ID, command, arguments, and timeout.
- Success response, warnings, and structured errors.
- Process-ready and health messages.
- Cancellation and shutdown behavior.
- Maximum payload and report limits.

Use newline-delimited JSON over stdio for the first implementation. Both processes must reserve stdout for protocol frames.

### 2. Crystal v1 model

Define a Crystal-oriented response model separated from SAP SDK classes. It should cover:

- File identity and report metadata.
- Page and print settings.
- Data sources, commands, tables, fields, joins, and links.
- Parameters and default/current-value metadata without exposing secrets.
- Formulas and identifiable references.
- Sections, groups, sorting, and selection formulas.
- Report objects, geometry, and supported formatting.
- Subreports and link fields.
- Summaries and running totals.
- Warnings for information that cannot be read reliably.

Do not design a vendor-neutral Report IR during this step.

### 3. Worker client lifecycle

Implement a public client that:

- Accepts a configured worker path.
- Starts the worker as a child process.
- Waits for a versioned ready message.
- Correlates concurrent requests by ID.
- Implements timeouts and cancellation.
- Detects malformed output and worker exits.
- Rejects pending requests when the worker dies.
- Performs graceful shutdown and forced cleanup when necessary.

### 4. `read_report` vertical slice

Replace the MCP server's placeholder handler for `read_report` with:

1. Input schema validation.
2. Canonical-path and allowed-root validation.
3. Worker availability check.
4. Worker request with a bounded timeout.
5. Response-schema validation.
6. Error mapping and secret redaction.
7. MCP result serialization.

This is the first product milestone. Do not expand infrastructure until this path works with a real report.

### 5. Read-only tool expansion

Reuse the same path for:

- `read_metadata`
- `read_data_sources`
- `extract_sql`
- `read_parameters`
- `read_formulas`
- `read_sections`
- `read_objects`
- `read_subreports`
- `read_running_totals`

Avoid separate implementations that can drift from the full `read_report` model.

### 6. Tests and fixtures

Add three layers:

- Unit tests for validation, redaction, framing, timeouts, and mapping.
- Mock-worker integration tests available on every development platform.
- Licensed Windows integration tests using sanitized `.rpt` fixtures.

The minimum real-report matrix is defined in `CRYSTAL_MCP_V1_PLAN.md`.

### 7. Documentation and search

Generate documentation and dependency graphs from normalized extracted data, not by reopening reports independently.

Begin with deterministic file and metadata search. Add SQLite FTS only when scale requires it. Embeddings remain optional.

### 8. Installation and remote operation

After local stdio is stable:

- Add `rip doctor` and runtime detection.
- Document or automate local worker installation.
- Add optional Windows service mode.
- Add authenticated remote Windows worker transport.
- Preserve identical MCP schemas in local and remote modes.

### 9. Editing

Editing must be opt-in and safe:

- Default to save-as.
- Create backups where appropriate.
- Reopen the output after saving.
- Compare before and after extraction.
- Reject unsupported edits before changing the report.

Start with formula, parameter, text, and narrow formatting updates.

### 10. Template-based generation

Use tested templates before attempting blank-report design. A generation workflow should:

1. Select an approved template.
2. Apply a Crystal-oriented specification.
3. Save to a new file.
4. Reopen and validate.
5. Render a preview.
6. Optionally use vision feedback to refine later versions.

## Deferred platform work

The following work begins only when a proven product need appears:

- General plugin process manager.
- Separately deployed core-service plugins.
- Automatic worker pools and service discovery.
- Universal Report IR and expression AST.
- Multi-engine conversion.
- Visual designer.
- Cloud collaboration platform.
- Marketplace.

## Release gates

Crystal MCP v1 is not complete until:

- An external MCP client can successfully call `read_report`.
- The result is validated against real reports.
- Read operations leave source files unchanged.
- Secrets are redacted.
- Worker failures and timeouts are recoverable.
- Setup failures are understandable.
- Tests clearly distinguish unverified Crystal-runtime coverage from passing validation.

## Next implementation task

Select a sanitized `.rpt` fixture and run the opt-in real-worker `read_report` test with before/after SHA-256 verification, then begin Milestone 2 extraction one capability at a time.
