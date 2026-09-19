To convert a Crystal Report (`.rpt`) file into a structured **JSON representation**, you must extract and map the underlying object model, layout constraints, database schemas, and programmatic logic that define the report's design. A `.rpt` file acts as a compiled, declarative blueprint; thus, a complete translation to JSON requires preserving several distinct modules. 

The JSON schema must capture and organize these components into the following logical structure.

---

### 1. Document Properties and Metadata
To support document identification, auditing, and indexing, the JSON must preserve the file's global attributes and statistical tracking data from the **Summary** and **Statistics** tabs of the Document Properties:
*   **Summary Attributes**: Title, Subject, Author, Keywords, and Template name.
*   **Comments**: Full comments up to hundreds of lines of text (note that while report layouts clip this to 256 characters, the database property holds the full length).
*   **Statistics**: Revision number, Creation Date, last saved author (`lastSavedBy`), and total accumulated editing time in minutes (`totalEditingTime`).
*   **Save Preview Picture**: A Boolean indicating if a thumbnail snapshot of the first page is stored.

---

### 2. Database Connectivity and Schema
The JSON structure must fully capture how the report connects to its data sources and how those tables relate to one another:
*   **Connection Information (`datasourceConnections`)**:
    *   Connection driver paths or DLLs (e.g., ODBC, OLE DB, OData, or XML).
    *   Authentication modes (e.g., SQL Server vs. Windows Integrated Security) and properties like `ServerName`, `DatabaseName`, and `UserID`.
*   **Data Entities (`tables` / `commands` / `storedProcedures`)**:
    *   **Tables**: Physical table/view names and their designer aliases.
    *   **SQL Commands**: Virtual table definitions containing the raw custom SQL query statement.
    *   **Stored Procedures**: Stored program objects and their expected input parameter mappings.
*   **Table Joins (`links`)**:
    *   Join metadata: Link Order, Link Type (Inner, Left Outer, etc.), and Join Enforcement settings (`Enforced Both`, `Not Enforced`).
    *   Field-level bindings: The specific master/lookup field pairing (e.g., `{TableA.ID} -> {TableB.ID}`).

---

### 3. Programmatic Fields and Logic
Every programmatic element managed in the **Field Explorer** must be serialized as abstract code syntax or configuration rules:

*   **Parameters (`parameterFields`)**:
    *   System details: Name, Data Type (String, Number, Date, etc.), and parameter type (Data Parameter vs. Non-Data Parameter).
    *   Input constraints: Static vs. Dynamic Lists of Values (LOV), multi-level Cascading hierarchies, Optional parameter flags, and edit masks.
*   **Formulas (`formulaFields`)**:
    *   Language rules: The code syntax used (**Crystal Syntax** vs. **Basic Syntax**).
    *   Source Code: The raw string of formula expressions (including comment lines).
*   **SQL Expression Fields (`sqlExpressionFields`)**:
    *   The SQL string evaluated directly by the database server to optimize performance.
*   **Running Total Fields (`runningTotalFields`)**:
    *   The summary configuration: Source field, summary math operation (Sum, Count, etc.).
    *   Evaluation and Reset conditions: Configured to fire on change of a field/group, for each record, or on a conditional formula evaluation.
*   **Custom Functions (`customFunctions`)**:
    *   Reusable business logic stored in the report including function name, arguments list, expected return types, and code block statements.

---

### 4. Section Layout and Page Flow Properties
A Crystal Report is built of horizontal bands. The JSON must preserve this area layout and the behaviors managed in the **Section Expert**:
*   **Section Categories**: Report Header (RH), Page Header (PH), Group Header (GH), Details (D), Group Footer (GF), Report Footer (RF), and Page Footer (PF).
*   **Section Dividers**: Identification of subsections (e.g., Details a, Details b) to control overlapping and sequential flow.
*   **Expert Settings**:
    *   Visibility toggles: Hidden (Drill-Down OK), Suppressed (No Drill-Down), and Suppress Blank Section.
    *   Spacing rules: Underlay Following Sections, New Page Before/After, and Keep Together.

---

