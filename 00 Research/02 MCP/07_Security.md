### **The Model Context Protocol (MCP) Security Model**

The Model Context Protocol (MCP) enables powerful capabilities by standardizing how artificial intelligence models access arbitrary data and execute code paths. Because these capabilities present unique security risks, the protocol is governed by a **strict, multi-layered security model** that establishes trust boundaries, mandates user control, and isolates sensitive data.

---

### **Core Security Principles & Architecture**

#### **1. Authentication**
The base Model Context Protocol is **transport-agnostic** and does not mandate a single built-in authentication mechanism. Instead, authentication is decoupled and delegated to the underlying transport layer or gateway implementation:
*   **Local Deployments**: For local connections (running over standard input/output streams, or `stdio`), authentication is implicit. The server runs as a local subprocess spawned directly by the host application, inheriting the user's local operating system permissions.
*   **Remote/Enterprise Deployments**: Remote connections (such as those running over Streamable HTTP/SSE) secure their endpoints using standard web security standards. Production-grade MCP gateways authenticate clients using **OAuth 2.1** bearer tokens or API keys. 
*   **Query String Protection**: In accordance with modern OAuth 2.1 best practices, bearer tokens must be transmitted securely in HTTP authorization headers and **must be omitted from the query string of URIs** to prevent token leakage in server logs or network proxies.

#### **2. Authorization**
Authorization in MCP is structured to be **per-request** rather than tied to a broad, static connection state:
*   While the connection itself is stateful, the set of tools, prompts, and resources exposed by the server **may vary dynamically** based on the authorization credentials presented with each individual request (such as checking user roles or token scopes).
*   The server must check and validate permissions before allowing any operation to execute.

#### **3. Permission Boundaries**
Permission boundaries are defined through strict, bidirectional capability declarations and host-enforced constraints:
*   **Roots**: Through the client-side `roots` feature, host applications can explicitly declare filesystem or URI boundaries. Remote servers can inquire about these roots, but they are strictly restricted from operating outside of these designated directories or boundaries.
*   **Capability Negotiation**: During the initial connection handshake, both client and server negotiate which features are enabled (such as disabling tool execution or blocking out-of-bound sampling). If a capability is disabled, the server will immediately reject unauthorized requests with standard JSON-RPC protocol errors.

#### **4. User Approval & Human-in-the-Loop**
User consent is the foundational cornerstone of the MCP security model:
*   **Explicit Action Prompts**: Host applications **must act as gatekeepers**. They are required to provide a clear user interface that exposes the exact tool being called, its parsed input arguments, and a confirmation dialog before sending the call to the server.
*   **Sampling Controls**: If a server attempts to initiate a recursive LLM interaction (via the `sampling` capability), the host **must prompt the user for explicit approval**. The user retains absolute control over whether sampling occurs, the actual prompt being sent, and which specific context results are returned to the requesting server.

#### **5. Tool Safety**
Because tools represent arbitrary code execution, they are treated with the highest tier of caution:
*   **Untrusted Metadata**: Tool names, descriptions, and schemas exposed by remote servers must be treated as **untrusted input**. Host applications must sanitize this metadata to protect the host interface and prevent prompt injection attacks that exploit the model's instructions.
*   **Strict Conformity**: Host applications can enforce strict schema validation (`strict: true`) on custom tools, ensuring that the model's generated parameters match the JSON Schema exactly and blocking malformed or unexpected payloads.

#### **6. Resource Access Control**
Resources are read-only "nouns" managed by client-side heuristics:
*   **Validation**: Servers **must validate all resource URIs** to ensure they conform to valid schemes (e.g., `file://`, `git://`) and target permissible objects.
*   **Directory Traversal Protection**: When serving physical or virtual files via the `file://` scheme, servers **must strictly sanitize all path variables**. This sanitization blocks directory traversal attacks (such as injecting `../` to read sensitive configuration files or system secrets).
*   **Zero-Empty Rule**: Servers must not return an empty content block for a non-existent resource, as an empty block is structurally ambiguous. Non-existent resources must result in a flat protocol error.

