### Model Context Protocol (MCP) Resources: Deep-Dive Architectural Guide

The **Model Context Protocol (MCP)** provides a unified standard for AI models to interact with external data environments. Within this architecture, **Resources** represent the core server-side feature that enables the secure, read-only exposure of data, files, schemas, and live system state to the AI model. 

Below is a detailed guide explaining the technical architecture, message schemas, lifecycle events, and agent decision mechanics of MCP Resources.

---

### **1. What is an MCP Resource?**
An **MCP Resource** represents a **read-only** context source. Unlike **Tools**, which are executable functions that allow a model to alter state or perform side effects (the *verbs* of the protocol), Resources are descriptive pieces of content that provide passive context (the *nouns* of the protocol). 
*   **Examples of Resources**: Code codebase files, application logs, structured database schemas, real-time metrics, active API responses, or static documentation files.

---

### **2. Resource URI Design**
Every resource is uniquely identified by a **Uniform Resource Identifier (URI)** conforming to the **RFC 3986** standard. URIs allow clients to request specific data and help servers routing the request to the correct internal handler. 
MCP defines several standard URI schemes, though developers are free to define custom ones:
*   **`file://`**: Represents filesystem-like structures. These do not need to map to physical paths on disk; they can represent virtual directories or remote files. For non-regular files like directories, servers can use standard XDG MIME types (e.g., `inode/directory`).
*   **`git://`**: Used to expose version control assets, such as commits, file diffs, or repository trees.
*   **`https://`**: Reserved for web-hosted resources. The protocol specifies that servers should only use `https://` if the client is capable of fetching and loading the resource directly from the web on its own, bypassing the MCP server.
*   **Custom Schemes**: Servers often employ custom schemes to denote application boundaries (e.g., `slack://`, `postgres://`, or `catalog://`).

---

### **3. Static vs. Dynamic Resources**
MCP handles resources in two distinct ways depending on whether they can be pre-enumerated:
*   **Static Resources**: These are fixed, pre-defined resources. Because their URIs and metadata are static, they can be fully listed and indexed in advance by the client. Examples include configuration files or database schemas.
*   **Dynamic Resources**: These cannot be pre-enumerated because they depend on dynamic runtime parameters (such as an individual row ID in a database table or a specific file path). Instead of listing every possible entry, the server exposes these via **Resource Templates**.

---

### **4. Resource Templates**
Resource templates allow servers to expose parameterized endpoints using URI Templates following the **RFC 6570** standard.
*   **Syntax**: Templates specify variables in curly braces, such as `file:///{path}` or `catalog://products/{id}`.
*   **Evaluation**: The client evaluates the template and constructs a valid URI by substituting parameters (e.g., resolving `catalog://products/{id}` with `id = 123` to produce `catalog://products/123`).
*   **Autocompletion**: Servers can optionally implement autocomplete handlers for dynamic variables in resource templates to help the host application guide user input.

---

### **5. Resource Discovery & Capabilities**
Before a client can discover resources, the server must advertise its capability during the connection **initialization handshake**:
```json
{
  "capabilities": {
    "resources": {
      "listChanged": true,
      "subscribe": true
    }
  }
}
```
*   `listChanged` (Optional): The server will emit a proactive notification whenever its catalog of available static resources changes.
*   `subscribe` (Optional): The server supports resource-specific subscriptions to notify the client when the underlying data of a resource is updated.

---

### **6. Resource Listing**
Clients query the available resources through two separate, paginated endpoints:
*   **`resources/list`**: Returns a list of all static resources.
*   **`resources/templates/list`**: Returns a list of all dynamic resource templates.
*   **Pagination & Caching**: Both listing methods support cursor-based pagination and explicit caching parameters, including Time-To-Live in milliseconds (`ttlMs`) and a security-aware caching scope (`"public"` or `"private"`).

---

### **7. Resource Reading**
To fetch a resource's contents, the client invokes `resources/read` with the target `uri`. 
*   **Content Blocks**: The server replies with an array of `contents` blocks. This allows a single read request to return multiple items (e.g., reading a directory resource might return the contents of all files inside it).
*   **Payload Types**: Content blocks must include a `uri` and `mimeType` and can deliver either:
    *   **Text Content**: Exposes a plain-text payload via a `"text"` string property.
    *   **Binary Content**: Exposes binary data via a base64-encoded `"blob"` string property.
