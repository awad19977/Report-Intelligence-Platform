### 1. High-Level Blueprint: The Three-Layer Decoupled Architecture

The ideal reporting platform should adopt a **three-layer separation architecture** to completely decouple the presentation layout from the computational engine and data adapters. 

```
┌────────────────────────────────────────────────────────┐
│                      Client Layer                      │
│   (Web UI, Desktop Rich Client, CLI, Scheduled Job)    │
└──────────────────────────┬─────────────────────────────┘
                           │ Asynchronous Event Stream (JSON-RPC)
┌──────────────────────────▼─────────────────────────────┐
│                   Core Reporting Engine                │
│    (State Manager, Layout Coordinator, Auth, DI)       │
└──────────────────────────┬─────────────────────────────┘
                           │ gRPC / Stdio IPC
┌──────────────────────────▼─────────────────────────────┐
│                    Plugin Runtime Layer                │
│       (Isolated Data Providers, Visualizers, Hooks)    │
└────────────────────────────────────────────────────────┘
```

*   **Client Layer:** Handles rendering of the reports, user interactions, and dashboard configurations.
*   **Core Reporting Engine:** Orchestrates the lifecycle of active report sessions, executes dependency injection, manages file caches, and broadcasts state mutations. 
*   **Plugin Runtime Layer:** Houses the untrusted, dynamically loaded extender packages that retrieve data or format visualization layouts.

This decoupled approach ensures that driving a reporting layout is as simple as subscribing to an event-driven stream, allowing the exact same reporting core to run in-process on the desktop, inside a web browser, or server-side under heavy concurrent schedules.

---

### 2. Delivering on the Core Architectural Requirements

To meet your requirements, the reporting platform will compose several vetted architectural patterns seen in highly successful, scalable systems:

#### Requirement A: Installable & Discoverable (Eager Metadata Registry)
To ensure instant startup performance, plugins must separate their **declarative capabilities** from their **imperative execution code**.
*   **The Manifest Contract:** Every plugin is distributed as a self-contained folder containing a `plugin.json` manifest. This manifest explicitly declares static **Contribution Points** (e.g., custom database drivers, specialized chart types, or custom formatting macros) and **Activation Events** (triggers like `onReportType:financial` or `onSchedulerTrigger`).
*   **Zero-Activation Bootstrapping:** On platform startup, the host engine reads these manifests to build an in-memory **Plugin Registry**. The UI can eagerly render menus, config panels, and toolbar buttons using this registry *without* actually loading or activating any third-party JavaScript or native binaries. Code is only activated lazily—on-demand—when a user runs a report using that specific plugin's capabilities.

#### Requirement B: Isolated (Multi-Tier Sandboxing)
Running arbitrary user-contributed report generation scripts in the main thread of your application is a major vulnerability. We enforce isolation at both the process and UI boundaries:
*   **Process-Level Fault Isolation:** Plugins execute inside a dedicated, isolated **Plugin Host process**. If a database adapter experiences an infinite loop, runs out of memory, or triggers an unhandled exception, only that child process terminates. The core reporting workbench remains responsive, warning the user and automatically restarting the failed host process.
*   **Multi-Tenant State Isolation:** When running in a server-side environment with concurrent users generating reports, the engine implements session isolation via **Asynchronous Context Tracking** (e.g., Node.js `AsyncLocalStorage`). Every session is assigned an opaque token, mapping all downstream tool invocations, database calls, and telemetry events to a localized resource context to block cross-user memory leakage.
*   **DOM Visual Boundaries:** Extensions are strictly prohibited from directly modifying the application’s core DOM. Visual components (like interactive HTML5 charts) are executed inside sandboxed `iframe` containers with restrictive Content Security Policies (CSPs), communicating with the extension host strictly via structured postMessage APIs.

#### Requirement C: Versioned (Strict API Dependency & State Upgrades)
To handle the inevitable evolution of your reporting schemas and core APIs:
*   **API Verification Constraints:** The manifest requires an explicit `engines.reporting` declaration matching the minimum compatible version of the host API. If the platform updates to an incompatible major version, incompatible plugins are flagged in the registry and disabled.
*   **Schema State Upgrades:** Reporting configurations persist an integer-based **Schema Version**. If a visualizer plugin is upgraded, it implements a state-upgrade interface to seamlessly map legacy JSON report configurations into the shape defined by the current version.

#### Requirement D: Cross-Platform (Transport Abstraction & Dynamic Arch Loading)
The architecture must treat the operating system as an execution detail:
*   **Target Architecture Auditing:** If visual plugins rely on specialized native binaries (e.g., an FFmpeg utility for exporting reports to video or a compiled Rust compression engine), the plugin host dynamically queries `process.arch` (such as x86_64, ARM) and OS release files to resolve and download the matching target platform binary. It also handles differences in C libraries, such as glibc vs Alpine's musl.
*   **Normalized Communication Streams:** Handshakes, configurations, and raw data are sent over standardized streams (Stdio for local child processes, WebSockets for remote clusters). Payloads are structured as standardized JSON-RPC arrays, decoupling the platform's core from the language choice of the plugin itself.

#### Requirement E: Capability-Based (Granular Three-Tier Ecosystem)
Reporting engines must avoid a monolithic plugin design. We implement a **Three-Tier Capability Model** tailored to reporting workflows:
1.  **Infrastructure Level (Data Providers):** Plugins that map standard database schemas, REST APIs, or local file types to the engine. They implement resource lifecycle contracts (**Create, Read, Update, Delete**) and expose structured schemas defining their parameters.
2.  **Behavior Level (Formatting & Calculations):** Modular POJOs (Plain Old Java/JavaScript Objects) that alter *how* data is analyzed—such as custom regression models, date formatting rules, or translation mapping—without exposing UI dependencies.
3.  **Workflow Level (Reporting Hooks):** Extensions that hook into the engine's core lifecycle hooks (e.g., `preSave`, `postDataFetch`, `onExport`) to run logging, data-compliance auditing, or custom validation workflows.

To secure this, a **Four-Layer Permission System** processes plugin operations, giving administrators the ability to conditionally prompt users or auto-approve operations (such as L1 for data reads, L2 for local filesystem exports, and L3 for calling external mail servers).

#### Requirement F: Future-Proof (Dependency Injection & Adaptable Core)
The primary driver of software rot in extensible systems is hardcoding client implementations to deep platform singletons.
*   **Dynamic Dependency Injection:** All platform features (e.g., `SelectionService`, `ExportService`, `FileService`) are registered as decoupled, abstract service interfaces in a central context registry. Core plugin code simply declares what services it requires via annotations (e.g., `@Inject @Named` or constructor-based injection). 
*   **Mockable Testing:** Because plugins interact with the reporting workbench solely through abstract interfaces, developers can trivially mock the entire platform environment in unit tests, ensuring robust plugin development outside of live production environments.

