For the ideal reporting platform, plugins should declare their capabilities **declaratively** through a static manifest file (e.g., `plugin.json`). Separating declarative metadata from the imperative runtime code allows the host to discover capabilities, render menus, and validate configurations eagerly on startup without running third-party code.

Below is the architectural specification of how plugins should declare capabilities, followed by the protocol design for **Capability Negotiation**.

---

### 1. Declaring Capabilities: The Manifest Contract

The plugin manifest specifies a map of **Contribution Points**. Each capability is parameterized using standard **JSON Schema** to define input/output structures, allowing the core platform to validate data shapes on the wire before calling the plugin.

Here is an example structure of a declarative `plugin.json` for our reporting platform:

```json
{
  "name": "enterprise-reporting-pack",
  "version": "2.4.0",
  "engines": {
    "reporting-core": ">=3.1.0"
  },
  "contributes": {
    "capabilities": {
      "read": [
        {
          "id": "read.postgres-warehouse",
          "displayName": "PostgreSQL Data Warehouse",
          "when": "workspaceTrust == true",
          "connectionSchema": {
            "type": "object",
            "required": ["host", "port", "database"],
            "properties": {
              "host": { "type": "string" },
              "port": { "type": "integer", "default": 5432 },
              "database": { "type": "string" }
            }
          }
        }
      ],
      "write": [
        {
          "id": "write.s3-archiver",
          "displayName": "AWS S3 Cold Storage Archive",
          "when": "hasNetworkAccess == true",
          "inputSchema": {
            "type": "object",
            "required": ["bucket", "region"],
            "properties": {
              "bucket": { "type": "string" },
              "region": { "type": "string", "default": "us-east-1" }
            }
          }
        }
      ],
      "generate": [
        {
          "id": "generate.executive-summary",
          "displayName": "AI Executive Summary Generator",
          "modelDescription": "Synthesizes multi-page metrics into high-level summaries",
          "inputSchema": {
            "type": "object",
            "properties": {
              "includeMetrics": { "type": "boolean", "default": true }
            }
          }
        }
      ],
      "render": [
        {
          "id": "render.bento-grid",
          "displayName": "Interactive Bento Metric Grid",
          "supportsInteractiveCallbacks": true,
          "layoutConstraints": {
            "minWidth": 4,
            "minHeight": 3
          }
        }
      ],
      "validate": [
        {
          "id": "validate.compliance-auditor",
          "displayName": "SEC Data Compliance Validator",
          "targetFormats": ["json", "csv"]
        }
      ],
      "convert": [
        {
          "id": "convert.json-to-pdf",
          "displayName": "High-Fidelity PDF Exporter",
          "fromMime": "application/json",
          "toMime": "application/pdf"
        }
      ],
      "preview": [
        {
          "id": "preview.financial-forecast",
          "displayName": "Rolling Financial Forecast Preview",
          "viewType": "interactiveChart"
        }
      ]
    }
  }
}
```

#### Breakdowns of Declared Capabilities:
*   **Read**: Defines data-source adapters. It specifies a `connectionSchema` to parameterize connection strings.
*   **Write**: Exposes endpoints for data archival or export sinks.
*   **Generate**: Orchestrates analytical report generators (e.g., AI aggregators or parameterized text builders) with precise inputs.
*   **Render**: Declares custom visual layout behaviors. It specifies interface dimensions and event support without risking direct DOM access (relying on secure, sandbox-isolated views instead).
*   **Validate**: Declares rulesets or structural validation schemas for auditing report outputs.
*   **Convert**: Maps a static type-conversion boundary, specifying expected source and target mime-types.
*   **Preview**: Declares custom view containers to render non-interactive layout drafts or previews before printing/saving.

---

### 2. How Capability Negotiation Works

To achieve low-latency execution and ensure system stability, the platform executes a **phased handshake protocol** to resolve, authorize, and run plugin tasks. This pipeline utilizes **asynchronous, structured message passing** (JSON-RPC) over isolated boundaries.

```
 ┌───────────────────────┐            ┌────────────────────────┐
 │      Core Host        │            │   Isolated Plugin Host │
 └──────────┬────────────┘            └───────────┬────────────┘
            │                                     │
            │ 1. Boot: Eagerly reads manifests    │
            ├─────────────────────────────────────┤ (Inactive / Dormant)
            │                                     │
            │ 2. Evaluate context keys            │
            ├─────────────────────────────────────┤ (e.g., workspaceTrust)
            │                                     │
            │ 3. Match Selector / Trigger         │
            ├─────────────────────────────────────┤ (e.g., file opened)
            │                                     │
            │ 4. Initialize & Handshake RPC       │
            ├────────────────────────────────────>│ (Lazy activation)
            │                                     │
            │ 5. Multi-Level Permission Audit     │
            │<────────────────────────────────────┤ (P : O x C -> RESOLVED)
            │                                     │
            │ 6. Process Stream & Coalesce        │
            │<────────────────────────────────────┤ (JSON-RPC Event Bus)
```

#### Step A: Static Discovery & Lazy Registration
During the bootstrap phase, the platform's core registry parses the `plugin.json` folders. The registry maps every capability ID to its declared activation events and when-clauses. **No plugin process is spawned, and no third-party code is loaded into memory yet**. This keeps host startup fast and predictable.

#### Step B: Context Keys and Selector Filtering
The platform matches requested actions to plugins using a **Document Selector pattern** or **Context Keys**. 
*   *Example*: If a user tries to render a Postgres report, the core filters the registered `read` capability metadata. It checks if `"postgres"` matches the schema driver context and if constraints like `workspaceTrust == true` are satisfied.

#### Step C: Lazy Initialization & Handshake
Once a valid plugin matches the active context, the host spawns the isolated plugin runtime and executes a handshake.
1.  The host initiates a bidirectional RPC channel (via standard input/output MessagePorts or WebSocket transport).
2.  The host transmits an `initialize` request containing active configurations and environment settings.
3.  The plugin replies with its current schema version and runtime targets. If the host API version is incompatible with the plugin engine constraints, the connection is gracefully closed.

#### Step D: Multi-Layer Security & Permission Negotiation
Before invoking any capability, the host evaluates the requested operation against a strict **Four-Layer Permission System** (similar to Sema Core's L1–L4 permission boundaries):
*   **L1 (File Read/Write)**: Accessing system file templates.
*   **L2 (System Execution)**: Running compilers, command binaries, or system tasks.
*   **L3 (Internal Actions)**: Calling internal utilities or core services.
*   **L4 (External Bridges)**: Making HTTP / gRPC calls to third-party APIs or remote servers.

The system executes a decision function $P(O, C)$ evaluating the operation ($O$) under the current session context ($C$). If the operation has side effects (e.g., an L2 system export), the host core suspends the plugin's execution thread and fires an **Asynchronous Approval Request**. The user is prompted inside the UI shell. Upon approval, the host releases the execution lock and transmits the authorization token down to the sandbox.

#### Step E: Payload Marshaling and Stream Execution
Because raw objects cannot cross process boundaries by reference, the host uses **Type Converters** to serialize parameters into lightweight JSON-RPC payloads before sending them to the plugin. 

The target capability is then executed asynchronously:
*   Instead of waiting for a single block execution, the plugin runs on an event loop and streams progress events (e.g., `data_fetch`, `progress_percent`, `error_flag`) back to the platform.
*   The platform coalesces these event streams and renders the visual results within its safe visual panels.

