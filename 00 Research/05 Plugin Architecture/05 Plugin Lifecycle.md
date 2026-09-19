Based on the robust process-isolation and extensibility architectures of modern platforms like **VS Code**, **Terraform**, **Eclipse**, and **Sema Code**, the ideal lifecycle of a plugin must enforce strict security boundaries, asynchronous execution safety, and zero-impact performance. 

Below is the architectural blueprint for this lifecycle.

---

### Phase 1: Installation (Discovery & Validation)
Before any third-party code can touch the execution thread, the platform validates and registers the package.

```
┌──────────────────┐      1. Extract package       ┌─────────────────────┐
│ Deployer / Client│ ────────────────────────────> │ Sandboxed Storage   │
└────────┬─────────┘                               └──────────┬──────────┘
         │                                                    │
         │ 2. Eager manifest check                            │
         ├────────────────────────────────────────────────────┤
         │ - Validate compatibility engine tags                │
         │ - Load Contribution Points (Zero-Activation)       │
         │ - Update Cached Plugin Registry Database           │
```

*   **Package Distribution & Target Check:** Plugins are deployed as self-contained bundles containing an immutable `plugin.json` manifest and localized binaries. The platform's installer first parses the manifest's compatibility rules (similar to VS Code's `engines.vscode` parameter) to verify compatibility with the core platform’s current API version.
*   **Zero-Activation Bootstrapping:** To prevent startup degradation, the core platform eagerly reads the plugin's declarative **Contribution Points** (such as registered views, menus, custom commands, or themes) without loading or activating any underlying executable code. The host platform updates its static, in-memory **Plugin Registry** with these manifests. This allows the user interface to render menus and options immediately, keeping the initial memory footprint negligible.

---

### Phase 2: Initialization (Dormant to Active Handshake)
The core platform transitions a plugin from a dormant state to an active executing state dynamically and lazily.

*   **Lazy Context Triggering:** The plugin remains dormant until an explicit **Activation Event** occurs (such as a user executing a custom menu item, expanding a sidebar, or attempting to connect to a specific data source).
*   **Sandboxed Spawning:** The host spawns a dedicated, isolated child process (the **Plugin Host**) using a secure IPC mechanism (such as standard input/output MessagePorts or Electron utility processes). This ensures complete process-level crash protection.
*   **Handshake Protocol:** The host transmits an `initialize` JSON-RPC payload containing system configurations and authorization tokens across the IPC boundary. The Plugin Host responds with its own runtime capability list (schema definitions and targeted CRUD providers) to bind communication ports natively.

---

### Phase 3: Capability Registration (Handshake Verification)
Once initialized, the plugin registers its capability targets under structural security filters.

*   **Document Selector Filtering:** The core platform maps the initialized plugin to active session selectors. If a plugin declares specialized capabilities (e.g., `read` or `validate` targets), the host registers these endpoints dynamically in its operational routing tables.
*   **Context Key Boundaries:** The active registration is conditionally checked against context keys (e.g., `"workspaceContains:path"` or `workspaceTrust == true`). If a plugin lacks security approval, the platform suspends its target execution path before a single payload is sent.

---

### Phase 4: Configuration (Context & State Injection)
The platform configures the active plugin, injecting tenant parameters while preventing state contamination.

*   **Multi-Tenant State Isolation:** When running in concurrent multi-tenant environments, the core engine leverages **Asynchronous Context Tracking** (such as Node’s `AsyncLocalStorage` model). All configurations, connection strings, and credential secrets (retrieved from secure client keystores via Electron's `safeStorage` API) are bound to a continuation-local storage context to block cross-user memory leakage.
*   **Dynamic Dependency Injection (DI):** Following the e4/JSR 330 model, services (such as logging, workspace caching, or file services) are registered dynamically as decoupled singletons in the platform context. When the class constructor initializes, the framework uses parameter decorators (such as `@Inject` and `@Named`) to dynamically resolve and inject mockable core services into the plugin.
*   **State Restorers:** The host injects previous workspace settings and stored memento states (using scopes like `workspaceState` or `globalState` URIs) back into the plugin context.

---

### Phase 5: Execution (Process Orchestration & Streaming)
This is the active computing phase where commands are dispatched, processed, and observed.

```
 ┌───────────────────────┐                    ┌────────────────────────┐
 │   Host Core Engine    │                    │  Isolated Plugin Host  │
 └──────────┬────────────┘                    └───────────┬────────────┘
            │                                             │
            │ 1. Marshal args & call method               │
            ├────────────────────────────────────────────>│
            │ (asynchronous JSON-RPC frame)               │
            │                                             │
            │ 2. Execute workload (Worker Thread)         │
            │ <──────────────────────────────────────────>│
            │                                             │
            │ 3. Asynchronously stream chunked updates     │
            │<────────────────────────────────────────────┤
            │ (onProgress, onDataChunk, token updates)    │
            │                                             │
            │ 4. Optional user cancellation (Token)       │
            ├────────────────────────────────────────────>│
```

*   **Type Marshaling Boundary:** Complex structures cannot pass by reference across isolated memory zones. The platform uses **Type Converters** to serialize parameters into lightweight, primitive JSON-RPC frames. This prevents the renderer or host process from leaking reference handles that could trigger memory leaks or garbage collector failures.
*   **Asynchronous Processing Loops:** For heavy computing operations, the engine detaches workloads to background managers. It streams progress notifications and partial data chunks asynchronously to prevent main event-loop stalls.
*   **Shared Interruption Control:** Every request payload carries a unique execution ID mapped to a `CancellationToken` and an abort controller. If the user triggers an interrupt, the cancellation signal propagates globally down the agent tree, terminating underlying database sessions, shell operations, or API tasks.

---

### Phase 6: Shutdown (Disposal & Cleanup)
Teardown must be clean, deterministic, and rapid to ensure that native operating system resources are released.

*   **Disposal Callbacks:** Shutdown triggers a series of deactivation hooks (such as VS Code's `deactivate()` method or Eclipse's `@PreDestroy` and `@PersistState` lifecycle annotations). The plugin must close all database connections, flush event queues, and dispose of background file-watchers.
*   **Recursive Cascade Disposal:** Using parent-child cascades, disposing of a master context (or a layout Composite container) automatically and recursively disposes of all child sockets and native OS UI widgets, eliminating memory leaks.
*   **Enforced Terminations (The Killer Fallback):** Badly written plugins can stall deactivation processes, causing the application to hang or display warning modals to the user. To circumvent this, the core engine implements a watchdog timer: if the plugin fails to exit gracefully within a strict timeout (e.g., 5 seconds), the engine forcefully kills the process group (`SIGKILL`), wipes its pending queues, and returns clean resource buffers to the OS.

---

### Phase 7: Upgrade
Upgrades stage new plugin versions cleanly without interrupting concurrent operations.

*   **Side-by-Side Model Swapping:** Updates download package folders into versioned subdirectories. During runtime, currently active tasks continue executing against the legacy v2 process.
*   **Cachings Purge:** On startup reconstruction or when switching workspaces, the platform discards previously generated Chromium/V8 code caches to prevent crashes from deserialization mismatches on updated IPC structures.
*   **Dynamic Handshake Translation:** Using version translators (such as version muxing servers), the core platform converts legacy protocol structures to the updated API schema seamlessly on-the-fly.

---

### Phase 8: Removal (De-registration & Scrubbing)
Removal de-registers plugin configurations and purges persistent footprints.

*   **Registry Eviction:** The host platform dynamically modifies the central registry database, removing the plugin from all contribution maps, menus, and file schemas.
*   **Disk Scrubbing:** The core platform terminates the plugin's host process group. It recursively deletes the plugin's root bundle directory and scrubs its local storage directories (`workspaceState` databases, secret vaults, and localized file paths) to ensure zero persistent clutter.

