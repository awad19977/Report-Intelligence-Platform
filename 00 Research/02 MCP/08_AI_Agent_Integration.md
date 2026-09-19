### **Agentic Architecture with Model Context Protocol (MCP)**

Designing an AI agent using the Model Context Protocol (MCP) shifts the paradigm from hardcoded integration paths to a dynamic, decoupled, and standard-compliant cognitive loop. By treating external systems as standardized servers that expose resources (data), tools (actions), and prompts (workflows), the agent can cleanly split its reasoning from its environmental interface.

The diagram below maps the complete multi-agent, pool-coordinated client architecture:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HOST APPLICATION                                    │
│       (Orchestration Layer, User Consent Manager, Multi-Agent Coordination Pool)       │
│                                                                                        │
│   ┌──────────────────────────┐                    ┌──────────────────────────────┐     │
│   │    ORCHESTRATOR / HOST   │◄──────────────────►│      USER CONSENT GATEWAY    │     │
│   │  (Coordinates Handoffs)  │                    │ (Human-in-the-Loop Approval) │     │
│   └────────────┬─────────────┘                    └──────────────┬───────────────┘     │
│                │                                                 │                     │
│                ▼                                                 ▼                     │
│   ┌──────────────────────────────────────────────────────────────────────────────┐     │
│   │                             MCP CLIENTPOOL MANAGER                           │     │
│   │    (Maintains concurrent stateful stdio / Streamable HTTP SSE connections)   │     │
│   │                                                                              │     │
│   │   ┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────┐   │     │
│   │   │     Local Client     │    │    Remote Client     │    │ Remote Client│   │     │
│   │   │   (file:// Server)   │    │  (postgres:// Serv)  │    │ (API Server) │   │     │
│   │   └──────────┬───────────┘    └──────────┬───────────┘    └──────┬───────┘   │     │
│   └──────────────┼───────────────────────────┼───────────────────────┼───────────┘     │
│                  │                           │                       │                 │
│                  │ stdio (Subprocess)        │ SSE (TLS)             │ SSE (TLS)       │
│                  ▼                           ▼                       ▼                 │
│         ┌─────────────────┐         ┌─────────────────┐     ┌─────────────────┐        │
│         │   MCP SERVER    │         │   MCP SERVER    │     │   MCP SERVER    │        │
│         │  (Filesystem)   │         │   (Database)    │     │  (External API) │        │
│         └─────────────────┘         └─────────────────┘     └─────────────────┘        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### **Core Agent Architectures & Operations**

#### **1. Agent Reasoning Loop (ReAct Framework)**
The agent uses the **ReAct (Reasoning and Acting)** framework to interleave thought processes with action execution:
*   **Reasoning (Thoughts)**: The model generates explicit reasoning traces. This allows the agent to induce, monitor, and update its action plans, maintain state tracking, and dynamically handle execution anomalies.
*   **Acting (Actions)**: The model interfaces with the environment by executing tools exposed by the MCP Client Pool (`tools/call`).
*   **Observing (Observations)**: The model ingests the environmental feedback—either read-only resource payloads (`resources/read`) or tool outputs.
*   **Self-Correction**: By utilizing MCP's dual-error reporting architecture, if a tool execution fails, the server returns an `isError: true` payload rather than throwing a fatal protocol error. The failure is sent as an operational observation block. **This enables the model to read the validation/API error message, understand its mistake, adjust its parameters, and self-correct on the next turn.**

#### **2. Memory Architecture**
To maximize generation accuracy and prevent state decay, memory is structured into three layers:
*   **Parametric Memory**: The static, pre-trained weights of the core LLM containing general world knowledge.
*   **Non-Parametric Memory (Short-Term / Episodic)**: The running conversational message thread, formatted as structured role-assigned message blocks (`user` and `assistant`) containing raw chat and tool call/result sequences.
*   **External Memory (Stateful Resource Tracking)**: The agent monitors file systems or remote db spaces through stateful resource mappings. By utilizing `resources/subscribe`, the client registers interest in specific URIs. The server pushes out-of-band `notifications/resources/updated` alerts over the SSE channel whenever files change. This triggers the agent to dynamically refresh its context cache.

#### **3. Planning & Dynamic Tool Selection**
When connected to an enterprise ecosystem with potentially thousands of tools, sending all schemas in a single prompt causes context window exhaustion and prompt cache degradation.
*   **Tool Search (Deferred Loading)**: The agent initially connects with a minimalist set of core tools. When faced with a complex task, the model utilizes the **Tool Search** feature (either an Anthropic-hosted server tool or an MCP-exposed search directory) to query the connected tool registry dynamically.
*   **Just-In-Time Injection**: Based on semantic search queries, the pool client loads the necessary tool schemas dynamically on-demand, injecting them into the prompt only during the active planning turn.

#### **4. Context Management**
The client manages the finite context window using **metadata annotations** declared on resource content blocks:
*   **`priority` (0.0 to 1.0)**: The client evaluates priority scores to determine which resource blocks are essential to retain in the prompt and which can be evicted if token boundaries are reached.
*   **`audience`**: Determines if the resource content is intended for the `"user"` (rendered in UI), the `"assistant"` (injected into system context), or both.
*   **Caching (`ttlMs` and `cacheScope`)**: The client honors time-to-live values and private/public caching boundaries returned in resource listings to optimize token re-use and prompt cache hits.

#### **5. Multi-Agent Communication**
In a multi-agent system, agents coordinate using MCP primitives:
*   **Agent Sampling**: Utilizing the **Sampling** capability, a parent orchestrator agent can programmatically initiate recursive LLM calls to sub-agents via the client (`sampling/createMessage`). The parent dictates the exact sub-tool permissions, limiting the sub-agent's blast radius.
*   **Collaborative Whiteboarding**: Multiple specialized agents (e.g., Code Writer, Auditor) communicate asynchronously by reading and writing to a shared, stateful database or filesystem resource. Updates are tracked in real-time via `notifications/resources/updated` subscriptions, avoiding expensive polling loops.

---

### **System Workflow Walkthrough**

```text
 User Request
      │ (e.g., "@git://repo/diff refactor this database update")
      ▼
1. Understand Request
      │ (Host RAG locates semantic file resources; parses user intents)
      ▼
2. MCP Discovery
      │ (Pool Client queries tools/list and resources/templates/list)
      ▼
3. Planning & Selection
      │ (Evaluates priority/audience; constructs ReAct Plan; selects tools)
      ▼
4. Human-In-The-Loop Approval (Gatekeeper Interception)
      │ (Visualizes tool arguments to user; waits for explicit grant)
      ▼
5. Execution (tools/call)
      │ (Sends call params; server executes safe SQL update or git write)
      ▼
6. Verification & Result Processing
      │ (Validates output against outputSchema; resolves isError loops)
      ▼
 Final Response
```

#### **Step 1: Understanding & Retrieval**
The user inputs: *"Apply the schema refactoring from the database update template to the local codebase."* The Host RAG matches the phrase against listed resource templates. The client resolves the template `database://{schema}` to a concrete resource read.

#### **Step 2: MCP Discovery & Planning**
The client pool retrieves the available capability sets. The agent runs an internal **ReAct thought trace**:
*   *Thought*: *"I need to read the database update schema first, translate it into a codebase modification, and then write the changes using the codebase tools."*
*   *Action*: Invoke `resources/read` for `database://production`.

#### **Step 3: Tool Selection & Execution with Consent**
The resource returns the SQL schema text. The model generates a plan to modify local files and initiates a `tools/call` for the `write_file` tool.
*   **Security Interception**: The host intercepts the call. It displays the target path and exact code modifications in a visual confirmation modal.
*   **User Action**: The user authorizes the execution. The client executes the `tools/call`.

#### **Step 4: Verification & Response Formulation**
The server writes the file and returns a successful response. To verify the change, the agent decides to run compile checks:
*   *Action*: Invoke `tools/call` for `run_compiler`.
*   *Observation*: If the compiler returns a tool execution error (`isError: true` with syntax error text), the agent loops back, modifies the code arguments, and retries until success is verified. Once compiled cleanly, the final text response is returned to the user.

---

### **JSON-RPC Communication Payloads**

#### **1. Tool Search Discovery (`tools/list` with Search Parameters)**
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "agent-step-1",
  "method": "tools/list",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2025-11-25",
      "io.modelcontextprotocol/clientInfo": {"name": "OrchestratorAgent", "version": "2.0"}
    }
  }
}
```

**Response (Dynamic Tool Search Catalog):**
```json
{
  "jsonrpc": "2.0",
  "id": "agent-step-1",
  "result": {
    "tools": [
      {
        "name": "apply_patch",
        "description": "Applies diff structure or edits to target files. Sanitizes paths strictly to prevent traversal.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "target_path": { "type": "string" },
            "diff": { "type": "string" }
          },
          "required": ["target_path", "diff"]
        },
        "outputSchema": {
          "type": "object",
          "properties": {
            "status": { "type": "string" }
          },
          "required": ["status"]
        }
      }
    ],
    "resultType": "complete"
  }
}
```

#### **2. Execution Call (`tools/call`)**
**Request (Model Initiated Action):**
```json
{
  "jsonrpc": "2.0",
  "id": "agent-step-2",
  "method": "tools/call",
  "params": {
    "name": "apply_patch",
    "arguments": {
      "target_path": "src/db.rs",
      "diff": "@@ -1,3 +1,3 @@\n-fn init() {\n+fn init_v2() {\n"
    }
  }
}
```

**Response (Output Schema Validation Success):**
```json
{
  "jsonrpc": "2.0",
  "id": "agent-step-2",
  "result": {
    "resultType": "complete",
    "content": [
      {
        "type": "text",
        "text": "{\"status\": \"success\"}"
      }
    ],
    "structuredContent": {
      "status": "success"
    },
    "isError": false
  }
}
```

