# Production-Ready Model Context Protocol (MCP) Server Architecture

This document presents a comprehensive, production-grade architectural specification and implementation design for a **Model Context Protocol (MCP) Server**. It bridges the high-level specification with enterprise-level runtime requirements, covering protocol endpoints, infrastructure integrations, security boundaries, and operational observability.

---

## 1. Enterprise MCP Server Architecture Diagram

The diagram below illustrates a production-ready, multi-layered MCP Server architecture. It highlights the separation of concerns, transport channels, security boundaries, database/API connections, and observability layers.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      CLIENT / HOST LAYER (External)                    │
│      (e.g., Claude Desktop, VS Code, Cursor, ChatGPT, Enterprise Host)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
             Transport Protocols    │ Standard Streams (stdio) OR
             & Security Envelope    │ Streamable HTTP (POST + SSE) with TLS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        GATEWAY & TRANSPORT LAYER                       │
│  - Load Balancer / WAF (Inspects x-mcp-header fields for routing)      │
│  - SSL/TLS Termination & Reverse Proxy                                 │
│  - Authentication Guard (Validates OAuth 2.1 Bearer Tokens / API Keys) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     MCP SERVER CORE APPLICATION LAYER                  │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 JSON-RPC 2.0 Router & Protocol Engine          │   │
│   │  - Parses & validates request schemas against specifications   │   │
│   │  - Handles multi-round-trip requests (Elicitation / Consent)  │   │
│   │  - Manages subscription streams & out-of-band push updates     │   │
│   └───────┬────────────────────────┬────────────────────────┬──────┘   │
│           │                        │                        │          │
│           ▼                        ▼                        ▼          │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐   │
│   │   RESOURCE   │         │     TOOL     │         │    PROMPT    │   │
│   │   REGISTRY   │         │   REGISTRY   │         │   REGISTRY   │   │
│   │              │         │              │         │              │   │
│   │  - Static    │         │  - Tool List │         │  - Param     │   │
│   │    Catalog   │         │    Schemas   │         │    Templates │   │
│   │  - Template  │         │    Router    │         │  - Auto-     │   │
│   │    RFC 6570  │         │  - Mirroring │         │    complete  │   │
│   │  - Sub list  │         │    Headers   │         │  - Message   │   │
│   │    Manager   │         │              │         │    Formatter │   │
│   └───────┬──────┘         └───────┬──────┘         └───────┬──────┘   │
│           │                        │                        │          │
│           └────────────────────────┼────────────────────────┘          │
│                                    ▼                                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Security & Authorization Interceptor           │   │
│   │  - Enforces per-request Role-Based Access Control (RBAC)      │   │
│   │  - Inspects user personas, scopes, and granted permissions     │   │
│   │  - Triggers Human-in-the-Loop (HITL) execution consent gates   │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION & INFRASTRUCTURE LAYER                  │
│                                                                        │
│   ┌────────────────────────┬───────────────────────┬───────────────┐   │
│   │    DB Connection Pool  │   Ext API Connectors  │ Observability │   │
│   │   (Postgres, Trino,S3) │  - Rate Limiter       │  - Structured │   │
│   │  - Health Checking     │  - Circuit Breaker    │    JSON Logs  │   │
│   │  - Query Sanitization  │  - Retry Handler      │  - Metrics/   │   │
│   │  - Schema Reflection   │  - Webhook/Callbacks  │    Tracing    │   │
│   └────────────────────────┴───────────────────────┴───────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Server Responsibilities
A production MCP server acts as an intelligent, stateless bridge between highly protected data/compute environments and frontier AI models [1125, 1188]. It is responsible for:
*   **Protocol Compliance**: Correctly implementing the stateful, bidirectional JSON-RPC 2.0 protocol over Standard I/O (stdio) or HTTP/SSE transports, including version handshakes, capability negotiations, and utilities (caching, pagination, progress, and cancellation) [1102, 1125, 1126, 1127].
*   **Context Exposure**: Exposing contextual data as passive, read-only Resources [1089].
*   **Capability Execution**: Providing executable Tools to allow models to act on external systems safely [1216].
*   **Workflow Bootstrapping**: Serving parameterized Prompts that act as user-driven, standardized templates for complex, specialized tasks [1063, 1064].
*   **Strict Security Isolation**: Ensuring that no unauthorized data traversal occurs, validating all model-generated parameters, and preserving absolute privacy boundaries by keeping user data isolated from unauthorized remote servers [1127, 1226, 1240].

