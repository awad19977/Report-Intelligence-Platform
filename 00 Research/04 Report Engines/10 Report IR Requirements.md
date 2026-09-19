Designing a vendor-neutral **Report Intermediate Representation (Report IR)** requires defining strict structural, operational, and non-functional boundaries. Based on the architectures, constraints, and runtime patterns of enterprise reporting platforms (including SSRS/RDLC, JasperReports, FastReport, DevExpress, Telerik, and Stimulsoft), the following requirements establish what a highly portable, secure, and performant Report IR schema must achieve.

---

### 1. What Information Must Be Preserved (The Structural Blueprint)

The Report IR must serve as a complete declarative blueprint of the report’s geometry, layout, and logic, capturing all details necessary to reconstruct the visual layout on any target engine.

*   **Canvas & Physical Page Parameters:**
    *   Absolute physical dimensions: page width, page height, default orientation (portrait/landscape), and precise vertical/horizontal margins.
    *   Support for **multi-page layout definitions** within a single template file (to seamlessly accommodate cover pages, distinct data sections, and back covers).
*   **Banded Structural Hierarchies:**
    *   A standardized top-to-bottom banded canvas model. 
    *   The IR must classify bands by functional role, preserving their repeating behaviors (e.g., Report Title/Summary, Page Header/Footer, Column Header/Footer, Group Header/Footer, Detail, Child, Overlay, and "No Data" placeholder bands).
    *   **Hierarchical nested subreports** and child bands with clean parameter-mapping schemas.
*   **Geometric Element Primitives:**
    *   A gridless coordinate system ($X, Y, \text{Width}, \text{Height}$) for absolute visual placement within parent band containers.
    *   Universal visual element definitions: Text boxes/labels (with formatting, word-wrap, and truncation configurations), lines, shapes, image blocks (identifying external, embedded, or database-sourced streams), barcodes, tables, data visualization charts, and multi-dimensional matrices/crosstabs.
*   **Data Pipeline & Semantic Dictionary:**
    *   **Abstract connection schemas** detailing connection configurations, queries, parameters, and dynamic stored procedure definitions.
    *   Master-detail schema relationships (relational keys) and sorting configurations.
    *   Data source field mappings (dictionary namespaces) completely decoupled from active physical connection streams.
*   **Execution Logic, Variables, & Parameters:**
    *   Strongly typed runtime parameter namespaces (String, Integer, Float, Date, Boolean) used to drive filtering and dynamic styling.
    *   System variables (e.g., date-timestamps, page indexes, totals counters, and group row indices).
    *   Calculated fields, conditional visual style rules, and data aggregation definitions.

---

### 2. What Operations the IR Must Support (Dynamic Lifecycle Execution)

The Report IR is not merely a static storage model; it must facilitate a predictable, multi-stage processing lifecycle across target runtime interpreters.

```
                           Target Report IR Processing Flow
                           
  +-------------------+      +-------------------+      +-------------------+
  |  1. Data Ingestion | ---> | 2. Semantic AST   | ---> | 3. Band Layout &  |
  |  - Abstract Map   |      |  - Parameter Bind |      |    Paging Math    |
  +-------------------+      +-------------------+      +-------------------+
                                                                  |
  +-------------------+      +-------------------+                |
  |  6. Interactivity | <--- |  5. Serialization | <--- [Page Coordinates Tree]
  |  - Collapsing     |      |  - Vector MDC/PRNX|
  +-------------------+      +-------------------+
```

*   **Runtime Context Ingestion & Binding:**
    *   The IR must support binding to dynamic external objects, ADO.NET DataTables, generic collection iterators (`IEnumerable`), or raw JSON payloads supplied at execution time.
*   **Semantic Expression Evaluation:**
    *   Evaluating dynamic calculations, string parsing, date arithmetic, and conditional formatting switches during data iteration.
*   **Banded Page-Break & Paging Math:**
    *   Sequential processing of bands to calculate physical vertical page breaks.
    *   Calculating page-level aggregates (e.g., `PageTotal` or running counts) dynamically as records compile onto physical pages.
    *   Enforcing logical aggregation behaviors: auto-stretching vertical elements (`CanGrow`), line wrapping, and preventing orphaned headers or split rows (`KeepTogether` / `CanBreak`).
*   **Data Grouping & Aggregation:**
    *   Dynamic calculation of data ruptures based on sorting rules, inserting group headers/footers when the grouping value changes.
*   **Lossless Vector Formatting:**
    *   compiling the evaluated, data-filled visual tree into an in-memory page coordinate vector model (analogous to `.mdc` or `.prnx` documents) prior to formatting.
    *   Directing vector paint instructions smoothly to physical/thermal printers, custom screen viewers, or pluggable rendering extensions (PDF, Excel, Word, CSV, HTML, Images).
