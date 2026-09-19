### Tables
In a relational database, data is structured into rows (records) and columns (fields). Crystal Reports accesses this data by bringing database tables into the report template. Inside the report engine, these tables are managed as data sources.
*   **The Database Expert**: Developers select and add database tables, views, or stored procedures to a report using the **Data tab** of the Database Expert. The designer supports relational databases, local data files, XML, OData, and enterprise platforms like SAP (including transparent, pool, and cluster tables).
*   **Table Performance and Indexing**: Retrieving data is highly optimized if database tables are **indexed** on linked fields. While relational SQL servers handle query filtering on the server, local PC data files rely heavily on physical indexes to avoid slow, full-table scans by the local workstation's report engine.

### Joins
When a report requires data from two or more tables, they must be linked on a common field so records match on a record-by-record basis.
*   **Links Tab**: Joining is configured using the **Links tab** of the Database Expert. You drag a field from a primary ("link from") table to a lookup ("link to") table.
*   **Relationship Types**: Links support **one-to-one** (e.g., an employee table linked to employee addresses) and **one-to-many** relationships (e.g., a customer table linked to an orders table).
*   **Join Types**: Crystal Reports supports multiple join types, including **Inner Joins**, **Left Outer Joins**, and **Right Outer Joins**. Outer joins are translated into ODBC standard escape syntax or native database syntax depending on the driver being used.
*   **Join Enforcement**: In the Link Options, a join can be set to **Not Enforced** (only used if fields from both tables are on the report canvas) or **Enforced Both** (forces the join to be included in the SQL statement even if no fields from the lookup table are physically displayed).
*   **Link Order**: The sequence in which multiple tables are joined is configurable (via Order Links) and directly impacts both query execution performance and the final retrieved dataset.

### Commands
For complete control over data retrieval, developers can write their own custom SQL statement rather than adding raw database tables.
*   **SQL Command Objects**: When created using the **Add Command** node in the Database Expert, the query behaves as a virtual Table object within the report's field schema.
*   **Syntax Preservation**: The report engine submits manually written Commands **directly to the database** without altering SQL syntax, meaning escape characters or quotes must be manually written to match the specific database driver.
*   **Command Scope**: Commands are strictly limited to **data retrieval (DML)**. Syntax like `SELECT`, `FROM`, `WHERE`, `GROUP BY`, and `UNION` is supported, but database manipulation commands such as `CREATE TABLE`, `INSERT`, `UPDATE`, or `DELETE` are blocked.
*   **Command Parameters**: Parameters can be created directly inside the SQL query editor (formatted as `{?MyParameter}`) to filter data on the database server.

### Stored Procedures
A stored procedure is a precompiled SQL program residing and running directly on the database server.
*   **Database Configuration**: To make stored procedures visible in the database tree, the **Stored Procedures** checkbox must be enabled in the report's Database Options.
*   **Input and Runtime Prompts**: If a stored procedure expects input variables or arguments, the Crystal Reports prompting engine automatically detects them and prompts the user for values when the report is executed.
*   **Performance Advantage**: Stored procedures are highly recommended when reporting off massive datasets or running reports that demand complex, server-side pre-processing before returning a clean summary dataset.

### Parameters
Parameters act as dynamic variables inside selection formulas, Commands, stored procedures, or layout rules. They are classified into two critical performance types:
*   **Data Parameters**: Parameters used directly in record selection formulas, SQL Commands, or stored procedures. Modifying a data parameter **forces a database refresh** to pull a newly filtered dataset from the server.
*   **Non-Data Parameters**: Parameters used in saved-data selection formulas, conditional formatting, or text titles. Modifying these **filters the saved data locally** within the report file, completely avoiding database processing overhead.
*   **Prompts and Lists of Values (LOV)**: Parameters can be populated via **static prompts** (values saved inside the `.rpt` file) or **dynamic prompts** (populated from external database lookups on-demand). **Cascading parameters** guide users through sequential prompts (e.g., selecting Country, then Region, then City). They can also be marked as **optional** so users do not have to provide a value.

### SQL Generation
When connected to an SQL-compliant client/server database, Crystal Reports translates your report structure into Structured Query Language. The exact generated SQL can be inspected by selecting **Show SQL Query** from the Database menu.
*   **SELECT, FROM, and WHERE Clauses**: The select list is generated based on fields dragged onto the canvas, the FROM list lists active tables, and table links are translated into the `WHERE` clause or ANSI `JOIN` syntax.
*   **Pushing Down Record Selection**: The engine evaluates the record selection formula and attempts to convert it into the SQL `WHERE` clause (e.g., `{Orders.Order Date} < #Jan 1, 2001#` translates to a server-side filter). This is called **"pushing selection down"** and ensures the database server handles the filtering, minimizing network traffic.
*   **Pushdown Failure**: If local formula functions (such as `Year()` or complex IF-THEN-ELSE statements) are used in record selection, the engine cannot translate them into SQL. Consequently, the SQL query is generated *without* a `WHERE` clause, forcing the engine to fetch all database records over the network to perform local evaluation in Pass 1/Pass 2 on the workstation.
*   **Perform Grouping on Server**: By enabling this option in Report Options, the engine generates `GROUP BY` clauses to offload aggregations directly to the SQL server, reducing local workstation memory requirements.
*   **SQL Expression Fields**: Written in raw SQL, these let designers inject database-specific calculations directly into the generated query, ensuring sorting and grouping on those calculations occur on the server.

### Data Binding
In application development (e.g., .NET Web or Windows applications), report objects are integrated into the runtime using specialized controls:
*   **Viewer Binding**: The `CrystalReportViewer` control **binds to a report object** (such as a `ReportDocument` instance), not a raw database object. The report object itself encapsulates all internal data connectivity and database logons.
*   **Binding Options**:
    *   *Direct File Path*: Binding the viewer to a `.rpt` path on disk.
    *   *ReportDocument Model*: Instantiating a `ReportDocument` object, programmatically running `Load(reportPath)`, and assigning the object as the viewer's `ReportSource`.
    *   *Declarative Controls*: Using a `CrystalReportSource` control in ASP.NET to declare report links and parameters directly in XML markup.
*   **Passing Runtime Data (SetDataSource)**: Instead of letting the report query the database, developers can populate an ADO.NET **DataSet**, **DataTable**, or an **IDataReader** object in application code and pass the populated data object directly to the report engine using `ReportDocument.SetDataSource()`.

### Runtime Execution
Once compiled or previewed, the report engine executes database communication through a series of structured steps:
*   **Thread-Safe Database Drivers**: The report engine utilizes multi-threading. When using thread-safe database drivers (such as `crdb_odbc.dll`, `crdb_jdbc.dll`, or `crdb_ado.dll`), the engine can handle multiple concurrent database requests simultaneously, which is critical for web application performance.
*   **Passing Logon Credentials**: In secure databases, login credentials are set programmatically at runtime by looping through the tables in the `Database.Tables` collection, modifying `TableLogOnInfo`, and applying the configuration using `Table.ApplyLogOnInfo()` before binding to the viewer.
*   **The Execution Passes**: 
    *   *Pass 1*: The generated SQL query is sent to the database. Records are retrieved, simple `WhileReadingRecords` formulas are executed, local selection filtering occurs, and data sorting/grouping is completed. The resulting recordset is cached as **saved data**.
    *   *Pass 2*: Page formatting runs on-demand. Local running totals, group selections, and `WhilePrintingRecords` formulas are executed against the saved dataset.

