### Crystal Reports Architecture

The architecture of a Crystal Report spans data routing, database offloading, a programmatic runtime model, and a core multi-pass execution engine.

#### 1. The Three-Pass Processing Model
The heart of Crystal Reports' architecture is its **three-pass reporting method**, which determines when and how data is read, evaluated, and formatted. This architecture allows the report to handle complex formatting and formula manipulation efficiently:

*   **Pass 1**: Crystal Reports begins by reading raw database records. In this pass, the engine performs record retrieval, evaluates simple recurring formulas that do not reference subtotals (known as **"WhileReadingRecords"** evaluation), applies local record selection if the formula is too complex for the database, sorts and groups records, calculates group subtotals and summaries, and renders basic charts or cross-tabs based entirely on database fields. The resulting records and totals are then saved into memory and temporary files as **"saved data"**.
*   **Pre-Pass 2**: The engine reviews the group instances saved in Pass 1 to order them for **Top/Bottom N** reporting or **Hierarchical Grouping**. No database records are re-read during this step.
*   **Pass 2**: Pages are formatted **on-demand** as they are requested by the user. In this pass, the engine evaluates group selection formulas, calculates running totals, evaluates PrintTime formulas (marked **"WhilePrintingRecords"**, which usually reference subtotals or summaries), and processes OLAP grids, subreports, and charts that depend on running totals or PrintTime formulas.
*   **Pass 3**: If the report contains the special fields **"Page N of M"** or **"Total Page Count"**, the engine performs a third pass to finish processing and calculate the final page count before displaying these values.

#### 2. Client/Server and Database Offloading
When connected to an SQL database, the Crystal Reports architecture acts as an SQL client, generating a query (visible via "Show SQL Query") to offload processing to the database server. 
*   **Pushing Down Record Selection**: To optimize performance, the architecture is designed to translate the report's record selection formula into an SQL `WHERE` clause. The database server filters the records first, returning a minimized dataset to Crystal Reports, which may then perform a second stage of local filtering if the selection formula contains non-SQL elements.
*   **Server-Side Grouping**: The architecture supports pushing sorting and grouping down to the server using SQL `GROUP BY` and aggregate clauses, which ensures only summary data is transferred over the network, minimizing workstation memory consumption.

#### 3. Programmatic Runtime Models (SDK)
At runtime, Crystal Reports exposes several hierarchical object-oriented programming models:
*   **ReportDocument Object Model**: The recommended model for local or unmanaged applications. It serves as a gateway to Engine namespace classes such as `Database`, `DataDefinition` (which controls fields, formulas, and parameters), and `ReportDefinition` (which handles layout and formatting).
*   **ReportClientDocument Object Model**: Used in enterprise environments with a Report Application Server (RAS). It exposes the entire report structure programmatically at runtime, allowing developers to dynamically create, modify, and save report definitions and data structures.
*   **CrystalReportViewer Control**: The presentation layer that binds to a report object and displays it to the user, managing client-side events like zooming, page navigation, and drill-downs.

---

### Components of a `.rpt` File

A Crystal Report file (`.rpt`) is a self-contained document template that packages database connection instructions, data retrieval definitions, processing logic, layout formatting, and (optionally) static data:

1.  **Database Connection and Linking Schema**: Instructions on how to connect to data sources (e.g., ODBC, OLE DB, SAP BW, XML, or Object Collections), along with table definitions and linking relationships (e.g., table joins, link orders, and SQL commands).
2.  **Fields**: Various data placeholders accessible through the Field Explorer:
    *   *Database Fields*: Direct references to columns in database tables.
    *   *Formula Fields*: Executable expressions written in Crystal or Basic syntax (identified with an `@` prefix, e.g., `{@my_formula}`).
    *   *Parameter Fields*: Dynamic prompt variables populated by the user at runtime (identified with a `?` prefix, e.g., `{?my_parameter}`).
    *   *Running Total Fields*: Running calculations evaluated on a record-by-record basis (identified with a `#` prefix, e.g., `{#my_running_total}`).
    *   *SQL Expression Fields*: SQL-specific formulas evaluated directly by the database server (identified with a `%` prefix, e.g., `{%my_sql_expression}`).
    *   *Group Name Fields*: Field representations used to label groups.
    *   *Special Fields*: Generated metadata such as Page Number, Print Date, Data Date, and Total Page Count.
