# Crystal MCP v1 Delivery Plan

## Status and authority

This document is the authoritative implementation plan for the current milestone.

The broader Report Intelligence Platform remains the long-term product vision, but the active objective is narrower: deliver a production-ready Crystal Reports MCP that can read real `.rpt` files through the supported SAP Crystal Reports runtime.

When another planning document conflicts with this plan, this document takes precedence. Files under `00 Research/` are research inputs, not approved implementation requirements.

## Product objective

Crystal MCP v1 enables an AI agent to treat a Crystal Report as structured knowledge instead of an opaque binary file.

The first release must let an MCP client:

- Open a real `.rpt` file through the SAP Crystal Reports runtime.
- Extract report metadata, SQL, data sources, parameters, formulas, sections, objects, formatting, subreports, groups, and running totals.
- Identify useful dependencies between formulas, fields, parameters, tables, and subreports.
- Return stable, validated, machine-readable JSON.
- Generate accurate human-readable documentation.
- Search a controlled collection of reports.
- Fail safely and explain missing runtimes, invalid files, timeouts, and unsupported features.

## Guiding principles

1. **Prove one real vertical slice first.** The next milestone is a working `read_report` call from an MCP client to a real `.rpt` file.
2. **Crystal-first, contract-aware.** The v1 report model may mirror Crystal concepts. It must remain cleanly separated from SAP SDK types, but it does not need to be a universal Report IR.
3. **Use supported runtime APIs.** Do not reverse-engineer the proprietary `.rpt` binary format.
4. **Keep the public product cross-platform.** The Node.js MCP server, CLI, contracts, and client SDK should run on Windows, Linux, and macOS. Direct Crystal operations require a Windows worker, local or remote.
5. **Start with the simplest reliable transport.** Use stdio for the first local Windows implementation. Add remote gRPC only after the local path is proven.
6. **Read-only before mutation.** Editing begins only after extraction is accurate and covered by real-report tests.
7. **Never corrupt the source report.** Future editing must clone or save to a new path by default and verify the resulting file can be reopened.
8. **Expose meaningful capabilities through MCP.** The MCP surface is the product interface; internal infrastructure should serve it rather than become the milestone.

## Version 1 non-goals

Do not implement these as prerequisites for the Crystal read-only release:

- Universal Report Intermediate Representation.
- Multi-engine report conversion.
- Visual report designer.
- Cloud SaaS platform.
- Multi-user collaboration.
- Plugin marketplace.
- Eleven separately deployed core-service plugins.
- General-purpose plugin process orchestration.
- Worker farms, service discovery, or automatic horizontal scaling.
- Vector search or embeddings before deterministic metadata search works.
- Blank-canvas AI report generation.
- Enterprise authentication, billing, or licensing enforcement.

These remain possible later milestones, not deleted ideas.

## Target architecture for the first release

```text
AI agent / MCP client
          |
          | MCP over stdio
          v
Node.js / TypeScript MCP server
          |
          | typed Crystal client contract
          v
Windows Crystal worker process
          |
          | SAP Crystal Reports SDK
          v
       .rpt files
```

### Node.js MCP server

Responsibilities:

- Publish MCP tools and their JSON schemas.
- Validate and normalize tool arguments.
- Enforce allowed report roots and file limits.
- Start, monitor, and stop the local worker when local mode is selected.
- Translate worker failures into stable MCP errors.
- Keep protocol output on stdout clean; diagnostics belong on stderr.
- Redact secrets from returned connection information and logs.

### Crystal client SDK

The public-facing Crystal client layer owns:

- Shared request and response types.
- Worker command names and protocol versioning.
- stdio request correlation, timeouts, cancellation, and process health.
- Future remote transport abstraction.
- Test doubles for development without the SAP runtime.

It must not contain the proprietary Crystal SDK implementation.

### Windows Crystal worker

Responsibilities:

- Load and close reports safely.
- Execute SAP Crystal SDK calls.
- Map SDK objects into the stable public response model.
- Serialize exactly one protocol response for each request.
- Limit concurrency because Crystal runtime objects are not assumed to be thread-safe.
- Release report handles even after errors.
- Never write a report during read-only operations.

The worker targets .NET Framework 4.8 because SAP Crystal Reports for Visual Studio depends on the classic .NET Framework runtime and does not support modern .NET/.NET Core for this SDK path.

## Open-core boundary

### Public GPL-3.0-only components

- MCP server.
- CLI.
- Core models and validation schemas.
- Plugin API and public SDK.
- Crystal client SDK and worker protocol.
- Transport abstractions and mock worker.
- Documentation, examples, scaffolding, and development tools.
- Generic logging, configuration, validation, documentation, and search utilities.

### Commercial components

- SAP Crystal runtime integration.
- The production Windows Crystal worker implementation.
- Proprietary `.rpt` read/write mappings and compatibility knowledge.
- Advanced formula analysis and compilation.
- Editing, generation, optimization, and advanced validation.
- Enterprise features and commercial report-engine plugins.

The boundary is physically separated: this workspace contains the GPL-3.0-only public platform, while the production Crystal runtime adapter and Windows worker are maintained in the private commercial repository. Public packages communicate with that worker through the versioned protocol and configured executable path.

## MCP v1 capability set

### Milestone-required tools

- `read_report`
- `read_metadata`
- `read_data_sources`
- `extract_sql`
- `read_parameters`
- `read_formulas`
- `read_sections`
- `read_objects`
- `read_subreports`
- `read_running_totals`

### Tools after extraction is stable

- `analyze_dependencies`
- `search_in_report`
- `search_reports`
- `generate_documentation`
- `validate_report`
- `check_integrity`
- `export_report`

Editing and generation tools may remain outside the advertised MCP tool list until their implementations and safety tests exist.

