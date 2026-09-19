### Fonts
*   **Default Settings**: The default font for all report sections is set to **Arial, 10 point**. This default setting can be globally adjusted for new reports and new report objects in the default Options dialog box.
*   **TrueType Formatting**: Crystal Reports recommends designing exclusively with common **TrueType fonts**. If unique printer-specific fonts are used and the output is viewed on a system where those fonts are missing, Crystal Reports automatically substitutes the font, which can lead to unpredictable layouts, overlapping fields, and spacing inconsistencies.
*   **Fractional Sizes**: Font sizes can be set manually on the Font tab of the Format Editor. Crystal Reports supports fractional entries (such as `1.5`, `2.5`, `3.5`, etc.) between `1` and `1638`, and automatically rounds any custom typed value to the nearest **0.5 point** interval.
*   **Line and Character Spacing**: Line spacing can be formatted on the Paragraph tab of the Format Editor as a multiple of the active font size or as an exact point value. Character spacing can be customized on the Font tab. 
*   **Dynamic Line Height**: Vertical spacing is determined at print time by the printer driver. The physical height of a line dynamically adjusts to accommodate the text-based object containing the largest font size placed on that line.
*   **Worksheet Formatting**: When formatting OLAP grids or worksheets, font attributes are **additive**; for example, setting a column dimension to *Italic* and a row dimension to *Bold* will result in *Bold Italic* formatting at their intersecting cells.

---

### Colors
*   **Basic vs. Custom Colors**: Accessible via the **Color dialog box**, Crystal Reports displays a standard grid of pre-defined "Basic colors" (often used to visually represent data ranges, such as bright blue for high-performing metrics and darker blues for lower ones) and allows users to save dynamic, custom-configured colors to a "Custom colors" palette.
*   **Attribute Application**: Users can apply background fill colors to text objects, database fields, formulas, and lines through the Border tab of the Format Editor.
*   **Dynamic Coding Constants**: Inside the Formula Workshop, colors can be applied programmatically using **Color Constants**. All constant functions in Crystal Syntax and Basic Syntax are prefixed with "cr" (e.g., `crRed` which holds a numeric value of `255`, `crGreen` at `32768`, or `crBlack`). Legacy shorthand constants without the "cr" prefix (e.g., `Red`) are supported for backward compatibility but are not recommended.
*   **Cross-Tab Row and Column Coloring**: Users can color entire Cross-Tab rows or columns by opening the Customize Style tab of the Cross-Tab Expert and choosing a color from the Background Color drop-down list.
*   **OLAP Worksheet Highlighting**: Exception highlighting in OLAP worksheets defaults to green, yellow, and red cell backgrounds to indicate performance thresholds, though these are customizable. Predefined visual schemas may fail to display correctly if the active client workstation's screen resolution is restricted to 256 colors.
*   **Viewer Controls**: In runtime applications, developers can programmatically override the `BackColor` of the `CrystalReportViewer` control on-the-fly using standard system color conversions or session state.

---

### Borders
*   **Directional Lines**: Using the Border tab of the Format Editor, borders can be configured independently for the **Left, Right, Top, and Bottom** edges of an object frame. Line styles include **single, double, dashed, and dotted** formats.
*   **Tight Horizontal**: By default, borders are uniform in width across all printed iterations. Selecting the **Tight Horizontal** check box tells the engine to dynamically trim the left and right border boundaries to match the precise character width of each individual record's value.
*   **Drop Shadows**: A print-ready drop shadow effect can be enabled to render directly below and to the right of the object boundary. *Note: If rounded corner sizing is enabled on a box shape, the drop shadow option is automatically disabled.*
*   **Visualizations and Maps**: Borders can also be added or reformatted for visual elements (such as charts, maps, and OLE graphics) to adjust line thickness, line style, color, or drop shadow properties.
*   **Expert Highlighting**: The Highlighting Expert provides rapid border-style formatting alongside background and font color settings based on value thresholds.

