**Formula fields** are dynamic placeholders used to calculate, manipulate, and format data when the raw database fields do not provide the exact information needed for a report. Located in the Field Explorer, formulas can be used as standalone report fields, for record and group selection, for parameter prompting, or to drive conditional layout and formatting.

---

### 1. Formula Language (Crystal vs. Basic Syntax)

Crystal Reports provides two distinct programming languages for creating formulas, and they can be mixed across different fields in the same report (though a single formula can only use one syntax):

*   **Crystal Syntax**: 
    *   **Expression-Based**: Crystal syntax is the native default language of Crystal Reports. It treats the entire formula as a sequence of expressions separated by semicolons (`;`). 
    *   **Implicit Returns**: The value returned (and printed on the report) is always the result of the very last expression in the formula sequence.
    *   **Assignment**: Variables are assigned values using a colon and an equals sign (`:=`).
*   **Basic Syntax**:
    *   **Statement-Based**: Modeled closely on Microsoft Visual Basic and VBScript, Basic syntax is designed for developers who are already familiar with those languages. 
    *   **Explicit Returns**: It returns a value to the report canvas by assigning that value to a special un-declared variable named **`formula`** (e.g., `formula = 10`). 
    *   **Type Restriction**: Once the special `formula` variable is assigned a value of one data type, it cannot be assigned a different data type later in the same formula.
*   **Functional Limits**: Unlike Crystal syntax, record selection and group selection formulas **cannot** be written in Basic syntax—they must use Crystal syntax.

---

### 2. Evaluation Timing

The Crystal Reports engine processes data in sequential stages, and formulas are evaluated at different stages depending on their components or when the developer explicitly forces their execution:

*   **BeforeReadingRecords (Pre-Pass 1)**: Evaluates **constant formulas** that return a fixed value (e.g., `100 * 30`). These formulas do not reference database fields and are evaluated only once at the beginning of report generation.
*   **WhileReadingRecords (Pass 1)**: Evaluates **recurring formulas** that reference database fields but do not contain summaries or subtotals. During Pass 1, database records are read, sorted, grouped, and summarized. 
*   **WhilePrintingRecords (Pass 2)**: Evaluates **PrintTime formulas** that depend on page layout, summaries, running totals, subreports, OLAP grids, or group selections. 
*   **EvaluateAfter(x)**: An evaluation time function that forces a formula to run only **after** a specified formula `x` has been completed. This is crucial for coordinating formulas that interact through global variables.

---

### 3. Variable Scope

Variables are declared placeholders used to store temporary values during formula execution. They must be declared with a specific data type before use and can be configured with three levels of scope:

*   **Local Variables**: Declared using the `Local` or `Dim` keywords. They are restricted entirely to a **single formula** and a **single evaluation** of that formula. Formulas in other report fields cannot access their values. They are the most efficient variables and do not cause naming conflicts across different fields.
*   **Global Variables**: The default scope if no keyword is specified in Crystal syntax. They share the **same memory block** and values across all formulas in the **main report**, but they are **not accessible to subreports**. You cannot declare a global variable with the same name as a different type in another formula (e.g., declaring `Global z As Date` in one formula will block `Global z As Number` in another).
*   **Shared Variables**: Declared using the `Shared` keyword. They share values across the **main report and all of its subreports**. To pass a value, the variable must be declared and assigned in the sending report before being declared and read in the receiving report.
*   **Default Values**: Uninitialized variables automatically take on default values (such as `0` for numbers and `""` for strings). However, explicitly initializing variables is highly recommended as a best practice.

---

### 4. Running Totals

Running totals are incrementing summaries that calculate values record by record. They are identified on the report canvas by a **`#` prefix**. There are two ways to build them:

#### The Running Total Expert
The expert creates a running total by configuring three sets of rules:
1.  **Field and Summary Type**: The target database or first-pass formula field to analyze, and the mathematical operation to apply (such as `sum`, `average`, `count`, `minimum`, or `maximum`).
2.  **Evaluate Condition**: Determines when the value increments. It can evaluate **for each record**, **on change of a database field**, **on change of a group**, or dynamically **using a formula**.
3.  **Reset Condition**: Determines when the accumulator returns to zero. Options include **never** (a continuous grand total), **on change of field**, **on change of group**, or **using a formula**.

