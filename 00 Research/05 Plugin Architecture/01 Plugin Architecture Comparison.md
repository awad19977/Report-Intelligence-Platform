While your sources contain comprehensive, multi-process architectural breakdowns for **VS Code**, **Eclipse**, **Terraform**, and the **Model Context Protocol (MCP)**, **they do not contain specific architectural details for IntelliJ.** IntelliJ is only mentioned briefly as a point of comparison (as a full IDE) or in the context of integrating external CLI engines. 

Below is an in-depth comparison of the four fully documented architectures, followed by an analysis of the core architectural patterns they all share.

---

### 1. VS Code: Isolated Extension Host & Standardized Protocols

VS Code is a modular text editor that achieves the power of a full IDE using a highly sandboxed, multi-process design.

*   **Runtime Isolation:** To ensure that misbehaving extension code cannot freeze or crash the user interface, VS Code runs all activated extensions inside an isolated, dedicated process called the **Extension Host** (typically a Node.js process, or a browser WebWorker for web environments). The UI itself renders in a restricted, sandboxed Chromium Renderer process.
*   **UI Customization Boundaries:** Extensions are strictly prohibited from directly accessing or modifying the DOM. This boundary protects VS Code's core layout from breaking. Instead, extensions must use declarative APIs to contribute to predefined visual areas (like the Activity Bar, Sidebars, or Panel). Custom HTML is restricted to isolated **Webview** containers that communicate with the extension via message-passing.
*   **Communication Protocol:** The sandboxed Renderer UI and the Extension Host communicate asynchronously using **JSON-RPC over IPC** (established via HTML5 MessagePorts and Electron IPC). Heavy operations, such as compiler intelligence or debugging, are offloaded to external processes that talk to the Extension Host via standardized, language-agnostic protocols: **Language Server Protocol (LSP)** and **Debug Adapter Protocol (DAP)**.
*   **Discovery & Activation:** Every extension defines a `package.json` manifest that splits extensibility into:
    *   **Contribution Points:** Static JSON declarations cached eagerly on startup, allowing VS Code to render menus, commands, and views without actually loading the extension's underlying code.
    *   **Activation Events:** Declarative triggers (e.g., `onLanguage:python` or `onCommand`) that lazily load and initialize the extension host context only when the extension is explicitly needed.

---

### 2. Terraform: Process-Isolated Providers & Schema Buffers

Terraform acts as an orchestrator that manages external infrastructure by delegating execution entirely to decoupled plugins called **Providers**.

*   **Runtime Isolation:** When Terraform CLI executes, it discovers and launches each required provider as a **completely separate operating system process** on the local filesystem. There is no shared memory; the provider's lifecycle is managed externally by the CLI.
*   **UI & Configuration Seam:** Terraform has no graphical interface. Instead, providers declaratively publish a **Schema** defining the "type information" and structure of the resource, data source, and provider blocks that they support. The Terraform CLI queries this schema using a `GetProviderSchema` RPC to validate configuration blocks written in HCL or JSON.
*   **Communication Protocol:** The CLI communicates with the provider processes via a versioned, bi-directional **gRPC protocol**. Dynamic configuration values are serialized into Protobuf `DynamicValue` messages. To maintain performance, Terraform primarily encodes these payloads using **MessagePack** (a compact binary serialization format), with JSON as an underlying fallback.
*   **Execution Model:** Providers implement a strict contract centered around resource-instance lifecycles, mapped directly to **CRUD operations** (**Create, Read, Update, Delete**). The CLI builds a resource dependency graph, evaluates variables, and triggers these lifecycle RPCs synchronously to reconcile the infrastructure state.

---

### 3. Eclipse: OSGi Bundles & Context-Driven Dependency Injection

Eclipse represents a classical desktop application architecture designed as a modular registry of tightly integrated plug-ins.

*   **Runtime Isolation:** Eclipse uses **OSGi specification** runtimes (Equinox) to enforce modularity. Smallest units are **plug-ins (bundles)**. Unlike VS Code, traditional Eclipse plug-ins run within a single JVM process but are strongly isolated through dedicated, bundle-specific Java class loaders.
*   **Separation of UI and Layout (Eclipse 4 / e4):** In Eclipse 4, the IDE's visual structure is declared as an abstract **Application Model** (stored in XML format). UI components are built as Plain Old Java Objects (**POJOs**) with zero dependencies on specific framework classes, allowing them to be fully detached, tested, and rendered in SWT, JavaFX, or web environments.
*   **Service Dependency Injection:** In e4, global singletons have been removed to eliminate tight coupling. Instead, Eclipse uses a JSR 330-compatible **Dependency Injection (DI)** framework. Concrete implementations of workbench services (like `EPartService` or `EModelService`) are dynamically resolved and injected into POJO constructor/field targets using `@Inject` and `@Named` annotations, driven by hierarchically linked context maps.
*   **Discovery & Extensions:** Deployed plug-ins contain a `manifest.mf` (declaring OSGi dependencies) and a `plugin.xml` (declaring custom extension behaviors). The Platform Runtime reads these manifests on startup to build a static registry of **Extensions** and **Extension Points**. Plug-ins are loaded lazily, remaining inactive until their classes or actions are explicitly triggered by user UI interactions.

