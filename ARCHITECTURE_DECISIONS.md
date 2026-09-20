# Architecture Decision Records

These decisions govern Crystal MCP v1. Older research recommendations remain useful background but are not binding when they conflict with an accepted decision below.

## ADR-001: Crystal MCP v1 is the active product milestone

**Status:** Accepted

**Decision:** Deliver a production-ready Crystal Reports MCP before building the generalized multi-engine platform.

**Rationale:** The user value can be proven by reading and understanding real `.rpt` files. General platform infrastructure does not validate that core capability.

**Consequences:** Universal Report IR, multi-engine conversion, visual design, cloud collaboration, and marketplace work are deferred.

## ADR-002: Node.js MCP host with a Windows Crystal worker

**Status:** Accepted

**Decision:** The MCP server and CLI use Node.js/TypeScript. SAP Crystal SDK operations run in a separate Windows worker.

**Rationale:** Node provides the desired npm and MCP experience, while supported Crystal APIs require the Windows runtime.

**Consequences:** The public host can be cross-platform, but live Crystal operations require a local or remote Windows execution environment.

## ADR-003: Stdio is the first worker transport

**Status:** Accepted

**Decision:** Complete and verify the local Node-to-worker path over newline-delimited JSON on stdio before implementing remote gRPC.

**Rationale:** The current worker and client already approximate this model. It minimizes deployment, certificate, networking, and service-management variables while proving the product path.

**Consequences:** stdout is reserved for protocol frames. Logs use stderr. The client interface must preserve a future transport boundary.

## ADR-004: Use a Crystal-shaped v1 report model

**Status:** Accepted

**Decision:** The v1 normalized model may mirror Crystal concepts but must not expose SAP SDK objects directly.

**Rationale:** A universal Report IR would introduce speculative abstraction before a second engine provides concrete interoperability requirements.

**Consequences:** Report IR design begins only after another engine is implemented or a real conversion requirement exists.

## ADR-005: Read-only extraction precedes editing

**Status:** Accepted

**Decision:** Stabilize and test report extraction before advertising editing or generation tools.

**Rationale:** Accurate read-back is required to verify mutations and prevent silent report corruption.

**Consequences:** Editing tools remain hidden or explicitly experimental until save-as, reopen, and read-after-write validation are implemented.

## ADR-006: Template-based generation precedes blank generation

**Status:** Accepted

**Decision:** Generate reports by selecting and safely modifying approved templates before attempting blank-canvas report creation.

**Rationale:** Templates preserve valid Crystal structure, branding, print behavior, and difficult layout details.

**Consequences:** A template catalog and validation pipeline are required for the generation milestone.

## ADR-007: Open-core source boundary

**Status:** Accepted, implemented

**Decision:** Public LGPL-3.0-only components include the MCP server, CLI, generic models, plugin API, public SDK, Crystal client SDK, and worker protocol. The production Crystal runtime adapter and Windows worker remain commercial.

**Rationale:** Developers need stable open contracts and integration clients without exposing the principal Crystal compatibility and editing implementation.

**Consequences:** Public and commercial implementations remain in separate repositories. The versioned worker protocol is the integration boundary, and every published public package carries its own LGPL-3.0-only notice. Separate applications may link to the public libraries under LGPL terms without adopting LGPL for the whole application.

## ADR-008: General plugin process orchestration is deferred

**Status:** Accepted

**Decision:** Keep plugin interfaces, but do not make a general plugin manager, per-service process isolation, crash supervisor, or marketplace prerequisites for Crystal MCP v1.

**Rationale:** These systems add substantial complexity without completing the first report-reading workflow.

**Consequences:** Add process isolation and discovery incrementally when multiple plugins or untrusted third-party execution make them necessary.

## ADR-009: Remote workers follow the local vertical slice

**Status:** Accepted

**Decision:** Add authenticated and encrypted remote Windows-worker operation only after local stdio is stable.

**Rationale:** Remote deployment introduces file transfer, identity, authorization, TLS, and service lifecycle decisions. Those should not obscure extraction correctness.

**Consequences:** Protocol types must remain transport-neutral, but gRPC implementation and worker farms are deferred.

## ADR-010: Read operations are path-restricted and secret-safe

**Status:** Accepted

**Decision:** Canonicalize report paths, enforce configured allowed roots, bound time and payload size, and redact credentials and sensitive connection values.

**Rationale:** An MCP tool that can inspect arbitrary files or return database secrets is unsafe for routine agent use.

**Consequences:** Input authorization and redaction are release requirements, not optional enterprise features.

## Deferred decisions

The following require evidence from later milestones:

- Remote file streaming versus controlled shared storage.
- gRPC authentication and certificate lifecycle.
- Windows child process versus service as the default deployment.
- Search engine and optional vector index.
- Plugin signing and marketplace governance.
- Universal Report IR structure and expression representation.
- Commercial license enforcement.
