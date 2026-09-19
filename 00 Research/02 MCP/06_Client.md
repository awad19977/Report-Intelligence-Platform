# MCP Client: Complete Architecture & Implementation Manual

This document provides a comprehensive, production-ready architectural specification and implementation reference for a **Model Context Protocol (MCP) Client**. It details how a host AI application integrates, manages, coordinates, and secures connections to multiple MCP servers, handles stateful lifecycles, and orchestrates the context loop.

---

## 1. System Topology & Architectural Overview

An MCP Client operates as a stateful connector block embedded inside a **Host Application** (such as Claude Desktop, VS Code, Cursor, or an enterprise orchestrator). The Client acts as an intermediary, translating standard LLM function-calling capabilities and prompt constraints into structured JSON-RPC 2.0 messages sent over a stateful transport layer to one or more MCP Servers.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HOST APPLICATION                                    │
│        (User Interface, Orchestrator, LLM Session Manager, Token Window Controller)     │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                               MCP CLIENT POOL                                  │   │
│   │   (Pool Coordinator, Server Registry, URI Router, Global Context Manager)      │   │
│   │                                                                                │   │
│   │   ┌──────────────────────────┐┌──────────────────────────┐┌────────────────┐   │   │
│   │   │     Client Session A     ││     Client Session B     ││...             │   │   │
│   │   │  (Negotiator, Router)    ││  (Negotiator, Router)    ││                │   │   │
│   │   └────────────┬─────────────┘└────────────┬─────────────┘└───────┬────────┘   │   │
│   └────────────────┼───────────────────────────┼──────────────────────┼────────────┘   │
└────────────────────┼───────────────────────────┼──────────────────────┼────────────────┘
                     │                           │                      │
   Stateful Transport│ (e.g., Stdio Subprocess)  │ (Streamable HTTP)    │
                     ▼                           ▼                      ▼
        ┌──────────────────────────┐┌──────────────────────────┐┌────────────────┐
        │        Local Server      ││      Remote Server       ││...             │
        │   (Filesystem, Git)      ││    (Database Gateway)    ││                │
        └──────────────────────────┘└──────────────────────────┘└────────────────┘
```

---

## 2. Server Connection & Transport Lifecycle

MCP Clients must support establishing and maintaining stateful, two-way communication streams.

### A. Transport Layers
1.  **Stdio Transport (Local)**: The client spawns the MCP Server as a subprocess.
    *   **Inbound Stream**: Read from the subprocess's `stdout`.
    *   **Outbound Stream**: Write to the subprocess's `stdin`.
    *   **Diagnostics**: Subprocess `stderr` must be redirected to the Client's logger (and never mixed with `stdout` to avoid JSON-RPC corruption).
2.  **Streamable HTTP Transport (Remote)**:
    *   Utilizes HTTP POST endpoints for Client-to-Server requests and a Server-Sent Events (SSE) or long-polling stream for Server-to-Client notifications and responses.
    *   Must employ TLS (HTTPS) in production.
    *   Authorization must be supplied per-request via HTTP headers (Bearer token, API key). Bearer tokens must **never** be appended as query parameters in the URL stream.

### B. Connection Lifecycle States

```text
[ DISCONNECTED ] ──( Establish Transport )──> [ CONNECTING ]
                                                     │
                                             (send: server/discover
                                              or legacy: initialize)
                                                     │
                                                     ▼
[ INITIALIZED ] <──( receive: response )─── [ NEGOTIATING ]
       │
 (Active Session:
  Discovery, List,
  Read, Subscriptions,
  Tool Execution)
       │
       └──( Connection Drop / Close )──> [ DISCONNECTED ]
```

---

## 3. Server Discovery & Capability Negotiation

Before executing operations, the client and server must establish their respective capabilities using a deterministic handshake.

### A. Modern Discovery Handshake (`server/discover`)
Modern clients query server capability parameters through a single `server/discover` call. 

**Client Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "init_1",
  "method": "server/discover",
  "params": {
    "protocolVersion": "2025-11-25",
    "clientInfo": {
      "name": "EnterpriseOrchestrator",
      "version": "1.4.0"
    },
    "clientCapabilities": {
      "sampling": {},
      "roots": {
        "listChanged": true
      },
      "elicitation": {}
    }
  }
}
```

**Server Response (Handshake Completed):**
```json
{
  "jsonrpc": "2.0",
  "id": "init_1",
  "result": {
    "protocolVersion": "2025-11-25",
    "serverInfo": {
      "name": "PostgresDatabaseServer",
      "version": "2.1.0"
    },
    "capabilities": {
      "resources": {
        "listChanged": true,
        "subscribe": true
      },
      "tools": {
        "listChanged": true
      },
      "prompts": {
        "listChanged": false
      }
    }
  }
}
```

### B. Capability Mapping & Resolution
The Client Session maps server capabilities to local handlers:
*   **Sampling**: If listed by the client, the server can trigger a **Multi-Round-Trip Request (MRTR)** back to the client to query the LLM (useful for recursive agentic loops).
*   **Roots**: If supported by the client, the server can request filesystem or boundary path roots (`roots/list`) to constrain its operations.
*   **Elicitation**: If supported by the client, the server can initiate runtime elicitation prompts (`elicitation/create`) to request missing properties, parameters, or MFA codes from the user.

