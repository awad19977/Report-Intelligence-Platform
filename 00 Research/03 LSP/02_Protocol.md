### 1. The JSON-RPC 2.0 Foundation

The Language Server Protocol (LSP) defines the format of the messages sent between a development tool (editor/IDE) and a language server. Under the hood, this communication is built on **JSON-RPC 2.0**, a stateless, lightweight remote procedure call (RPC) protocol. 

JSON-RPC is **transport-agnostic**, meaning it defines only the message structures and the rules surrounding their processing; it does not dictate how bytes are moved. Consequently, LSP implementations can run over different channels:
*   **Standard Streams**: Communicating over the standard input and output (`stdin` and `stdout`) of the spawned server process.
*   **Plain Sockets**: Connecting over TCP using a host and port (typically where the client sets up the connection and waits for the server to bind).
*   **Named Pipes**: Utilizing platform-specific pipe mechanisms.

All names exchanged in JSON-RPC matching are **case-sensitive**. The protocol relies on JSON's core type system, representing values as **Primitives** (Strings, Numbers, Booleans, Null) and **Structured** types (Objects and Arrays).

---

### 2. Message Types and Structures

The protocol uses three main message types: **Requests**, **Responses**, and **Notifications**. These are distinguished by the presence or absence of specific JSON members.

#### **Requests**
A Request is sent to invoke a specific behavior on the receiving side. It **must** contain an identifier, and the receiver **must** reply with a corresponding Response.
A Request object contains the following fields:
*   `jsonrpc`: A String that must be exactly `"2.0"`. This distinguishes it from JSON-RPC 1.0.
*   `method`: A String specifying the method to invoke. (Method names starting with `rpc.` are reserved for system extensions).
*   `params`: An Object or Array containing the arguments for the method. This may be omitted if no arguments are needed.
*   `id`: A unique identifier established by the sender to correlate the response.

#### **Responses**
When a Request is processed, the receiver returns a Response as a single JSON object. A Response object contains:
*   `jsonrpc`: A String that must be exactly `"2.0"`.
*   `id`: This must match the exact `id` sent in the corresponding Request. If an error prevented parsing or identifying the request ID, this will be `null`.
*   `result`: The return value of the method if the execution was successful. **This field must not exist if there was an error**.
*   `error`: An error object containing details of why the execution failed. **This field must not exist if the execution succeeded**.

*Note: A Response must contain either `result` or `error`, but never both.*

#### **Notifications**
A Notification is a Request object **without an `id` member**. It is a one-way message signifying that the sender does not expect or want a Response.
*   **No Reply**: The receiver **must not** reply to a notification.
*   **Fire-and-Forget**: Because there is no response, notifications are not confirmable. The sender will not know if a notification failed due to invalid parameters or internal errors.
*   **Usage**: Used heavily for synchronization events (e.g., notifying the server that a file was opened, edited, or closed) or status updates (e.g., a server notifying the client of a loaded runtime version).

#### **Message Identifiers (`id`)**
The `id` correlates requests and responses. 
*   **Data Types**: It must be a String, a Number (without fractional parts), or `null`.
*   **Best Practices**: The use of `null` is strongly discouraged. JSON-RPC uses `null` for responses when the request ID is unknown, and JSON-RPC 1.0 used `null` for notifications, so using it as an active identifier can cause handling errors and confusion.

#### **Protocol Versioning**
LSP specification versions (such as the latest **LSP 3.18**) define what capabilities and methods are supported by the client and server. On the wire, the underlying framing protocol version is declared on every single message using the `"jsonrpc": "2.0"` field. This allows parsers to immediately identify compliance with the modern JSON-RPC specification.

---

### 3. Error Handling

If a Request fails, the Response object's `error` member is populated with an **Error Object** containing:
1.  `code`: An integer indicating the error type.
2.  `message`: A concise, single-sentence string description of the error.
3.  `data`: Optional primitive or structured value containing implementation-specific details (such as stack traces or nested errors).

#### **Predefined Error Codes**
The range from `-32768` to `-32000` is reserved for standard, pre-defined errors:

| Code | Message | Meaning |
| :--- | :--- | :--- |
| **`-32700`** | Parse error | Invalid JSON was received; an error occurred while parsing the text. |
| **`-32600`** | Invalid Request | The JSON sent is not a valid Request object. |
| **`-32601`** | Method not found | The requested method does not exist or is not available. |
| **`-32602`** | Invalid params | The parameters provided do not match the method's expectations. |
| **`-32603`** | Internal error | An internal JSON-RPC error occurred. |
| **`-32000` to `-32099`** | Server error | Reserved for implementation-defined server-side errors. |

The remaining integer space is available for application-defined errors specific to LSP.

---

### 4. Data Structures