---

### Conditional Formatting
*   **Highlighting Expert**: A wizard-based dialog that provides a simplified alternative to manual coding. It conditionally formats all field types (Number, Currency, String, Boolean, Date, Time, DateTime) based on their own values or the values of another field in the report. Users can stack multiple formatting rules and set evaluation precedence using **Priority arrows**.
*   **Formula Workshop Override**: For advanced rules, designers can select the `x+2` conditional formula button next to any property in the Format Editor. Conditional formulas **always override** absolute formatting settings.
*   **On/Off Boolean Formulas**: Used for properties with binary states (e.g., Suppress). The formula must evaluate to a Boolean `True` or `False`.
*   **Conditional Attribute Formulas**: Used for multi-state attributes (such as colors, alignments, or borders). These return constant attributes loaded directly into the workshop (e.g., `crRed`, `crBlack`, `SingleLine`, `LeftAligned`) using `If-Then-Else` structures.
*   **Specialized Formatting Functions**:
    *   `CurrentFieldValue`: Accesses the value of the active cell being formatted. This is the only way in the formula language to conditionally evaluate and format individual cells in a Cross-Tab or OLAP grid.
    *   `DefaultAttribute`: Refers to the default styling of the field. It is a critical best practice to append `Else DefaultAttribute` at the end of conditional formatting formulas so unmatched records keep their native formatting.
    *   `GridRowColumnValue`: Accesses row or column header coordinates to conditionally format cell intersections in Cross-Tabs or OLAP grids.
*   **Parameter-Driven Highlighting**: Highlighting rules can reference user-prompted parameter fields (e.g., `If {Customer.Sales} > {?SalesTarget} Then crRed Else crBlack`) to dynamically color-flag data according to changing business rules selected at runtime.

---

### Suppression
*   **Object Suppression**: Found on the Common tab of the Format Editor, the **Suppress** property prevents selected objects from printing or rendering on-screen. The blank canvas space where the object would have appeared remains intact.
*   **Suppress If Duplicated**: Prevents consecutive repeating values from printing in an iteration of the same section. It compares raw record values (not formatted representations) and is ignored in the first Detail section of a page. *Note: This feature does not support text objects containing embedded fields.*
*   **Suppress If Zero**: Located under the Number tab's Customize menu, this suppresses numeric or currency values from printing if their value equals zero, while preserving their designated spacing on the layout.
*   **Section Suppression**: Under the Section Expert, **Suppress (No Drill-Down)** hides an entire section and completely blocks it from being navigated or drilled into. This property can be applied statically or dynamically using a formula.
*   **Suppress Blank Section**: Hides a section if it contains no printable data or if all objects inside it are suppressed. If an object inside the section yields a value, the section instantly renders visible.
*   **Suppress Blank Subreport**: A property on the Subreport tab of the Format Editor that, when paired with "Suppress Blank Section" in the Section Expert, eliminates the vertical white space occupied by a subreport when it returns no records.
*   **XML Schema Suppression**: When exporting reports to Legacy XML format, developers can select **Suppress XML Tag** or **Suppress All Children** to exclude specific layout elements from the exported schema.

---

### Visibility
*   **Hide (Drill-Down OK)**: Set in the Section Expert, this property hides a section during normal report viewing but keeps its contents available in the background. Users can double-click summary fields or use the **Group Tree** to drill down and open a temporary tab displaying those hidden details. This is an **absolute property** and cannot be controlled conditionally using a formula.
*   **Design-Time Visibility**: Within the default Options dialog box, the **Show Hidden Sections** check box allows designers to see hidden and suppressed sections during Design mode. Objects inside these sections are shown on a distinctive gray background.
*   **Viewer Controls**: Developers can programmatically toggle the visibility of client-side toolbar buttons, status bars, group trees, and page views in the `CrystalReportViewer` class by altering properties (such as `HasExportButton`, `HasPrintButton`, `DisplayToolbar`, or `DisplayGroupTree`).

