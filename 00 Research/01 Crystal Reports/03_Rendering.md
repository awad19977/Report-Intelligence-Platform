The canvas of a Crystal Report is structured into distinct horizontal bands called **areas** and **sections**. When you first create a report, the design tab automatically populates with five default areas, which can be further subdivided or expanded into multiple subsections using the Section Expert. When grouping is added, the engine automatically injects Group Header and Group Footer areas. 

The purpose, formatting behavior, and rendering characteristics of each report section, along with their precise execution interactions, are detailed below.

---

### The 7 Report Sections

#### 1. Report Header (RH)
*   **Purpose**: Generally used for the report’s title, corporate logo, cover page, and introductory metadata.
*   **Unique Rendering & Timing**: Evaluated and printed exactly **once** at the very beginning of the report process. Any formulas placed here are computed once before database records are read (BeforeReadingRecords). 
*   **Analytical Behavior**: Charts and Cross-Tabs placed in the Report Header process and represent summarized data for the **entire report**.
*   **Formatting Tricks**: 
    *   **Title Page Creation**: By placing the "Report Title" special field in the Report Header and checking **New Page After** in the Section Expert, the Report Header functions as a dedicated, standalone title page.
    *   **Watermarks & Logos**: Using the **Underlay Following Sections** option makes any image (such as a company logo) placed in the Report Header print *behind* or *beside* the sections that follow it.

#### 2. Page Header (PH)
*   **Purpose**: Used for column headers, page-specific indicators (like chapter names, print date, or document title), and other information that must appear at the top of every page.
*   **Unique Rendering & Timing**: Evaluated and printed at the top of **each new page**. Formulas placed in this section are evaluated once per page, at the beginning of each page's formatting cycle.
*   **Field Titles**: When database fields are dragged into the Details section, Crystal Reports automatically places corresponding, underlined field titles directly in the Page Header.
*   **Limitations**: Charts and Cross-Tabs **cannot be placed** in the Page Header section.
*   **First Page Suppression**: If you have a title page in your Report Header, you can suppress the Page Header on page one by writing a conditional suppression formula in the Section Expert: `PageNumber = 1`.

#### 3. Group Header (GH)
*   **Purpose**: Triggered and created automatically when you sort and group report data. It typically holds the **Group Name field** to identify the current group boundary.
*   **Unique Rendering & Timing**: Prints exactly **once** at the beginning of each new group instance. Formulas placed here are evaluated once per group, right as the group initiates.
*   **Analytical Behavior**: Charts and Cross-Tabs placed in this section display and calculate data filtered strictly for the **current group instance**.
*   **Live Headers**: Using formula fields as grouping targets dynamically generates live group headers (e.g., grouping by the first letter of a company name automatically prints "A", "B", "C" as the header of each group).

#### 4. Details (D)
*   **Purpose**: The central body of the report where the individual, raw database records are displayed. 
*   **Unique Rendering & Timing**: Re-prints and iterates **once for every single record** returned from the database. If the query returns 10,000 records, the Details section prints 10,000 times. Formulas placed here are evaluated on a record-by-record basis.
*   **Performance Impact**: Placing linked subreports in the Details section severely impacts performance because the engine must execute a fresh, separate database query for **every single detail record**.
*   **Limitations**: Charts and Cross-Tabs **cannot be placed** in this section.
*   **Formatting Tricks**:
    *   **Multiple Columns**: The Details section can be formatted to print in multiple columns, allowing records to flow from column to column (across-then-down or down-then-across) to save horizontal space.
    *   **Alternating Blank Lines**: Creating multiple Detail sections (Details a, Details b) lets you insert a blank line after every $N$ records by conditionally suppressing Details b with a formula like `Remainder(RecordNumber, 5) <> 0`.

#### 5. Group Footer (GF)
*   **Purpose**: Created in tandem with the Group Header to hold summaries, subtotals, and group totals.
*   **Unique Rendering & Timing**: Prints exactly **once** at the end of each group instance. Formulas placed in this section are evaluated once at the end of the group, allowing they to securely reference group calculations.
*   **Analytical Behavior**: Just like the Group Header, any charts or Cross-Tabs placed here represent data filtered strictly to the **current group instance**.