### 5. Report Objects and Coordinates
The physical objects printed in each section must be modeled as a child array within their respective layout section. Their spatial boundaries, coordinate mappings, and structural types must be captured:
*   **Geometric Boundaries (measured in twips)**: `Top`, `Left`, `Width`, `Height`, and Guidelines alignment.
*   **Styling Attributes**: Font face family, fractional sizing (to the nearest 0.5 point), colors, and independent borders (Left, Right, Top, Bottom).
*   **CSS Classes**: Static or conditional CSS class assignments for DHTML/web rendering.
*   **Object-Specific Configurations**:
    *   *Text Objects*: Merged token fields and plain/Rich Text format interpret settings.
    *   *OLE / Graphics*: Static vs. dynamic file paths, picture boundaries, and original image color depth.
    *   *Subreports*: External path or embedded object structure, and linked parameter bindings.
    *   *Analytical Grids (Cross-Tabs, OLAP, Charts, Maps)*: Rows, Columns, summaries, layout templates, and styling presets.

---

### 6. Formatting and Conditional Overrides
The core feature of Crystal Reports is making design properties dynamic. Therefore, properties must support either a static value or a nested **formatting formula**:
*   **Conditional Font, Color, and Suppression Formulas**: JSON properties like `fontColor` or `isSuppressed` must be modeled to accept conditional formulas (e.g., checking `CurrentFieldValue` to flag exceptions).
*   **Selection Formulas**: Global Record Selection, Group Selection, and Saved Data Selection formulas, which determine what data actually makes it into Pass 1 and Pass 2 rendering.

---

### Conceptual Schema Blueprint
If visualized as a JSON structure, a parsed `.rpt` file maps cleanly to this hierarchical model:

```json
{
  "reportName": "World Sales Report",
  "documentProperties": {
    "title": "Sales Report",
    "author": "Generated by NotebookLM",
    "comments": "This report shows global sales data...",
    "revisionNumber": 4,
    "totalEditingTimeMinutes": 182
  },
  "databaseSchema": {
    "connections": [
      {
        "id": "Conn_ODBC_01",
        "type": "ODBC (RDO)",
        "server": "SQL_PROD",
        "database": "SalesDB",
        "integratedSecurity": true
      }
    ],
    "tables": [
      { "alias": "Customer", "name": "dbo.tbl_Customer", "connectionId": "Conn_ODBC_01" },
      { "alias": "Orders", "name": "dbo.tbl_Orders", "connectionId": "Conn_ODBC_01" }
    ],
    "joins": [
      {
        "sourceTable": "Customer",
        "targetTable": "Orders",
        "sourceField": "CustomerID",
        "targetField": "CustomerID",
        "joinType": "LeftOuter",
        "enforcement": "EnforcedBoth"
      }
    ],
    "customCommands": []
  },
  "programmaticFields": {
    "parameters": [
      {
        "name": "CountryParam",
        "dataType": "String",
        "promptText": "Enter Country:",
        "isOptional": false,
        "listType": "Dynamic"
      }
    ],
    "formulas": [
      {
        "name": "DaysToShip",
        "syntax": "CrystalSyntax",
        "code": "{Orders.Ship Date} - {Orders.Order Date}"
      }
    ]
  },
  "dataFilters": {
    "recordSelectionFormula": "{Customer.Country} = {?CountryParam}"
  },
  "sections": [
    {
      "name": "Report Header a",
      "abbreviation": "RHa",
      "properties": {
        "suppress": false,
        "hide": false,
        "underlay": true
      },
      "objects": [
        {
          "name": "TextLogo",
          "type": "TextObject",
          "coordinates": { "top": 100, "left": 144, "width": 2880, "height": 720 },
          "font": { "family": "Arial", "size": 12.0, "bold": true },
          "text": "Xtreme Mountain Bikes"
        }
      ]
    }
  ]
}
```

---

To build a modern, vendor-neutral reporting platform that replaces legacy systems, we can design an open-standard specification: the **OpenReport Definition Format (ORDF)**. 

ORDF abstracts proprietary formatting and processing pipelines into a declarative, engine-agnostic JSON structure. It separates data acquisition, semantic variables, layout structures, and rendering properties.

---

### Module 1: Core Document Metadata

This module tracks version control, authorship, auditing metrics, and general cataloging data. Instead of separate "Summary" and "Statistics" panels, this schema unifies global properties, change tracking, and runtime behaviors.