*   **Multi-Round-Trip Requests**: If a resource requires authentication or parameters that the client hasn't provided, the server can reply with an `InputRequiredResult` to initiate a multi-round-trip elicitation loop.

---

### **8. Resource Updates & Subscriptions**
To ensure clients maintain real-time synchronization with active data feeds, MCP implements a subscription mechanism:
1.  **Subscription**: The client sends a `resources/subscribe` request specifying the resource `uri`.
2.  **Acknowledgment**: The server acknowledges with an empty JSON-RPC success response (`{}`).
3.  **Updated Event**: Whenever the resource changes, the server pushes an out-of-band `notifications/resources/updated` notification with the modified `uri`.
4.  **Unsubscribe**: The client cancels the subscription by sending a `resources/unsubscribe` request.

---

### **9. How an AI Agent Decides When to Use Resources**
Unlike tools, which are model-controlled (meaning the model autonomously executes them using function calling), **resources are fundamentally application-driven**.
*   **Context Injection**: The host application or client coordinates how resources are retrieved and loaded. The host can automatically inject resource data into the model’s system prompt as background context.
*   **Explicit Selection**: Users can explicitly bind resources to the conversation (e.g., choosing a file in a codebase sidebar or typing `@main.rs` in the chat window).
*   **Semantic Heuristics (RAG)**: The host application can dynamically search through the titles and descriptions of all listed resources, perform semantic vector embedding matching against the user's prompt, and automatically read and inject matching resources.
*   **Resource Annotations**: To optimize this workflow, resources support optional metadata annotations:
    *   `audience`: Specifies who the resource is for. Valid values are `["user"]`, `["assistant"]`, or both.
    *   `priority`: A float from `0.0` (optional) to `1.0` (required) that allows the client to prioritize which resources to pack within the model's finite token window.
    *   `lastModified`: An ISO 8601 timestamp that enables sorting by recency.

---

### **JSON-RPC 2.0 Communication Examples**

#### **1. List Static Resources**
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "file:///project/src/main.rs",
        "name": "main.rs",
        "title": "Rust Main Program",
        "description": "Primary application entry point",
        "mimeType": "text/x-rust",
        "annotations": {
          "audience": ["assistant"],
          "priority": 0.9,
          "lastModified": "2026-07-17T15:00:58Z"
        }
      }
    ]
  }
}
```

#### **2. List Resource Templates**
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/templates/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "resourceTemplates": [
      {
        "uriTemplate": "file:///{path}",
        "name": "Project Files Template",
        "title": "📁 Project Files",
        "description": "Exposes parameterized access to workspace project files",
        "mimeType": "application/octet-stream"
      }
    ]
  }
}
```

#### **3. Read Resource**
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/read",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "contents": [
      {
        "uri": "file:///project/src/main.rs",
        "mimeType": "text/x-rust",
        "text": "fn main() {\n    println!(\"Hello World from the Model Context Protocol!\");\n}"
      }
    ],
    "ttlMs": 60000,
    "cacheScope": "private"
  }
}
```

#### **4. Subscribe to Resource**
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/subscribe",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {}
}
```

#### **5. Resource Updated Notification**
**Server Push:**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/updated",
  "params": {
    "uri": "file:///project/src/main.rs"
  }
}
```

---

Here's what I found on **MCP Resources**:

I found that MCP Resources represent a core standard for exposing read-only application data, database schemas, and codebase files to language models. While tools represent model-triggered executable functions, resources are application-driven nouns that hosts selectively inject into the prompt context.

**Key themes I noticed:**
1. **Application-Driven Design**: The host application, rather than the model, controls the resource context injection, prioritizing resources using annotations like audience, priority, and last-modified metadata.
2. **Template-Based Flexibility**: Dynamic data streams and parameterized entities are elegantly exposed through URI Templates conforming to RFC 6570.
3. **Reactive Real-Time Updates**: Through a lightweight publish-subscribe system (`resources/subscribe`), clients can monitor changes and receive out-of-band updates when resources are modified.