#### Placement Impact
Where a running total is placed on the report canvas changes the value it displays:
*   **Report Header**: Displays only the value of the **first record**.
*   **Details Section**: Displays the **current accumulated value** up to that record.
*   **Report Footer**: Displays the **final completed total** for the entire report.

#### Formula-Based Running Totals (The Three-Formula Method)
If data is suppressed or relies on Pass 2 `WhilePrintingRecords` logic, the Running Total Expert cannot be used. Instead, developers write **three manual formulas**:
1.  **Reset Formula**: Declares a global/shared variable and sets it to zero (placed in a group or page header):
    `WhilePrintingRecords; CurrencyVar myTotal := 0;`
2.  **Summary Formula**: Increments the variable on detail records (placed in the Details section):
    `WhilePrintingRecords; CurrencyVar myTotal := myTotal + {Orders.Order Amount};`
3.  **Display Formula**: Displays the final accumulated value (placed in a group or report footer):
    `WhilePrintingRecords; CurrencyVar myTotal;`

---

### 5. Conditional Formatting

Formatting is categorized as **absolute** (formatting that always applies) or **conditional** (formatting that applies only when specific criteria are met).

#### Formula Workshop vs. Highlighting Expert
*   **Highlighting Expert**: A simplified, wizard-style dialog box that formats borders, fonts, and background colors based on a field's value without writing code. It is quick but lacks full formula flexibility.
*   **Formula Workshop**: Accessible via the `x+2` button next to properties in the Format Editor. Formatting formulas written here override any absolute, static settings in the Format Editor.

#### Formatting Formula Types
1.  **On/Off Properties (Boolean)**: Used for properties that have only two states (e.g., Suppress). The formula must return a Boolean `True` or `False`.
2.  **Attribute Properties**: Used for multi-state choices like colors or border styles. These use `If-Then-Else` structures and return specialized constant values like **`crRed`**, **`crGreen`**, or **`crBlack`**.

#### General Purpose Formatting Functions
*   **`CurrentFieldValue`**: References the value of the active cell being formatted. Essential for conditionally formatting Cross-Tab or OLAP grid cells.
*   **`DefaultAttribute`**: Refers to the default formatting of the field. Always include an `Else DefaultAttribute` clause in If-Then-Else formatting formulas so unmatched values retain their original format.
*   **`GridRowColumnValue`**: Accesses row or column header values to format intersection cells in Cross-Tabs or OLAP grids.

---

### 6. Syntax Comparison Examples

#### A. Basic Calculated Field (Days to Ship)
Calculates the variance between two database columns.
*   **Crystal Syntax**:
    ```crystal
    {Orders.Ship Date} - {Orders.Order Date}
    ```
*   **Basic Syntax**:
    ```basic
    formula = {Orders.Ship Date} - {Orders.Order Date}
    ```

#### B. Conditional Suppress (First Page of Report)
Conditionally hides a page footer or header on page one.
*   **Crystal Syntax**:
    ```crystal
    PageNumber = 1
    ```
*   **Basic Syntax**:
    ```basic
    formula = PageNumber = 1
    ```

#### C. Variable Accumulation (While Reading Records)
Increments a global counter as raw database records are read in Pass 1.
*   **Crystal Syntax**:
    ```crystal
    WhileReadingRecords;
    Global NumberVar x;
    x := x + 1
    ```
*   **Basic Syntax**:
    ```basic
    WhileReadingRecords
    Global x As Number
    x = x + 1
    formula = x
    ```

#### D. Conditional Font Color (Sales Target Flag)
Highlights sales numbers based on a dynamic user parameter.
*   **Crystal Syntax**:
    ```crystal
    If {Customer.Last Year's Sales} > {?SalesTarget} Then
        crRed
    Else
        crBlack
    ```
*   **Basic Syntax**:
    ```basic
    If {Customer.Last Year's Sales} > {?SalesTarget} Then
        formula = crRed
    Else
        formula = crBlack
    End If
    ```