```json
"documentMetadata": {
  "id": "urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "title": "Global Sales and Performance Report",
  "subject": "Corporate Sales Analytics",
  "keywords": ["Sales", "Performance", "Q3", "Revenue"],
  "author": "Corporate Reporting Group",
  "comments": "Contains detailed segment metrics, regional performance, and exception logs.",
  "savePreview": true,
  "statistics": {
    "created": "2026-07-17T16:01:59Z",
    "lastModified": "2026-07-17T16:14:47Z",
    "lastModifiedBy": "Lead Analyst",
    "lastPrinted": "2026-07-16T12:00:00Z",
    "revisionNumber": 42,
    "totalEditingTimeMinutes": 182
  }
}
```

---

### Module 2: Data Source & Connection Schema

Instead of relying on proprietary data link libraries or local connection files, ORDF decouples raw database access from report semantics. It manages connections, physical entities (tables), custom query definitions (commands), and relationships (joins).

```json
"dataSchema": {
  "connections": [
    {
      "id": "Conn_Primary_SQL",
      "type": "relational",
      "provider": "PostgreSQL",
      "connectionString": "Host=prod-db.corp;Port=5432;Database=SalesWarehouse;",
      "authentication": {
        "type": "databaseAccount",
        "userName": "reporting_reader",
        "passwordEncrypted": "U2FsdGVkX19..."
      }
    }
  ],
  "entities": [
    {
      "alias": "Customer",
      "name": "public.tbl_customers",
      "connectionId": "Conn_Primary_SQL"
    },
    {
      "alias": "Orders",
      "name": "public.tbl_orders",
      "connectionId": "Conn_Primary_SQL"
    }
  ],
  "customQueries": [
    {
      "alias": "RegionalMetrics",
      "connectionId": "Conn_Primary_SQL",
      "sqlStatement": "SELECT region, SUM(amount) as regional_total FROM public.tbl_orders GROUP BY region"
    }
  ],
  "relationships": [
    {
      "sourceEntity": "Customer",
      "targetEntity": "Orders",
      "sourceKeys": ["CustomerID"],
      "targetKeys": ["CustomerID"],
      "joinType": "LeftOuter",
      "enforce": "EnforcedBoth",
      "operator": "Equal"
    }
  ]
}
```

#### Mapping Rationale
*   **joinType**: Maps Outer/Inner joins.
*   **enforce**: Decouples "Enforced Both" or "Not Enforced" properties, ensuring SQL compilers write optimized queries even if fields are omitted from the canvas.
*   **operator**: Supports conditions like "Not Equal" (`!=`) or "Equal" (`=`).

---

### Module 3: Semantic Variables & Computational Fields

This section replaces Field Explorers and proprietary syntax with standard declarations. It manages parameters, calculated expressions, running summaries, and reusable custom functions.

```json
"semanticVariables": {
  "parameters": [
    {
      "name": "TargetRegion",
      "dataType": "String",
      "prompt": {
        "text": "Please select a regional division:",
        "type": "Dynamic",
        "isOptional": false,
        "allowMultipleValues": false,
        "valueDescriptionSource": {
          "entityAlias": "Customer",
          "valueField": "RegionID",
          "descriptionField": "RegionName"
        }
      }
    }
  ],
  "expressions": [
    {
      "name": "DaysToShip",
      "language": "Javascript",
      "code": "return (new Date(datum['Orders.ShipDate']) - new Date(datum['Orders.OrderDate'])) / (1000 * 60 * 60 * 24);"
    }
  ],
  "runningSummaries": [
    {
      "name": "RunningOrderTotal",
      "targetField": "Orders.OrderAmount",
      "operation": "Sum",
      "evaluateCondition": "onRecordChange",
      "resetTrigger": {
        "type": "onGroupChange",
        "groupField": "Customer.Region"
      }
    }
  ],
  "customFunctions": [
    {
      "name": "AbbreviateAmount",
      "returnType": "String",
      "arguments": [
        { "name": "val", "type": "NumberValue" }
      ],
      "code": "if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'; if (val >= 1000) return (val / 1000).toFixed(1) + 'K'; return val.toString();"
    }
  ]
}
```

#### Mapping Rationale
*   **expressions**: Uses JavaScript as a universal formula engine instead of proprietary Basic or Crystal syntaxes.
*   **valueDescriptionSource**: Replaces List of Values (LOV) structures, dynamically binding value fields (e.g., ID) to user-friendly description fields (e.g., Name).
*   **runningSummaries**: Relplaces the Running Total Expert. It explicitly defines target fields, operations (e.g., Sum, Average), increment parameters, and reset actions.

---

### Module 4: Logical Section Layout

A report canvas is made of horizontal bands. This module organizes those bands into hierarchical layout blocks and configures section-level behaviors.