LSP models its data around key IDE concepts (such as Positions, Ranges, Text Documents, and Completion Items) using JSON structures.

*   **Parameter Passing**: Parameters can be passed **by-position** (using a JSON Array matching the expected argument order) or **by-name** (using a case-sensitive JSON Object where member names match the parameters exactly).
*   **Completeness and Transparency**: Fields must be fully serializable to and from JSON. For example, when a server returns autocomplete options (`CompletionItem`), it can attach an arbitrary `data` field. This field is transparent to the protocol; the client stores it and sends it back to the server during a completion resolve request (`completionItem/resolve`), allowing the server to uniquely identify and lazily fetch extra information for that item.

---

### 5. Wire Examples of LSP Messages

#### **A. Client Request (`textDocument/hover`)**
Sent by the client when a user hovers over a symbol. It requests markdown or plain text documentation for the code at a specific line and character.

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "textDocument/hover",
  "params": {
    "textDocument": {
      "uri": "file:///workspace/src/app.ts"
    },
    "position": {
      "line": 12,
      "character": 8
    }
  }
}
```

#### **B. Server Success Response**
The server successfully computes the hover details and returns a Response matching request `id: 42`.

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "contents": {
      "kind": "markdown",
      "value": "**Hover Info**\n\nThis is a helper function that initializes the runtime process."
    }
  }
}
```

#### **C. Server Error Response**
If the request failed because the server didn't recognize the file URI, it returns an error instead of a result.

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "error": {
    "code": -32602,
    "message": "Invalid params: File URI scheme is not supported",
    "data": {
      "supportedSchemes": ["file", "untitled"]
    }
  }
}
```

#### **D. Client Notification (`textDocument/didOpen`)**
Sent by the client when a document is opened. Because it is a notification, there is **no `id` field** and the server will **not** reply.

```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/didOpen",
  "params": {
    "textDocument": {
      "uri": "file:///workspace/src/app.ts",
      "languageId": "typescript",
      "version": 1,
      "text": "const x: number = 10;\n"
    }
  }
}
```

#### **E. Custom Server Notification (`$/typescriptVersion`)**
Right after initializing, some servers send custom notifications (typically prefixed with `$/`) to provide supplementary runtime information to the client.

```json
{
  "jsonrpc": "2.0",
  "method": "$/typescriptVersion",
  "params": {
    "version": "5.3.0",
    "source": "workspace"
  }
}
```

---

### 6. Why LSP Chose a Protocol Approach Over Direct Library Integration

When designing IDE integrations, creators have two options: distribute a language analysis engine as a **library** (to be loaded directly inside the editor's process) or establish an out-of-process **protocol**. LSP's choice of a protocol addresses three critical architectural issues:

#### **1. Runtime and Language Interoperability**
Editors and IDEs run on fixed runtimes. For example, Visual Studio Code operates on a Node.js runtime. 
*   **The Library Problem**: If direct library integration were used, the language analysis tools would either have to be written in Javascript/TypeScript to fit VS Code's runtime, or the editor would have to bundle complex native bindings for every language.
*   **The Protocol Solution**: Since the protocol is just JSON-RPC sent over standard streams or sockets, the language server can run in its own **native runtime**. A Java language server (`eclipse.jdt.ls`) can run on a Java Virtual Machine (JVM), a PHP language server can run on PHP, and a Rust language server can run on native machine code, while communicating seamlessly with a JavaScript-based host client.

#### **2. Process and Performance Isolation**
Code analysis—such as parsing, compiling, building Abstract Syntax Trees (ASTs), and performing deep static typechecks—is highly CPU and memory-intensive.
*   **The Library Problem**: If these heavy operations ran inside the editor's main process, any complex compilation check or type-checking loop could block the UI thread, causing keypress delays, freezing the interface, and degrading the user experience.
*   **The Protocol Solution**: Running the server in a **separate, isolated process** guarantees that heavy computation happens independently. If a language server hits a CPU bottleneck or crashes due to an out-of-memory error on a massive codebase, the editor's UI remains perfectly fluid and responsive.

#### **3. Overcoming the $M \times N$ Development Bottleneck**
Historically, if there were $M$ programming languages and $N$ editors, supporting every language in every editor required implementing custom language intelligence plugins for each pairing—a total of **$M \times N$ integrations**.
*   **The Library Problem**: Each editor had completely different APIs and extension paradigms, forcing language tool maintainers to rewrite their UI integration code from scratch for VS Code, Sublime Text, Vim, Eclipse, and Emacs.
*   **The Protocol Solution**: LSP introduces a **standardized API interface**. By decoupling the UI from the semantic engine, language providers only need to write a single, compliant Language Server ($M$), and editor vendors only need to write a single LSP Client integration ($N$). This collapses the integration effort to **$M + N$**, making any compliant server immediately compatible with any compliant editor.