---

## 4. Multi-Server Management & Coordination

When a Host application connects to multiple MCP servers simultaneously, the Client Pool coordinator must enforce namespaces to prevent collision and coordinate routing.

```text
               ┌──────────────────────────────┐
               │    Client Pool Coordinator   │
               └──────────────┬───────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Server Alpha    │ │  Server Beta     │ │  Server Gamma    │
│  (tools: [query])│ │  (tools: [query])│ │  (tools: [fetch])│
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         ▼                    ▼                    ▼
 Namespaced Tools:    Namespaced Tools:    Namespaced Tools:
 [alpha.query]        [beta.query]         [gamma.fetch]
```

### A. Naming Collision Resolution
If Server Alpha and Server Beta both expose a tool named `query_db`, the Pool Coordinator must rewrite the tool names before exposing them to the LLM context:
*   **Pattern**: `{server_name}_{tool_name}` or `{server_id}.{tool_name}` (e.g., `postgres_query_db` and `sqlite_query_db`).
*   **Mapping Table**: The client maintains a translation table:
    *   `postgres_query_db` ──> Route to Server Alpha (`query_db`)
    *   `sqlite_query_db` ──> Route to Server Beta (`query_db`)

### B. URI Routing & Parsing
Dynamic resources are routed across server clients by parsing resource URI schemes and templates:
*   A request for `git://repo-a/diff` matches scheme `git` ── Route to Git Server Client.
*   A request for `postgres://production/tables` matches scheme `postgres` ── Route to Postgres Server Client.

---

## 5. Primitives Implementation: Client Orchestration

The Client is responsible for managing the state, querying schemas, and fetching values for the three core MCP server primitives.

### A. Tool Selection & Execution
1.  **Catalog Discovery**: The client issues `tools/list` to populate its registry.
2.  **Exposing to LLM**: The client maps the retrieved `inputSchema` definitions (typically Draft 2020-12 JSON Schema) directly into the LLM's system message or function-calling parameters.
3.  **Strict Mode Conversion**: If the LLM integration supports "strict schemas" (forcing strict JSON output), the client modifies the schema properties (e.g., setting `additionalProperties: false` and asserting all fields as `required` with `null` as a nullable type option).
4.  **Execution & Consent Interception**: When the LLM issues a function call, the client intercepts it, presents the parameters to the user for explicit authorization, and calls `tools/call`.

### B. Resource Retrieval & Templates
1.  **Static & Dynamic Catalogs**: The client fetches static resources via `resources/list` and dynamic parameterized schemas via `resources/templates/list`.
2.  **URI Template Evaluation**: If the LLM or user selects a template (e.g., `file:///{path}` with `path = "src/main.rs"`), the client evaluates the template matching rules conforming to **RFC 6570** to construct a concrete URI: `file:///src/main.rs`.
3.  **Binary Decoding**: The client invokes `resources/read`. If a content block contains `"blob"`, the client decodes the base64 payload into raw binary or matches its `mimeType` to determine display patterns in the UI.

### C. Resource Subscriptions & Live Updates
If the server negotiates the `"subscribe"` capability, the client can register real-time listeners:
1.  The client registers interest via `subscriptions/listen` containing the resource URI in the `notifications.resourceSubscriptions` array.
2.  The server acknowledges, establishing a push channel.
3.  On receiving a `notifications/resources/updated` notification, the client evaluates whether to reload the resource context by issuing a fresh `resources/read` call.

---

## 6. Context Window Management & Optimization

Managing the model's finite token window is a primary responsibility of the client application.

```text
┌────────────────────────────────────────────────────────┐
│                  TOTAL TOKEN BUDGET                    │
└────────────────────────────────────────────────────────┘
┌──────────────────┬─────────────────┬───────────────────┐
│ System Persona   │ System Context  │ Managed Workspace │
│ & Base Guidelines│ & Tool Schemas  │ Prompt Window     │
└──────────────────┴─────────────────┴───────────────────┘
                                     ▼
                      How the Client packs Workspace Context:
                      1. Filters by "audience": ["assistant"]
                      2. Sorts by "priority" (1.0 down to 0.0)
                      3. Evicts lowest priority when budget overflows
```

### A. Context Extraction and Packing
When constructing the prompt payload, the client reads annotations defined on resources:
*   **Audience Filtering**: The client filters resources based on `annotations.audience`. Resources marked only for `"user"` are displayed in the chat UI but excluded from the LLM prompt payload. Resources containing `"assistant"` are injected into the model context.
*   **Priority Ranking**: The client sorts available resources in descending order of their `annotations.priority` (from `1.0` down to `0.0`).
*   **Dynamic Truncation (Eviction)**: If the accumulated token size of the context window exceeds a managed threshold, the client drops the lowest-priority resources until the context conforms to the token budget.
*   **Recency Sorting**: Utilizing the `annotations.lastModified` ISO 8601 timestamp, the client orders active records to ensure the LLM receives the most up-to-date data.