```json
"layoutSchema": {
  "canvasSettings": {
    "pageOrientation": "Portrait",
    "paperSize": "Letter",
    "margins": { "top": 720, "bottom": 720, "left": 720, "right": 720 }
  },
  "sections": [
    {
      "id": "sec_report_header_a",
      "type": "ReportHeader",
      "properties": {
        "suppress": { "static": false },
        "hide": false,
        "newPageAfter": true,
        "keepTogether": true,
        "underlay": false
      },
      "objects": []
    },
    {
      "id": "sec_details_a",
      "type": "Details",
      "properties": {
        "suppress": {
          "formula": "return datum['Orders.OrderAmount'] === 0;"
        },
        "hide": false,
        "keepTogether": false,
        "suppressIfBlank": true
      },
      "objects": []
    }
  ]
}
```

#### Mapping Rationale
*   **type**: Maps logical areas (Report Header, Page Header, Group Header, Details, Group Footer, Page Footer, Report Footer).
*   **suppress**: Supports either a simple Boolean or a conditional code override (e.g., hiding a section if zero or based on database conditions).
*   **underlay**: Retains underlay options [RH/GH properties] to support printing side-by-side elements or watermarks.

---

### Module 5: Canvas Visual Elements (The Object Model)

Visual objects are placed inside their respective section array (`objects`). Coordinates are modeled in standard floating-point millimeters (or pixels) instead of twips.

```json
"objects": [
  {
    "id": "obj_text_title",
    "type": "TextObject",
    "geometry": { "x": 10.0, "y": 5.5, "width": 120.0, "height": 15.0 },
    "style": {
      "font": { "family": "Helvetica", "size": 16.0, "bold": true },
      "alignment": { "horizontal": "Center", "vertical": "Middle" },
      "border": {
        "bottom": { "style": "DoubleLine", "color": "#000000", "thickness": 1.0 }
      },
      "backgroundColor": "transparent"
    },
    "properties": {
      "content": "Quarterly Sales Report",
      "canGrow": true,
      "textInterpretation": "none"
    }
  },
  {
    "id": "obj_field_sales",
    "type": "FieldObject",
    "geometry": { "x": 150.0, "y": 10.0, "width": 40.0, "height": 8.0 },
    "style": {
      "font": { "family": "Helvetica", "size": 10.0 },
      "alignment": { "horizontal": "Right" },
      "fontColor": {
        "formula": "return datum['Orders.OrderAmount'] > 10000 ? '#00FF00' : '#000000';"
      }
    },
    "properties": {
      "binding": "Orders.OrderAmount",
      "dataFormat": {
        "type": "Currency",
        "currencySymbol": "$",
        "decimalPlaces": 2,
        "suppressIfZero": true
      }
    }
  },
  {
    "id": "obj_subreport_01",
    "type": "NestedReport",
    "geometry": { "x": 0.0, "y": 20.0, "width": 200.0, "height": 50.0 },
    "properties": {
      "reportSource": "urn:uuid:abc12345-def6-7890-1234-567890abcdef",
      "isOnDemand": true,
      "linkParameters": [
        {
          "masterField": "Customer.CustomerID",
          "childParameterName": "Sub_CustomerID"
        }
      ]
    }
  }
]
```

#### Mapping Rationale
*   **canGrow**: Preserves dynamic line-height and text flow formatting options.
*   **fontColor.formula**: Implements clean conditional formatting, replacing the Highlight Expert or Formula Workshop. It lets you write conditional statements returning hex codes (or styling tokens) based on field evaluations.
*   **NestedReport (Subreports)**: Implements unlinked or linked nested definitions. By tracking `isOnDemand` and `linkParameters`, the layout engine knows whether to load resources on page initialization or render a client-side hyperlink.

---

### System Metadata Integration

To complete this specification, the report engine must handle special fields like pagination or dates. These are implemented as reserved keywords in the dataset bindings:

```json
{
  "id": "obj_page_number",
  "type": "FieldObject",
  "geometry": { "x": 180.0, "y": 5.0, "width": 20.0, "height": 5.0 },
  "properties": {
    "binding": "system.page_number",
    "dataFormat": {
      "type": "String",
      "template": "Page {value} of {system.total_pages}"
    }
  }
}
```

By referencing `system.page_number` and `system.total_pages`, the engine automatically routes compilation into a multi-pass structure during rendering, calculating the final page boundaries before outputting the document.