---

## 3. Core Primitive Implementations

### A. Resource Implementation
Resources provide read-only context to the model, managed via an **application-driven** control loop [1089, 1111].

```text
       Discovery Phase                  Reading Phase                 Subscription Phase
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │  Client  │     │  Server  │     │  Client  │     │  Server  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │ resources/list │                │ resources/read │                │ subscriptions/listen│
     │───────────────>│                │ (with URI)     │                │ (resourceSubs) │
     │                │                │───────────────>│                │───────────────>│
     │ [<Resource>]   │                │                │                │                │
     │<───────────────│                │ [<Content>]    │                │ [<Ack>]        │
     │                │                │<───────────────│                │<───────────────│
     │                │                │                │                │                │
     │                │                │                │                │ [Resource edit]│
     │                │                │                │                │     (Push)     │
     │                │                │                │                │  notif/.../upd │
     │                │                │                │                │<───────────────│
```

*   **URI Routing & Design**: Every resource is uniquely mapped using standard formats (RFC 3986) [1090, 1097]. 
    *   *Filesystem-like*: `file:///project/src/main.rs` (mapped to virtual or real directories) [1107].
    *   *Database-driven*: `postgres://production_db/public/users` (representing dynamic tables) [1090].
*   **Static Resources (`resources/list`)**: Pre-indexed, immutable files or configurations are listed during discovery. These definitions are cached using Time-To-Live (`ttlMs`) and scoped public/private indicators to reduce network overhead [1100, 1101].
*   **Dynamic Resource Templates (`resources/templates/list`)**: Unbounded or parameter-driven resources (like individual log dates or table rows) are exposed via  **Resource Templates**  using URI Template syntax (conforming to RFC 6570), e.g., `file:///{path}` or `db:///{schema}/tables/{table}` [1090, 1102].
    *   *Template*: `config://environments/{env}/servers/{host}`
    *   *Resolution*: When a user references a path, the host evaluates and resolves arguments, then triggers `resources/read` for the concrete URI [1117].
*   **Reading Resources (`resources/read`)**: Resolves the target URI and returns an array of content blocks [1115]. The server must return either plain-text blocks or base64-encoded binary blobs (`"blob"`) tagged with exact IANA MIME types to instruct the client on how to decode and render the data [1101, 1104, 1115].
*   **Resource Subscriptions**: When a client accesses a reactive resource, it registers an active listener via `subscriptions/listen` [1102]. The server registers this mapping per session. When an edit or data insertion occurs, the server sends an out-of-band `notifications/resources/updated` push containing solely the URI [1102, 1119]. This serves as a lightweight "nudge", prompting the client to decide whether to fetch the fresh contents [1119].

### B. Tool Implementation
Tools represent **model-driven** actions that alter state, execute computations, or access protected APIs [1216, 1217].
*   **Discovery (`tools/list`)**: Exposes available tools with comprehensive description fields that instruct the LLM on exactly when (and when not) to execute the tool [1220]. Results should be deterministically ordered to optimize client-side prompt caching and model performance [1219].
*   **Input Schema & Validation**: Every tool definition includes an `inputSchema` defined in JSON Schema (Draft 2020-12) [1220]. 
*   **Parameter Mirroring (`x-mcp-header`)**: On HTTP-based networks, specific primitive parameters (e.g., `region`, `account_id`) are mirrored directly into the HTTP headers (e.g., `Mcp-Param-Region`) [1221, 1235]. This enables WAFs, load balancers, and reverse proxies to inspect and route the request efficiently without parsing the full JSON body [1221, 1235].
*   **Multi-Round-Trip Requests (`input_required`)**: For tools that require additional runtime authorizations, OAuth flows, or clarifying questions, the server halts execution and returns a `resultType: "input_required"`, prompting the client to gather and submit missing information [1225].
*   **Output Specifications**: Returns unstructured content arrays (mixing text, image, audio, resource links, or complete embedded resources) or highly structured machine-readable `structuredContent` conforming to an optional `outputSchema` [1222, 1223].