---

## 7. Failure Handling & Recovery Protocols

A production-grade client must protect against unstable network pipelines, server crashes, and hung subprocesses.

### A. Error Routing Architecture
The client must differentiate protocol failures from execution failures:
*   **Protocol Errors (Standard JSON-RPC Errors)**: Returned as a negative integer code.
    *   `-32601 (Method not found)`: Occurs if a client requests a capability the server did not advertise. Action: Fallback, log warning, disable capability.
    *   `-32602 (Invalid params / Resource not found)`: Occurs if the URI does not exist or template arguments are malformed. Action: Inform the user/orchestrator of the reference error.
*   **Tool Execution Errors**: Returned as a successful JSON-RPC payload containing `isError: true` and an error content block. Action: Feed the exact error message block back to the LLM to let the model self-correct its query parameters.

### B. Resilience Policies
1.  **Timeouts**: Every client-initiated request must have a strict timeout threshold (e.g., 10 seconds for tools/resources discovery, 30 seconds for execution). If the server fails to respond, the client issues a `notifications/cancelled` message for that request ID and closes/restarts the session.
2.  **Graceful Restart**: If a local stdio subprocess crashes or returns an EOF on standard streams, the client kills the process tree, cleans up orphaned handles, enters `DISCONNECTED` state, and schedules an exponential-backoff reconnection attempt.
3.  **Request Cancellation**: If a user cancels a query in the UI while a tool call is pending, the client must immediately emit a cancellation notification to prevent the server from hanging on intensive calculations:
    ```json
    {
      "jsonrpc": "2.0",
      "method": "notifications/cancelled",
      "params": {
        "requestId": "exec_2"
      }
    }
    ```

---

## 8. Complete System Workflow: E2E Interaction Sequence

The diagram below maps the complete lifecycle of a user-initiated request that triggers server discovery, context assembly, reasoning, tool execution, and final response composition.

```text
 User Interface          MCP Client (Host)             LLM Engine            MCP Server
       │                         │                         │                      │
       │─── 1. User Request ────>│                         │                      │
       │    (e.g., "Refactor     │                         │                      │
       │     main.rs")           │                         │                      │
       │                         │── 2. Discover Catalog ────────────────────────>│
       │                         │   (tools/list, resources/list, etc.)           │
       │                         │<── 3. Return Metadata ─────────────────────────│
       │                         │                                                │
       │                         │── 4. Assemble Context ─>│                      │
       │                         │    (Files, Schemas,     │                      │
       │                         │     System Prompts)     │                      │
       │                         │                         │                      │
       │                         │<── 5. Tool Call Request ─│                      │
       │                         │    (LLM decides to call │                      │
       │                         │     "execute_diff")     │                      │
       │                         │                         │                      │
       │<── 6. Prompt Consent ───│                         │                      │
       │                         │                         │                      │
       │─── 7. User Approves ───>│                         │                      │
       │                         │                                                │
       │                         │── 8. Execute Operation ───────────────────────>│
       │                         │    (tools/call)                                │
       │                         │<── 9. Return Content Blocks ───────────────────│
       │                         │    (Diff Results, Logs)                        │
       │                         │                                                │
       │                         │── 10. Pass Output ─────>│                      │
       │                         │                         │                      │
       │                         │<── 11. Final Response ──│                      │
       │                         │    (Formulated Prose)   │                      │
       │<── 12. Render Answer ───│                         │                      │
```

### Step-by-Step Workflow Description

1.  **User Request**: The user enters a prompt or selects an explicit command (e.g., typing `/review` or clicking a codebase file).
2.  **MCP Discovery**: The client queries its server pool's current active catalog using the namespaced cache. If a subscription is active or `listChanged` was triggered, it updates its tool definitions and resource URIs.
3.  **Return Metadata**: The servers return active resources, schemas, dynamic URI templates, and available tool schema payloads.
4.  **Assemble Context**: The client coordinator checks annotations, filters by audience, ranks by priority, evicts low-priority records exceeding the token limit, and compiles the final prompt context window. This context, containing raw text/markdown resources, is sent to the LLM.
5.  **Tool Call Request**: The LLM analyzes the context, determines it requires external action, and responds with a function-calling request (specifying tool name and arguments).
6.  **Prompt Consent Interception**: The client UI intercepts the tool call, displays the proposed parameters and target server, and prompts the user for explicit permission to run.
7.  **User Approves**: The user confirms the execution.
8.  **Execute Operation**: The client sends a stateful JSON-RPC request (`tools/call`) to the target server.
9.  **Return Content Blocks**: The server executes the operation and returns unstructured media blocks or structured JSON results. If a transient error occurs, the server sets `isError: true` inside the payload.
10. **Pass Output**: The client forwards the tool call output back to the LLM. If `isError` was true, the model evaluates the error and self-corrects. If successful, it proceeds to compose the final response.
11. **Final Response**: The LLM returns its final natural language output.
12. **Render Answer**: The client UI displays the final formatted answer (and any returned image/audio assets) to the user.