---

### Rotation
*   **Degree Options**: Text objects, database fields, and formula fields can be rotated on the Common tab of the Format Editor. Supported angles of rotation are **90 degrees** and **270 degrees** counter-clockwise. Leaving the field at `0 degrees` formats the text horizontally from left to right.
*   **Impact on Can Grow**: Setting a field to 90 or 270 degrees of rotation automatically **clears and disables the "Can Grow" option**. This means rotated text cannot dynamically expand vertically to prevent text truncation.
*   **Overflow Boundaries**: Vertically rotated text that extends beyond the physical page boundaries cannot be displayed or rendered on the report.
*   **3D Chart Rotations**: 3D charts support viewing angle changes (e.g., standard angle, from the top, or custom rotated walls on the X, Y, and Z axes) via the Advanced Options 3D viewing display windows.

---

### Alignment
*   **Horizontal Alignment**: Includes **Left, Center, Right, and Justified** options on the Common tab of the Format Editor. Horizontal alignment can also be applied conditionally using formulas.
*   **Right-to-Left (RTL) Support**: Crystal Reports supports right-to-left reading orders for multilingual reports. For single RTL languages, alignment can be set to *Right*. For multi-language reports, a conditional formula can check a database language indicator to assign alignment dynamically:
    `If {UnicodeData.Right_to_Left} Then crRightAligned Else crLeftAligned`.
*   **Paragraph Indentation**: Controlled on the Paragraph tab of the Format Editor, letting users specify exact left and right margin indentations in inches or centimeters.
*   **Layout and Snap Grids**: To ensure precise alignment, designers can utilize a visible **Design Grid** and enable **Snap to Grid** under default settings, which forces newly placed elements to snap to the nearest row and column coordinates.
*   **Guidelines**: Non-printing, snap-enabled vertical and horizontal lines. Placing fields automatically generates guidelines. Snapping multiple fields to a single guideline locks them together; dragging the guideline moves and resizes all snapped fields simultaneously. Using guidelines is highly recommended to prevent layout shifts when exporting to page-based formats like Word, Excel, or HTML.
*   **Horizontal Locking (Relative Positions)**: Selecting **Relative Positions** in the Section Expert locks the horizontal gap between a text object and a horizontally expanding grid object (such as a Cross-Tab). Regardless of how wide the grid grows at runtime, the text object is pushed to the right to maintain its precise spacing.
*   **Designer Alignment Tools**: In the designer, selecting multiple objects allows users to quickly format them together using shortcuts: **Align Lefts, Align Centers, Align Rights, Align Tops, Align Middles, Align Bottoms, Same Width, or Same Height**.

---

### Styles
*   **Wizards and Predefined Templates**: When using the Standard Report Creation Wizard or Mailing Label Wizard, designers can select a predefined style from the **Report Style** screen to apply a formatted layout template to the entire report.
*   **Cross-Tab and OLAP Style Presets**: Built-in color and grid styles (including presets like *Original, Basic - Blue, Sepia, Dijon, Honey Mustard, Beach Blue, Jeans,* and *Grape Gelato*) can be chosen from the Cross-Tab and OLAP Experts to instantly style analytical grids.
*   **Cascading Style Sheets (CSS)**: To support web-based reporting, designers can assign a static or conditional class name in the **CSS Class Name** field of any object or section in the designer. The formatting characteristics of that class (e.g., `.classname { background-color: 808080; font-weight: bold; }`) are then defined in the project's `.aspx` file or an external style sheet, which is applied when the viewer renders the report into HTML.
*   **Format Painter**: Copies absolute or conditional formatting properties from a selected source object and applies them to one or more target objects. If target objects are different field types, only common properties (such as borders and fonts) are modified.
*   **Template Field Objects (`<TemplateField>`)**: Used in the Field Explorer to establish standard layout and formatting blueprints for fields in the same section. Multiple template fields can be defined to apply different styled themes to fields within the same report section.