### C. Prompt Implementation
Prompts are **user-controlled** workflows that compile structured, role-assigned message lists (`user` and `assistant`) to guide the model through specialized agentic flows [1063, 1064, 1068].
*   **Discovery (`prompts/list`)**: Exposes parameterized prompt templates, arguments, titles, and icons [1068].
*   **Argument Autocomplete (`completion/complete`)**: As the user types parameter values in the client UI, the client sends a `completion/complete` request referencing the prompt argument [1066]. The server evaluates current context and returns autocomplete recommendations to guide user input [1066].
*   **Resolution (`prompts/get`)**: Compiles and resolves the parameters into a structured message array [1066]. Resolved prompts can embed read-only resource blocks or resource links directly within messages, allowing the model to ground its reasoning instantly [1070, 1071].

---

## 4. Production Security Model

### A. Authentication & Transport Security
*   **Stdio Transport (Local)**: Local processes communicate over standard input/output streams (`stdin`/`stdout`). Security is guaranteed by local operating system user permissions, host-level process isolation, and runtime sandboxing [1127].
*   **Streamable HTTP Transport (Remote)**: Remote servers require complete Transport Layer Security (TLS 1.3) [7, 728].
    *   **OAuth 2.1**: Bearer tokens are used to authorize client calls. Under OAuth 2.1, tokens must be passed in the `Authorization` header as Bearer tokens, strictly omitting query parameters [728]. Redirect URIs must employ exact string matching, and public clients must utilize Proof Key for Code Exchange (PKCE) [728].
    *   **API Keys**: Custom API keys can be passed as headers (e.g., `X-API-Key`) for static service-to-service calls.

### B. Authorization & Access Control
*   **Stateless Per-Request Authorization**: Credentials and access tokens are per-request inputs rather than persistent connection state [1065, 1100]. The server evaluates permissions on every JSON-RPC method call [1065, 1100].
*   **Role-Based Access Control (RBAC)**: The router filters resources and tools dynamically based on the validated user identity, tenant ID, or assigned scopes [1065, 1100]. A user with a `read-only` persona will receive a subset of static resources from `resources/list` and have any mutating tool calls rejected immediately [1065, 1100].
*   **Human-in-the-Loop Interception**: To mitigate the risk of arbitrary code execution, the host application acts as a security gateway, presenting confirmation prompts and showing exact parameters to the user before authorizing mutating tool executions [1127, 1226, 1240].

### C. Input Sanitization & Safety
*   **JSON Schema Enforcement**: Strict JSON Schema validation prevents malformed payloads from reaching deep application logic [1226, 1240].
*   **Path Sanitization**: To prevent Directory Traversal attacks (`../`) on the local filesystem, the server must sanitize and resolve all paths to absolute paths, verifying they remain strictly bounded within defined root directories [1108, 1226, 1240].

---

## 5. Enterprise Infrastructure Integration

### A. Database Connections
Production servers must implement resilient, secure database connections (e.g., with PostgreSQL or Trino) [1112]:
*   **Resilient Connection Pooling**: Utilize connection pools with explicit max-lifetime, max-idle limits, and automated reconnect handlers to withstand temporary database outages.
*   **Parameterized Queries**: Implement parameterized SQL query preparation exclusively to eliminate the risk of SQL injection via model-generated parameters.
*   **Schema Reflection**: Safely map database schemas to read-only resource URIs (e.g., `schema://{catalog}/{schema}/{table}`) to allow the model to query table structures dynamically without granting write permissions [1119].

### B. External API Connections
When a tool connects to external REST APIs, the integration must include standard resilience patterns:
*   **Timeout Boundaries**: Enforce strict connection and read timeouts on all outbound HTTP requests to prevent slow external APIs from starving server worker threads.
*   **Circuit Breakers**: Wrap external clients in circuit breakers that trip automatically on high failure rates, returning a clean, model-interpretable error block instead of causing cascading failures.
*   **Rate Limiting**: Enforce sliding-window rate limiters to prevent the model from triggering API rate limit bans during recursive loops [1226, 1240].