#### **7. Data Isolation & Privacy**
The architecture enforces a strict **separation of concerns**:
*   **Data Siloing**: Each MCP client maintains a stateful 1:1 session with a single server. Servers operate independently and are strictly blocked from interacting with, reading data from, or discovering other servers connected to the same host.
*   **Transmission Restrictions**: Host applications must never transmit data retrieved from one server's resources to another server without explicit user consent.

#### **8. Secrets Management**
MCP implements strict parameter boundaries to protect secrets:
*   **No Sensitive Header Mirroring**: The `x-mcp-header` mirroring property (which allows HTTP proxies or WAFs to inspect parameters without parsing the body) **must never be applied to sensitive parameters** such as passwords, API keys, bearer tokens, or personally identifiable information (PII).
*   **Transport-Level Security (TLS)**: For remote HTTP-based transport layers, TLS is strictly required on all token endpoints and metadata URIs to prevent middle-man interception of secrets.

#### **9. Auditing & Logging**
To maintain accountability across workflows:
*   **Usage Logs**: Host applications should log all tool invocations, user approval events, and resource read histories for enterprise auditing.
*   **Stateless Gateways**: Production-grade enterprise gateways (such as those connecting to Trino, S3, or internal data lakes) are designed to provide a comprehensive **audit trail** mapped against specific user OAuth identities and security personas.

#### **10. Enterprise Deployment Considerations**
*   **Network Intermediaries**: When deploying remote servers across networks, administrators can leverage parameter header mirroring (`x-mcp-header`) to allow network firewalls, Web Application Firewalls (WAFs), and load balancers to route and inspect traffic based on parameters *without* having to decrypt or parse the JSON-RPC bodies.
*   **Secure Tunnels**: For private enterprise servers deployed behind corporate firewalls, organizations utilize secure tunnels to connect back to authorized cloud hosts safely.

---

### **Comparative Security Analysis**

Understanding how MCP's security model differs from traditional approaches highlights its advantages in managing AI risk:

| Dimension | Model Context Protocol (MCP) | Traditional REST APIs | Traditional Plugins | Function Calling (Model-Specific) |
| :--- | :--- | :--- | :--- | :--- |
| **Control Paradigm** | **Decoupled & Intercepted**: Stateful 1:1 clients with client-side gatekeeping. | **Hardcoded Connection**: Direct application backend integrations. | **Shared Runtime**: Runs arbitrary code inside the host or browser. | **Model-Coupled**: Direct API requests containing raw schemas. |
| **Human-in-the-Loop** | **Built-in & Mandated**: Hosts visualize and prompt for every tool/sampling call. | **Ad-hoc**: Implemented custom per-application if at all. | **Broad Grants**: Standard read/write manifest permissions. | **Orchestrator-Bound**: Developers must write custom glue-code to intercept. |
| **Metadata Trust** | **Untrusted by Default**: Sever-provided tool schemas/annotations are sanitized. | **Explicit Contract**: Strictly validated against OpenAPI/Swagger definitions. | **Implicit Trust**: Assumed safe based on manifest approval. | **Trusted Context**: Injected directly into context as trusted system prompts. |
| **Path Traversal Risk** | **Server-Sanitized**: Explicit protocol constraints on `file://` URIs. | **Endpoint-Constrained**: Pathing governed by defined route parameters. | **Host Directory Exposure**: Can often access local resources. | **Application-Bound**: Depends on the custom execution environment. |
| **Scope Separation** | **Strictly Isolated**: 1:1 sessions prevent servers from cross-communicating. | **Layered/Shared Database**: Shared memory, shared connection pools. | **Shared State**: Can often access cookies or session data across origins. | **Unified Context**: All function schemas are concatenated in a single prompt. |