#### 6. Page Footer (PF)
*   **Purpose**: Used for displaying page numbers (e.g., "Page N of M"), print dates, or report confidentiality notices at the bottom of each page.
*   **Unique Rendering & Timing**: Prints at the **very bottom of every page**. Formulas are evaluated once per page, at the end of each page's formatting cycle.
*   **Limitations**: Charts and Cross-Tabs **cannot be placed** in the Page Footer.
*   **White Space Control**:
    *   **Suppress on Page One**: The Page Footer can be conditionally suppressed on the first page of the report using the conditional suppression formula `PageNumber = 1`.
    *   **Clamp Page Footer**: Selecting this option in the Section Expert removes unused page margin space by placing the Page Footer immediately beneath the last visible detail or group footer section instead of anchoring it statically to the bottom of the physical page.

#### 7. Report Footer (RF)
*   **Purpose**: Generally used for displaying grand totals, summary narratives, signature lines, or final appendices.
*   **Unique Rendering & Timing**: Prints exactly **once** at the very end of the report, immediately after the final Group Footer. Formulas in this area are evaluated once at the absolute conclusion of the report.
*   **Analytical Behavior**: Charts and Cross-Tabs placed here calculate and display data for the **entire report**. If you want to merge multiple unrelated reports together, you can import them as subreports and stack them sequentially inside multiple Report Footer sections (Report Footer a, Report Footer b, Report Footer c).

---

### How Sections Interact During Rendering

The way sections behave and print is controlled by the **Three-Pass Processing Model** and section properties configured in the Section Expert:

#### 1. Vertical Printing Order
Sections always print from **top to bottom** in the exact order they appear in the Designer. If an area is split into multiple subsections (e.g., Page Header a, Page Header b, Page Header c), those subsections will print sequentially in alphabetical order before moving to the next area. Keep in mind that a section **cannot be resized smaller than the combined height of all objects** placed inside of it.

#### 2. Three-Pass Evaluation & Layout Intersections
*   **Pass 1**: The engine retrieves records, evaluates `WhileReadingRecords` formulas, groups the data, and calculates summaries and grand totals. All charts and Cross-Tabs based on raw database fields are built.
*   **Pre-Pass 2**: Group instances are sorted for Top/Bottom N grouping or Hierarchical Grouping.
*   **Pass 2**: Pages are formatted **on-demand**. This is where section-level formatting properties are applied page by page:
    *   **Running Totals**: Placing a running total field in different sections yields different results because of Pass 2 execution. For example, placing a running total field in the **Report Header** only displays the value of the very first record. Placing it in the **Details** section accumulates values record-by-record, while placing it in the **Report Footer** displays the correct grand total of the entire report.
    *   **Variables Flow**: You can pass data across sections by placing a formula in the Details section that accumulates values into a global variable, and then referencing that global variable in a Group Footer or Report Footer formula to display the computed total.
    *   **Group Selection**: Because group selection formulas filter data during Pass 2 page rendering (after Pass 1 summaries have already calculated), standard summary fields can print incorrect values on reports with group selection. To fix this, developers must use **Running Total Fields** or client-side variables, which are evaluated during page formatting in Pass 2.
*   **Pass 3**: If the Page Footer contains a Page Count special field (`Page N of M` or `Total Page Count`), the engine is forced to perform a third pass to determine the final page length before rendering. This disables on-demand page streaming and forces the client to wait until the entire dataset is compiled.

#### 3. Section Expert Interactions
*   **Hide (Drill-Down OK) vs. Suppress (No Drill-Down)**: 
    *   Setting a section to **Hide** keeps it hidden during the initial run but allows users to double-click a group name or summary field to drill down and open a temporary tab showing those details. Hiding details is the foundation for creating performant, web-friendly **Summary Reports**.
    *   Setting a section to **Suppress** permanently blocks it from printing, and it cannot be revealed through drill-down. This property can be controlled dynamically using conditional formulas.
*   **Underlay Following Sections**: When enabled, the current section underlays the subsequent sections. This allows you to print a chart or watermark (such as an employee photo or company background) side-by-side with the matching detail records, rather than having the chart print awkwardly ahead of the data.
*   **Preventing Overwrite (Subreports & Can Grow)**: If you place a text block with **Can Grow** enabled or a linked subreport inside a section, it may overwrite fields placed directly below it. To resolve this, you should split the area into multiple subsections (e.g., Details a and Details b) and place the objects below the growing object in their own separate subsection. Details a will finish printing and expand dynamically before Details b begins rendering.