3.  **Custom Functions**: Reusable, stateless custom business logic procedures written in Crystal or Basic syntax that are saved directly inside the `.rpt` file with no external dependencies.
4.  **Layout and Graphical Objects**: Rendered objects placed on the report canvas, including:
    *   *Text Objects*: Static labels, headings, and combined text blocks.
    *   *Graphical Objects*: Bitmaps, lines, boxes, and shapes (circles, ellipses).
    *   *Analytical Grids and Visualizations*: Charts, geographic maps, Cross-Tabs, and OLAP grids.
    *   *OLE Objects*: Embedded or linked external documents (such as Paint bitmaps).
5.  **Subreports**: Freestanding reports embedded within the primary report, which can be linked to the main report data or left unlinked. These can be configured as **on-demand subreports** (which appear as hyperlinks and retrieve data only when clicked).
6.  **Lists of Values (LOV)**: Stored metadata rules used to populate dynamic or cascading parameter prompts at runtime.
7.  **Document Properties (Metadata)**: File details such as Title, Subject, Author, Keywords, Comments, Revision Number, and statistical tracking data (Creation Date, Last Saved, Last Printed, and Total Editing Time).
8.  **Saved Data (Optional)**: A snapshot of the database records retrieved during the last run, allowing the report to be viewed or exported offline without hitting the active database.

---

### Crystal Report Structural Hierarchy

The logical structure of a Crystal Report is represented hierarchically. The model flows from the root document container down through areas, sections, lines, and finally individual formatted layout objects:

```text
[Root] Report
   │
   ├── Document Properties & Metadata (Title, Subject, Author)
   │
   ├── Database Connections & Schema (Tables, Joins, Commands)
   │
   ├── Formulas, Parameter Definitions, & Custom Functions
   │
   └── Area Pairs (Level-based layout containers)
         │
         └── Report Area (Header or Footer)
               │
               └── Report Section (e.g., Page Header, Details, Group Footer)
                     │
                     └── Lines (Horizontal baselines adjusted by height)
                           │
                           └── Formatted Report Objects
                                 ├── Text Objects
                                 ├── Field Objects (Database, Formula, Parameters)
                                 ├── Graphical Objects (Lines, Boxes, Bitmaps)
                                 ├── Charts & Geographic Maps
                                 ├── Cross-Tabs & OLAP Grids
                                 └── Subreports (with their own internal sections)
```

#### Detailed Structural Hierarchy Breakdown

1.  **Report Root (`<Report>`)**: The primary class wrapper representing the entire `.rpt` file. It contains all global properties, document metadata, database schemas, and global formulas.
2.  **Formatted Area Pairs (`<FormattedAreaPair>`)**: Structural regions that logically link headers and footers (e.g., Report Header / Report Footer, Page Header / Page Footer, or Group Header / Group Footer).
3.  **Formatted Area (`<FormattedArea>`)**: Specifies a high-level area of the report (e.g., Header, Detail, or Footer).
4.  **Formatted Sections (`<FormattedSections>`)**: Subdivisions of an area. While an area contains a single default section, developers can use the Section Expert to split areas into multiple independent subsections (e.g., "Report Header a", "Report Header b").
5.  **Formatted Section (`<FormattedSection>`)**: An individual section instance (such as the Page Header section or Details section). Each section is composed of:
    *   **Lines**: Horizontal positions where text-based objects align to a baseline. The height of a line adjusts dynamically based on the largest font size or object placed on it.
6.  **Formatted Report Objects (`<FormattedReportObjects>`)**: The final child nodes in the hierarchy. These are the actual visual and analytical elements placed inside a section's lines (such as Text fields, Database fields, Cross-Tabs, and Subreports).
