# Crystal MCP v1 Tracker

## Legend

- `[x]` Done
- `[~]` In progress
- `[ ]` Planned
- `[!]` Blocked or requires an external environment

## Milestone 0: Planning alignment

- [x] Establish Crystal MCP v1 as the active objective.
- [x] Add the authoritative v1 delivery plan.
- [x] Replace the infrastructure-first implementation plan.
- [x] Replace the phase roadmap.
- [x] Document v1 non-goals.
- [x] Document the intended open-source/commercial boundary.

## Public release preparation

- [x] Physically separate public and commercial implementation code.
- [x] Verify package-level GPL notices and public npm tarball contents.

## Milestone 1: `read_report` vertical slice

### Contract

- [x] Add a worker protocol version.
- [x] Define ready, request, success, warning, error, and shutdown envelopes.
- [x] Define stable error codes.
- [x] Finalize the Crystal-shaped `Report` response schema.
- [x] Define redaction rules for connections, credentials, and errors.

### Worker client

- [x] Remove the hardcoded Debug worker path.
- [x] Read worker path and timeouts from configuration.
- [x] Start the worker and verify its ready/version message.
- [x] Correlate requests and responses.
- [x] Reject pending calls on timeout, malformed output, or worker exit.
- [x] Add graceful shutdown and forced cleanup.
- [x] Ensure diagnostic logs never contaminate stdout protocol frames.

### MCP integration

- [x] Initialize the worker client when the MCP server starts.
- [x] Validate `read_report` arguments.
- [x] Canonicalize paths and enforce allowed roots.
- [x] Call the worker's `read_report` command.
- [x] Validate the response schema.
- [x] Redact secrets.
- [x] Return structured MCP errors.
- [x] Dispose of the worker on shutdown.

### Verification

- [x] Add a mock worker executable or fixture process.
- [x] Add an MCP-to-mock-worker integration test.
- [x] Add an opt-in real-worker integration test with before/after SHA-256 verification.
- [~] Use `Orders10k.rpt` only for local real-worker testing; it is technically verified but unlicensed for redistribution and contains saved data. A sanitized replacement is planned.
- [~] SAP Crystal 13 assemblies are installed; the worker builds and its real ready/health/shutdown handshake passes. Confirm the host's licensing status before fixture testing.
- [x] Run all 10 advertised MCP read tools end to end against local-only `Orders10k.rpt`.
- [x] Verify the real fixture's SHA-256 before and after the MCP read, including failure paths.
- [x] Run all 10 tools and projection-consistency checks against local-only `HIS_ClaimOfCustomerSummary.rpt`; preserve its redacted JSON under ignored `test-results/`.

## Milestone 2: Read-only extraction

- [x] `read_metadata`
- [x] `read_data_sources`
- [x] `extract_sql`
- [x] `read_parameters`
- [x] `read_formulas`
- [x] `read_sections`
- [x] `read_objects`
- [x] `read_subreports`
- [x] `read_running_totals`
- [x] Explicit unsupported-feature warnings
- [x] Extract main-to-subreport link fields, including Crystal's linked parameter name.
- [x] Populate formula field/formula references and typed dependency identifiers.
- [x] Extract database table links and main-report custom functions.
- [x] Emit path-specific warnings where the installed SDK cannot expose embedded-subreport custom functions.
- [~] Golden JSON test covers the complete mock report and expected warnings; sanitized real-report matrix fixtures remain pending.

## Milestone 3: Intelligence layer

- [ ] Deterministic dependency graph
- [ ] Markdown documentation
- [ ] Search within one report
- [ ] Search configured report roots
- [ ] Incremental file index
- [ ] Representative AI question/answer acceptance tests

## Milestone 4: Setup and remote operation

- [ ] `rip doctor`
- [ ] Runtime and worker discovery
- [ ] Local installation documentation
- [ ] Optional Windows service mode
- [ ] Remote encrypted transport
- [ ] Remote authentication and authorization
- [ ] Cross-platform host verification

## Future milestones

- [ ] Safe save-as editing
- [ ] Read-after-write verification
- [ ] Template-based generation
- [ ] Second report-engine plugin
- [ ] Evidence-driven Report IR
- [ ] Cloud and enterprise platform

## Current next task

Build the deterministic dependency graph over the extracted formula, field, parameter, running-total, subreport-link, join, and custom-function metadata. Continue using the current reports for local integration testing only; when the planned sanitized report is available, approve and commit that replacement with its hash, expected warnings, and full redacted golden JSON.
