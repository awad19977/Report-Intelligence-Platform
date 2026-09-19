### Supported Report Objects in Crystal Reports

The visual and analytical elements placed inside report sections are treated programmatically and structurally as **report objects**. Below is the complete catalog of report objects supported by Crystal Reports, detailed by their purpose, properties, hierarchy, and rendering behaviors.

---

### 1. Text Object
*   **Purpose**: Holds static text used to create titles, labels, or headings, and dynamically merges database or formula fields to construct custom form letters.
*   **Properties**: 
    *   `Object Name`: The programmatic identifier used in Report Part hyperlinks.
    *   `CSS Class Name`: Can be set statically or conditionally via a formula.
    *   `Suppress`: Absolute or conditional hide toggle.
    *   `Horizontal Alignment` and `Keep Object Together`.
    *   `Repeat on Horizontal Pages`: Repeats the text block on additional horizontal pages created by expanding grids.
    *   `Can Grow`: Enables vertical dynamic height resizing to prevent text truncation.
    *   `Text Interpretation`: Formats text rendering (e.g., "none" for plain text or "RTF Text" to interpret Rich Text formatting).
    *   `Width` & `Height`.
*   **Parent**: Directly owned by a specific report section's `ReportObjects` collection. Can snap to designer grid coordinates.
*   **Children**: None natively, but can act as a parent container to hold **embedded database fields**, formula fields, parameter fields, or special fields inside its text flow.
*   **Rendering Behavior**: 
    *   Evaluates and prints according to its parent section (once at the beginning of the report in the Report Header, once per page in the Page Header, once per record in the Details area, etc.).
    *   During export to page-based formats (Microsoft Word, Excel, or HTML), any text objects placed between lines are shifted to the closest available line in the output.
    *   Can be displayed as a standalone **Report Part** in the `CrystalReportPartsViewer`.

---

### 2. Field Object (Database, Formula, Parameter, Running Total, SQL Expression, Special, Summary)
*   **Purpose**: Renders dynamic data on the report canvas.
    *   *Database Fields*: Display columns from connected tables.
    *   *Formula Fields* (`{@formula}`): Execute calculations written in Crystal or Basic syntax.
    *   *Parameter Fields* (`{?parameter}`): Prompt user inputs to filter data or modify layout.
    *   *Running Total Fields* (`{#running_total}`): Calculate running values record-by-record.
    *   *SQL Expression Fields* (`{%sql_expression}`): Offload specific formulas to the database.
    *   *Special Fields*: Return metadata like Page Number, Print Date, Total Page Count, and Report Comments.
    *   *Summary/Group Name Fields*: Calculate subtotal/grand totals and represent group names.
*   **Properties**: 
    *   `Object Name` and `CSS Class Name` (with conditional formula support).
    *   `Suppress` and `Suppress If Duplicated` (prevents consecutive repeating values in the section).
    *   `Horizontal Alignment` and `Keep Object Together`.
    *   `Repeat on Horizontal Pages`.
    *   *Field Options*: `Show Field Names` (displays structural name), `Show Object Names` (displays designer alias), or `Show Format Symbols` (displays formatted visual outputs like currency separators).
*   **Parent**: Programmatic child of a report `Section`'s `ReportObjects` collection.
*   **Children**: None (terminal leaf node, though `<TemplateField>` can define formatting blueprints).
*   **Rendering Behavior**: 
    *   *Engine Passes*: Simple database fields render in **Pass 1**. PrintTime formulas (`WhilePrintingRecords`), Running Totals, and percentages are computed in **Pass 2**. Special fields like `Page N of M` force a **Pass 3** evaluation, meaning the user must wait for the entire report to process before the first page displays.
    *   If a numeric field exceeds its object frame's width and clipping is disabled, it renders as number signs (`######`).
    *   Exporting to Word or Excel snaps these objects to the closest line.

---

### 3. Chart Object
*   **Purpose**: Presents summarized data in visual layouts (Pie, XY Scatter, Radar, etc.) to analyze trends and support drill-down.
*   **Properties**: 
    *   `Object Name`, `CSS Class Name`, and `Suppress`.
    *   `Repeat on Horizontal Pages`.
    *   `Chart Layout`: Configured via the Chart Expert (e.g., Advanced, Group, Cross-Tab, or OLAP layout).
    *   `Width` & `Height`.
*   **Parent**: Limited to the Report Header/Footer or Group Header/Footer. **Cannot be placed** in the Page Header, Page Footer, or Details section.
*   **Children**: None programmatically (legend text and labels are internal visual items).
*   **Rendering Behavior**: 
    *   If placed in the Report Header or Footer, it renders once and processes data for the entire report. If placed in the Group Header/Footer, a distinct chart renders for each group instance containing only that group's data subset.
    *   *Engine Passes*: Simple charts generate in Pass 1, while charts based on running totals, PrintTime formulas, or Cross-Tabs are processed in Pass 2.
    *   *Viewer Rendering*: In web applications, the engine generates a temporary JPG on the server for each page load. BLOB objects like charts **are not exported** in Legacy XML format.

---

### 4. Map Object
*   **Purpose**: Renders geographic maps directly inside reports based on geographic database attributes.
*   **Properties**: 
    *   `Object Name`, `CSS Class Name`, `Suppress`, and `Repeat on Horizontal Pages`.
    *   `Width` & `Height`.
*   **Parent**: Report Header/Footer or Group Header/Footer. **Cannot be placed** in Page Header, Page Footer, or Details section.
*   **Children**: None.
*   **Rendering Behavior**: 
    *   *SDK Support Warning*: Map objects are **not supported** in the unupgraded unmanaged SDK (`SAP Crystal Reports, developer version for Microsoft Visual Studio`) and will render completely blank.
    *   Follows the same execution rules as charts, rendering once per report or group based on Pass 1/Pass 2 calculations.