*   **Interactivity & Action Navigation:**
    *   Interactive client-side operations: dynamic sorting, dynamic group collapsing/expanding, visual drill-down pathways, and bookmark links.

---

### 3. Extensibility Requirements (Visual & Functional Growth)

To remain future-proof, the IR must provide standard extension points to integrate visual and backend capabilities without breaking the core layout schema.

*   **Custom Presentational Component Tags:**
    *   The IR schema must support open XML/JSON namespaces or metadata tags to gracefully handle custom third-party visual components. Runtimes must allow registering factories to parse and render these custom tags.
*   **User Function Registry:**
    *   An API-level declaration model where developers can register external mathematical, financial, or string-manipulation libraries as accessible expression helpers without requiring hardcoded engine modifications.
*   **Decoupled Pluggable Exporters:**
    *   The layout model must remain completely agnostic of specific document-writing dependencies (such as GDI+ or PDF libraries), allowing developers to plug in custom rendering extensions at the API level.

---

### 4. Compatibility & Portability Requirements (Cross-Platform Execution)

To be truly "vendor-neutral," the IR must solve the environmental and framework bottlenecks that historically lock reports into specific operating systems or IDEs.

*   **Cross-Platform Portability:**
    *   The IR must be serializable into a clean, platform-independent text standard (like JSON or XML) that parses identically across modern .NET Core, Java JVM, Node.js, Python, or PHP environments.
*   **Elimination of OS-Specific Graphics Dependencies:**
    *   The IR must strictly avoid dependencies on Windows-specific graphics assemblies (such as GDI+ or `System.Drawing`). On non-Windows platforms (like Linux/Alpine Docker containers), relying on these libraries breaks image rendering and PDF exports.
*   **Zero Proprietary Code References:**
    *   The schema must completely omit references to platform-specific database assemblies (such as Microsoft SqlGeography or proprietary OLEDB/ActiveX connectors) that are unsupported in modern cloud-native ecosystems.
*   **No Dependency on Active IDE Compilers:**
    *   The design-time format must compile at runtime without relying on bulky local developer SDKs (like Visual Studio RDLC designers) or programmatic Roslyn compilation assemblies, which break single-file container deployments.

---

### 5. Performance Considerations (Resource Optimization)

Reporting is notoriously CPU- and memory-intensive. The Report IR must be designed defensively to prevent memory exhaustion and processing delays in high-concurrency enterprise applications.

*   **Memory Footprint Reduction (RAM Protection):**
    *   The IR must support layout streaming APIs (like DevExpress’s `PdfStreamingExporter` or file-based virtualization/caching) to write page streams directly to disk, avoiding server-side memory exhaustion when processing millions of records.
    *   It should support segmenting large datasets into smaller chunks (such as through Report Book configurations) to release temporary heap resources page-by-page.
*   **Optimized Parser Compilation:**
    *   The template file schema must be lightweight to minimize disk I/O, supporting compression and fast-loading text-parsing caching with configurable TTL and size limits.
*   **Reflection-Free Presentational Styles:**
    *   The IR must encourage conditional styles over compiled script event handlers, allowing the rendering engine to evaluate layout adjustments via optimized, static code paths rather than slow-performing reflection.

---

### 6. Versioning Considerations (Evolvable Schemas)

A production-grade Report IR must survive decades of schema changes, layout formats, and framework upgrades.

*   **Explicit Schema Versioning:**
    *   The IR must require an explicit schema version namespace header (similar to Microsoft's RDL schema definitions) to allow parsers to execute backward-compatibility converters dynamically.
*   **Strict Structural Inheritance Controls:**
    *   To prevent infinite compilation loops or layout breaks, inherited IR layouts must enforce structural constraints: base templates must forbid nested complex components (such as Tables or Matrices), internal compiled script elements, or parameter registries.
*   **Graceful Degenerative Rendering:**
    *   Runtimes must implement fallback rules when encountering unsupported visual items or logic versions. If a runtime cannot process a niche element (such as an interactive map layer), it must render a placeholder bounding box or skip the element rather than crashing the entire rendering pipeline.
*   **Expression AST Versioning:**
    *   By serializing expressions as a parsed syntax tree (AST) rather than raw script text, the IR ensures expression calculations can be compiled safely to different languages (such as C#, Java bytecode, or Javascript) without causing runtime compatibility breaks.

---

### 7. Security Considerations (Untrusted Environments)

The design of the Report IR must treat template security as a first-class requirement, protecting multi-tenant cloud hosts from malicious exploitation.

*   **Remote Code Execution (RCE) Protection:**
    *   The IR must completely forbid compiled CodeDOM or unsandboxed script blocks within the layout definition, utilizing secure declarative serialization (XML/JSON ASTs).
*   **Escaped Query Execution:**
    *   Query parameterizations in SQL must execute strictly through parameterized dynamic data bindings rather than string concatenation, eliminating SQL injection vulnerabilities.