---

### 4. Model Context Protocol (MCP): Declarative Infrastructure APIs

MCP is a standardized client-server protocol specifically optimized to decouple LLMs and AI coding agents from localized data sources, tools, and environments.

*   **Runtime Isolation:** Much like Terraform providers, MCP servers are designed to be fully self-contained. They execute as independent backend processes spawned as child processes of the extension runtime or hosted externally.
*   **Granularity of Capabilities:** MCP operates specifically at the **infrastructure granularity**. Each MCP server acts as a black-box service wrapping an external, complex system (such as databases, web browsers, or API gateways). It exposes these environments to an LLM context via high-level, standardized definitions of **Tools**, **Resources**, and **Prompts**.
*   **Communication Protocol:** MCP servers communicate with their host clients using **JSON-RPC** over standardized, transport-layer streams. The protocol natively defines two transport methods:
    1.  **stdio:** A local process spawned by the client that reads and writes strictly over standard input and output streams (`stdin`/`stdout`).
    2.  **HTTP:** Consumed remotely over WebSockets or HTTP streams using Server-Sent Events (SSE).

---

### Summary Architectural Matrix

| Feature | VS Code | Terraform | Eclipse (e4 / OSGi) | Model Context Protocol |
| :--- | :--- | :--- | :--- | :--- |
| **Isolation Model** | Separate OS process (Node.js Extension Host) | Separate OS process (Native CLI binary) | JVM Class Loader-level runtime isolation | Separate OS process (Stdio child or HTTP host) |
| **Communication Channel** | JSON-RPC over Electron IPC & MessagePorts | gRPC over local network sockets | Direct Java method execution & Context-based DI | JSON-RPC over `stdin`/`stdout` or HTTP SSE |
| **Serialization Format** | JSON / Binary IPC frames | MessagePack (Default) or JSON | In-memory Java references / Primitive type conversion | JSON payload arrays |
| **Metadata Registry** | Declarative manifest `package.json` | Eagerly queried JSON-based schema | Declarative manifest `plugin.xml` | Dynamic capability discovery query |

---

### shared-patterns">5. Core Architectural Patterns Shared by All Four Systems

Regardless of the technology stack (Java, Node.js, Go), these architectures have converged on four fundamental systems-design patterns to achieve loose coupling, stability, and extensibility:

#### Pattern A: Eager Declarative Metadata Discovery with Lazy Runtime Activation
All four systems explicitly separate **what a plugin is capable of doing** from **when its code is executed**. 
*   **Mechanism:** Rather than booting every installed plugin on startup (which destroys performance), the host platform parses a lightweight, declarative configuration (manifest or schema query) eagerly. This allows the host to construct the registry, populate UI elements, or validate configurations in-memory. The heavy extension code is only activated lazily—on-demand—when a command is executed, a file type is opened, or a tool is called.

#### Pattern B: Out-of-Process Execution (Process-Level Fault Isolation)
For modern extensible systems, executing third-party code in the main application loop is an anti-pattern. VS Code, Terraform, and MCP rely on **process-level isolation**.
*   **Mechanism:** Running extension code inside a separate OS process boundary ensures that an infinite loop, unhandled exception, or memory leak in custom plugin code only terminates that specific process—leaving the core application functional and responsive. 

#### Pattern C: Standardized, Language-Agnostic Message Protocols
Instead of relying on rigid, language-specific API interfaces that tightly couple components together, these architectures delegate runtime integration to **asynchronous, structured message passing** (typically utilizing JSON-RPC or gRPC).
*   **Mechanism:** Standardizing communication at the protocol level (e.g., gRPC, LSP, DAP, AHP, or MCP) rather than the programming-language level decouples the host from the plugin's internal runtime. This allows the host to communicate with plugins written in entirely different languages, running locally or across physical network bridges.

#### Pattern D: The Extension-Point Contract (Socket & Plug)
Each architecture implements a strict form of the **Host-Extender pattern**, wherein the host provides a designated "socket" (an extension point) and the plugin must supply a conforming "plug" (the extension).
*   **Mechanism:** The host defines an interface schema (such as `.exsd` files in Eclipse, JSON schema contributions in VS Code, or RPC protobuf definitions in Terraform). The plugin is purely parameterizable through these contracts. The host platform remains completely unaware of the extender’s internal codebase, interacting solely through standard serialization mappings and unified lifecycle methods.