## Stable error model

Every tool failure should use a predictable error code and a safe message. Initial codes:

- `RUNTIME_NOT_FOUND`
- `WORKER_START_FAILED`
- `WORKER_DISCONNECTED`
- `WORKER_TIMEOUT`
- `FILE_NOT_FOUND`
- `FILE_OUTSIDE_ALLOWED_ROOTS`
- `UNSUPPORTED_FILE`
- `REPORT_OPEN_FAILED`
- `REPORT_PASSWORD_REQUIRED`
- `REPORT_CORRUPT`
- `UNSUPPORTED_FEATURE`
- `INVALID_ARGUMENT`
- `INTERNAL_ERROR`

Errors must not expose passwords, complete connection strings, sensitive environment variables, or internal stack traces to MCP clients by default.

## Delivery milestones

### Milestone 0: Align scope and boundaries

Deliverables:

- This authoritative v1 plan.
- Updated README, phase plan, tracker, ADRs, and licensing document.
- A documented public/commercial package boundary.
- A decision that stdio is the first transport and gRPC is deferred.

Exit criteria:

- A new contributor can identify the current objective, non-goals, and next implementation task without reading the research archive.

### Milestone 1: One working `read_report` vertical slice

Deliverables:

- The MCP server constructs a real Crystal worker client.
- `read_report` validates its input and invokes the worker.
- The worker opens a real report and returns structured JSON.
- The MCP server returns that result instead of the current placeholder error.
- Worker lifecycle, timeout, and error mapping are implemented.

Exit criteria:

- A supported MCP client can call `read_report` successfully without manually invoking the worker.
- The test report is unchanged after the operation.
- Logs do not corrupt the MCP or worker stdout protocols.

### Milestone 2: Complete read-only extraction

Deliverables:

- Remaining read tools are wired through the same client.
- The response model is validated at the process boundary.
- Sensitive connection fields are redacted.
- Report handles and worker resources are reliably released.

Required report fixtures:

- Simple table report.
- Formula and parameter report.
- Groups and running totals.
- Subreports and linked parameters.
- Stored procedure or command-based data source.
- Conditional formatting and suppressed sections.
- Report containing saved data.

Exit criteria:

- Golden JSON fixtures demonstrate stable output for every supported report category.
- Unsupported features produce explicit warnings instead of silent data loss.

### Milestone 3: Documentation, dependency analysis, and search

Deliverables:

- Deterministic dependency graph over extracted metadata.
- Markdown documentation generated from the normalized model.
- File and metadata search over configured report roots.
- Incremental indexing based on file identity and modification time.

Exit criteria:

- AI agents can answer representative questions using MCP results, including table usage, parameter inventory, formula references, and report purpose.

### Milestone 4: Setup and remote operation

Deliverables:

- `rip doctor` verifies Node, OS, worker, SAP runtime, paths, and permissions.
- Local worker installation and lifecycle documentation.
- Optional Windows service mode.
- Remote Windows worker transport, authenticated and encrypted.
- Clear configuration priority: defaults, file, environment, CLI.

Exit criteria:

- Windows can run locally through stdio.
- Linux and macOS can use a separately configured Windows worker without changing MCP tool contracts.

### Milestone 5: Safe editing

Start with narrow, testable operations:

- Update formula text.
- Update parameter definitions.
- Update text objects.
- Update selected formatting properties.
- Save to a new report path.

Exit criteria:

- The original file is preserved by default.
- The edited report reopens successfully.
- A read-after-write comparison proves the intended change and detects unintended structural changes.

### Milestone 6: Template-based generation

Deliverables:

- Approved `.rpt` templates.
- A Crystal-oriented generation specification.
- Template selection, binding, modification, rendering, and validation.
- Optional PDF/image feedback for later vision-assisted layout refinement.

Blank-report generation is not a prerequisite.

### Milestone 7: Multi-engine platform

Only after Crystal workflows are proven:

- Add another report-engine plugin.
- Identify the concepts genuinely shared across both engines.
- Design a versioned Report IR from observed conversion requirements.
- Add generalized plugin process management only where isolation or deployment needs justify it.

## Test strategy

### Unit tests

- Argument validation and path authorization.
- Worker message framing and correlation.
- Timeout, disconnect, and malformed-response behavior.
- Schema validation and redaction.
- Dependency analysis and documentation output.

### Integration tests

- Node client to test worker over stdio.
- Node client to real Crystal worker on a configured Windows test host.
- MCP client to MCP server to worker.

### Golden report tests

For each sanitized `.rpt` fixture, retain:

- File hash and fixture description.
- Expected normalized JSON.
- Expected warnings.
- Generated Markdown documentation.
- Optional render used for visual comparison.

A missing Crystal runtime or unavailable fixture environment is a validation gap, not a passing test.

## Current implementation backlog

The versioned worker protocol, canonical `Report` response schema, configurable worker lifecycle, `read_report` MCP integration, path authorization, error mapping, and mock-worker integration tests are complete.

Next, in order:

1. Select and document the first sanitized `.rpt` fixture.
2. Confirm the Windows test host's Crystal licensing status.
3. Run the opt-in real-worker test and verify identical before/after file hashes.
4. Add the required Milestone 2 fixture matrix and golden JSON outputs.
5. Expand one read-only capability at a time through the proven protocol path.

## Questions that do not block Milestone 1

These should remain open until evidence requires a decision:

- Which remote transport and authentication model should be used?
- Should the remote worker receive report bytes or access a controlled shared path?
- When is a Windows service preferable to a child process?
- Which search engine is needed after deterministic search is measured?
- Which second report engine should drive the first Report IR design?
- How should commercial licensing be technically enforced?

None of these questions should delay a local, read-only `read_report` vertical slice.