---

### 5. Cross-Tab Object
*   **Purpose**: A compact analytical grid displaying grouped and summarized values in two directions (rows and columns).
*   **Properties**: 
    *   `Object Name`, `CSS Class Name`, `Suppress`, and `Repeat on Horizontal Pages`.
    *   `Rows`, `Columns`, and `Summarized Fields` (configured via Cross-Tab Expert).
    *   `Embedded Summary`: Incorporates additional calculations (such as percentage of total) inside cells without adding columns or rows.
    *   `Group Sort`: Can apply Top/Bottom N grouping strictly on rows (group sorting is **not supported** on columns).
*   **Parent**: Report Header/Footer, Group Header/Footer, or nested inside Subreports. **Cannot be placed** in Page Header, Page Footer, or Details section.
*   **Children**: Contains cell objects, row headings, column headings, and column/row totals.
*   **Rendering Behavior**: 
    *   Because Cross-Tabs expand horizontally and vertically based on data, they dynamically span multiple pages.
    *   Total columns can be configured to print at either the beginning or end of each row, or at the top/bottom of each column.
    *   Generates in Pass 1 if based on database fields, or Pass 2 if using running totals or PrintTime formulas.

---

### 6. OLAP Grid Object
*   **Purpose**: A multi-dimensional grid designed specifically to parse and represent OLAP cube dimensions in three, four, or more dimensions.
*   **Properties**: 
    *   `Object Name`, `CSS Class Name`, `Suppress`, and `Repeat on Horizontal Pages`.
    *   `Break Hierarchies`: Toggles whether to disregard parent/child relationships to sort members strictly on cell values.
    *   `Row and Column Dimensions`.
*   **Parent**: Placed inside report sections. Note: OLAP grids are **not supported** in the Visual Studio developer SDK, and reports containing them will fail to open.
*   **Children**: programmatically contains grid members, parent/child member sets, headers, and cells.
*   **Rendering Behavior**: 
    *   Supports dynamic interactions in web page viewers, enabling users to click the plus/minus symbols next to parent members to drill down/up levels on-demand.
    *   Calculated and rendered entirely during **Pass 2** of the processing model.

---

### 7. Subreport Object
*   **Purpose**: A freestanding report nested inside a main report, used to combine unrelated datasets, link uncoordinatable tables, or display distinct layouts.
*   **Properties**: 
    *   `Object Name`, `CSS Class Name`, and `Suppress`.
    *   `On-Demand Subreport`: Generates the subreport as a hyperlink that loads and queries data **only when clicked**.
    *   `Subreport Links`: Programs parameter bindings to coordinate main report keys with subreport selection criteria.
*   **Parent**: Can be inserted into **any section** of the primary report.
*   **Children**: Contains its own fully realized report structure (including tables, fields, formulas, sections, and formatting options).
*   **Rendering Behavior**: 
    *   *Performance Impact*: If a linked subreport is placed in the Details section, the report engine must generate and query a separate database statement for **every single record** printed in the main report (e.g., 100 details = 100 subreport queries).
    *   To optimize web traffic, placing subreports as "On-Demand" causes the engine to skip processing until clicked.
    *   Processed exclusively during **Pass 2** of the engine.
    *   Cannot be targeted as a navigation destination from another hyperlink.

---

### 8. OLE Object (including Bitmaps, Pictures, and BLOB Fields)
*   **Purpose**: Integrates pixel-based graphics or vector objects from server applications (Paint, Excel, etc.) to view or edit them in-place.
*   **Properties**: 
    *   `Object Name`, `CSS Class Name`, `Suppress`, and `Repeat on Horizontal Pages`.
    *   `OLE Type`: Configured as Embedded OLE, Static OLE, Dynamic Static OLE, or Linked OLE.
    *   `Retain Original Image Color Depth`.
*   **Parent**: Programmatic child of a report section's `ReportObjects` collection.
*   **Children**: None programmatically (integrates OLE server controls during activation).
*   **Rendering Behavior**: 
    *   *Dynamic Graphics (Dynamic Static OLE)*: If a file path or URL string is stored in the database, Crystal Reports uses a conditional formatting path formula to dynamically load and display different images per record during runtime. They are resolved only upon refreshing the report. Note: Platforms like SAP BusinessObjects only cache the snapshot image at scheduling time.
    *   *Linked OLE*: Evaluates a live reference link; double-clicking launches the host server app. If a link is broken, the object permanently degrades into a static stand-alone picture.
    *   BLOB/OLE fields are **not exported** when outputting to Legacy XML.

---

### 9. Line Object
*   **Purpose**: Vertical or horizontal formatting lines used to split visual regions on the report canvas.
*   **Properties**: 
    *   `Suppress`.
    *   `Line Style`: Standard drawing attributes (e.g., SingleLine, DashedLine).
    *   Coordinates, width, and length.
*   **Parent**: Placed inside report sections.
*   **Children**: None.
*   **Rendering Behavior**: 
    *   Prints with the parent section.
    *   Cannot be chosen as a destination target for Report Part hyperlinks.

---

### 10. Box Object
*   **Purpose**: Visual border rectangles drawn around fields, labels, or entire sections.
*   **Properties**: 
    *   `Suppress`.
    *   `Border Line Style` and `Fill Color`.
*   **Parent**: Placed inside report sections.
*   **Children**: None.
*   **Rendering Behavior**: 
    *   Frames specified boundaries on print; cannot be selected as hyperlinked Report Part destinations.