---

## 6. Observability, Logging, & Error Handling

### A. Logging
*   **Structured JSON Logging**: All logs must be output in structured JSON format to stdout/stderr (or via the `logging/message` notification utility) for direct aggregation by logging agents (e.g., Elasticsearch, Datadog).
*   **PII & Token Scrubbing**: The logger must inspect metadata and intercept tool parameters, sanitizing sensitive keys (such as `password`, `api_key`, `token`, or `ssn`) to prevent accidental data leaks [1221, 1235].

### B. Monitoring & Metrics
*   **Performance Tracking**: Monitor request-response latency, active subscription counts, connection status, and transaction volumes.
*   **LLM Metrics**: Log model-specific metrics such as total input/output tokens used and tool execution failure rates to optimize prompt size and track agent cost-efficiency [1241].

### C. Graceful Error Routing (Dual-Error Architecture)
The server must route and format errors carefully using the dual-error paradigm [1224]:

1.  **Protocol-Level Errors**: Structural, parsing, or transport issues use standard **JSON-RPC 2.0 error codes** [78]. These represent fatal request issues and are unrecoverable for the model [1224].
    *   `-32700` (Parse Error): Received malformed JSON [78].
    *   `-32600` (Invalid Request): Received an invalid JSON-RPC object [78].
    *   `-32601` (Method Not Found): Requested primitive capability is unsupported or disabled [78, 1118].
    *   `-32602` (Invalid Params): Resource not found or malformed schemas [78, 1107, 1224].
2.  **Tool-Level Operational Failures**: Logical failures during execution (e.g., API timeout, input out of bounds, invalid date) [1224]. The server returns a successful JSON-RPC payload (`id` matched) but with `"isError": true` and a detailed, plain-text error content block [1224, 1228]. This provides actionable feedback to the model, allowing it to reason about the failure and correct its parameters in the next turn [1224].

---

## 7. JSON-RPC Payload Examples

### Example 1: Server Tool Capability Handshake (`initialize`)
**Request (Host to Server):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "sampling": {},
      "roots": {}
    },
    "clientInfo": {
      "name": "EnterpriseHost",
      "version": "1.0.0"
    }
  }
}
```

**Response (Server to Host):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "tools": {
        "listChanged": true
      },
      "resources": {
        "listChanged": true,
        "subscribe": true
      },
      "prompts": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "EnterpriseDBServer",
      "version": "1.4.0"
    }
  }
}
```

### Example 2: Dynamic Resource Discovery & Template Expansion
**Request (Host to Server - Listing Templates):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/templates/list"
}
```

**Response (Server to Host):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "postgres://{catalog}/tables/{table}",
        "name": "Database Schema Reflection",
        "description": "Access physical database schema structures.",
        "mimeType": "application/json"
      }
    ]
  }
}
```

**Reading the Resolved Dynamic Resource:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/read",
  "params": {
    "uri": "postgres://production_db/tables/users"
  }
}
```

### Example 3: Executing a Tool with Validation & Graceful Error Recovery
**Request Calling the Tool (Host to Server):**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "execute_query",
    "arguments": {
      "database": "production_db",
      "query": "SELECT * FROM users LIMIT 'TEN'"
    }
  }
}
```

**Response returning an Operational Tool Error (`isError: true`):**
*The request parsed successfully, but database query validation failed. Returning this block allows the model to self-correct.*
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "SQL Syntax Error: Limit must be an integer. Received: 'TEN'"
      }
    ],
    "isError": true
  }
}
```

**Model Self-Correction and Resubmission:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "execute_query",
    "arguments": {
      "database": "production_db",
      "query": "SELECT * FROM users LIMIT 10"
    }
  }
}
```

**Successful Execution Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Query successful. Retreived 10 rows."
      }
    ],
    "structuredContent": {
      "status": "success",
      "rows_returned": 10,
      "cached": false
    },
    "isError": false
  }
}
```
