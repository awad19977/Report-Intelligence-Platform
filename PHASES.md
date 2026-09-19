# Delivery Milestones

This roadmap implements the active Crystal MCP v1 plan. Detailed acceptance criteria are in [CRYSTAL_MCP_V1_PLAN.md](CRYSTAL_MCP_V1_PLAN.md).

## Milestone 0: Planning alignment

Status: Complete

- Establish Crystal MCP v1 as the active objective.
- Document the open-source/commercial boundary.
- Make stdio the first local worker transport.
- Defer the universal Report IR and generalized platform infrastructure.
- Replace stale planning and tracking documents.

## Milestone 1: `read_report` vertical slice

Status: In progress — mock-worker path complete; licensed Crystal runtime verification pending

- Version the Node-to-worker protocol.
- Make the worker path configurable.
- Start and supervise the worker from Node.
- Validate allowed paths and tool inputs.
- Connect the MCP `read_report` handler to the worker.
- Validate and redact the returned report model.
- Map runtime, file, timeout, and worker errors.
- Add a mock-worker end-to-end test.
- Verify one real `.rpt` on a licensed Windows environment.

Definition of done: an external MCP client reads a real report and receives validated JSON without manually starting the worker.

## Milestone 2: Complete read-only extraction

Status: Planned

- Metadata and page settings.
- Data sources, tables, fields, joins, commands, and SQL.
- Parameters and formulas.
- Sections, groups, sorts, and selection formulas.
- Report objects, geometry, and supported formatting.
- Subreports and links.
- Summaries and running totals.
- Explicit warnings for unsupported or incomplete mappings.
- Golden JSON fixtures for representative report categories.

Definition of done: the supported extraction surface is accurate, stable, secret-safe, and regression-tested.

## Milestone 3: Intelligence layer

Status: Planned

- Dependency graph.
- Markdown documentation.
- In-report search.
- Multi-report deterministic search and incremental indexing.
- AI workflows for explaining report purpose, data lineage, parameters, and formulas.

Definition of done: an agent can answer representative business and maintenance questions using MCP outputs.

## Milestone 4: Setup and remote workers

Status: Planned

- `rip doctor` diagnostics.
- Crystal runtime and worker discovery.
- Local installation guidance or automation.
- Optional Windows service mode.
- Authenticated remote Windows worker transport.
- Linux/macOS host verification against the remote worker.

Definition of done: local Windows and remote cross-platform deployments use the same MCP contracts.

## Milestone 5: Safe editing

Status: Future

- Save-as by default.
- Formula updates.
- Parameter updates.
- Text-object updates.
- Narrow formatting updates.
- Reopen and read-after-write comparison.
- Recovery and backup behavior.

Definition of done: supported edits produce reopenable reports, preserve the source by default, and contain no unintended structural changes.

## Milestone 6: Template-based generation

Status: Future

- Approved template catalog.
- Crystal-oriented generation specification.
- Template binding and controlled modification.
- Reopen, validate, and render preview.
- Optional vision-assisted layout feedback.

Definition of done: an agent can generate useful reports from approved templates reproducibly.

## Milestone 7: Multi-engine platform

Status: Deferred

- Add a second report engine.
- Compare real common concepts and incompatibilities.
- Design a versioned Report IR from observed needs.
- Generalize plugin isolation, process management, and conversion workflows where evidence justifies them.

Definition of done: the second engine works without coupling the core to either vendor, and the shared model is based on tested interoperability requirements.
