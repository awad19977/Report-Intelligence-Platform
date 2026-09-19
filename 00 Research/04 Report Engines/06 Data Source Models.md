### Data Sources & Connections
*   **SSRS / RDLC**: SSRS utilizes Shared or Embedded Data Sources (`.rds` files or definitions stored in the `.rdl` layout) to establish connection contexts. Conversely, the client-side **RDLC LocalReport engine is completely decoupled from direct database connections**; it does not connect to databases or execute SQL queries. It delegates all connection, retrieval, and schema mapping responsibilities to the host application's data access layers.
*   **JasperReports**: Natively interacts either with a direct **`java.sql.Connection` database connection** or an abstract record iterator implementing the `JRDataSource` interface. Default implementations include wrapping JDBC result sets (`JRResultSetDataSource`) or in-memory arrays and collections of JavaBeans (`JRBeanArrayDataSource`, `JRBeanCollectionDataSource`).
*   **FastReport**: Stores connection parameters as a connection string and database schema inside the report file. Connection strings are kept encrypted to protect credentials, with options for custom keys. It supports connecting directly to MS SQL, Oracle, Interbase, and Access, or reading local XML/XSD file models.
*   **Stimulsoft Reports**: Integrates a massive list of built-in SQL database connections (including MS SQL, MySQL, PostgreSQL, Oracle, Firebird, MongoDB, OData, and ODBC). Since **client-side JavaScript (Reports.JS) cannot natively connect to remote databases**, Stimulsoft utilizes a middle software layer of **server-side data adapters (implemented in Node.js, PHP, .NET Core, Python, or Java)** to act as the query bridge.
*   **Telerik Reporting**: Uses the visual **`SqlDataSource` component** to configure connection properties. It requires a valid .NET data provider, a connection string, and access privileges to bind database fields.

---

### Datasets
*   **SSRS / RDLC**: SSRS defines datasets as shared or embedded collections within the report file, mapping queries to visual structures. **RDLC accepts data as in-memory structured .NET objects** passed from the host code, accepting ADO.NET `DataTable` objects, standard `DataSet` schemas, or generic custom business object collections mapped to report-level sources.
*   **JasperReports**: Implements a dedicated, non-visual **`<subDataset>` element** (along with an implicit report-level main dataset). Datasets act as non-visual logical wrappers containing parameters, fields, variables, and groups. They are referenced to gather chart series data or perform data bucketing for crosstabs.
*   **FastReport**: Exposes dataset structures through table or query classes derived from `TfrxCustomDataset` (VCL) or managed C# datasets.
*   **Stimulsoft Reports**: Uses a dedicated **`DataSet` object (e.g., `Stimulsoft.System.Data.DataSet`)** containing targeted, built-in utility methods to parse and load structured schema formats like XML, JSON, and Excel. 
*   **DevExpress Reports**: Natively supports design-time and runtime data binding, connecting seamlessly to SQL, Entity Framework models, XML, JSON, MongoDB, Excel, CSV, and composite data models.

---

### SQL Queries
*   **SSRS / RDLC**: SSRS embeds the raw SQL query string inside the dataset definition tags of the RDL file. RDLC does not execute queries; the host application executes database queries independently and binds the resulting records.
*   **JasperReports**: Specified inside the report template within the `<queryString>` tag. At runtime, queries are compiled and resolved by a modular **Query Executer API** (supporting built-in query executers like `SQLQueryExecuter`, `HibernateQueryExecuter` for HQL, `XPathQueryExecuter`, `MdxQueryExecuter`, and `JRXmlaQueryExecuter` for remote XMLA services).
*   **FastReport**: Embeds query definitions directly in the report template. It represents queries programmatically through DB engine components (e.g., VCL class structures like `TfrxCustomQuery` with `SQL` properties) or standard .NET query connectors.
*   **Stimulsoft Reports**: Maps queries to the dictionary through the `SqlCommand` property of the `StiSqlSource` object. For web deployments, the client engine sends a POST request containing the `queryString` to the backend server handler, which executes the SQL query and returns rows/columns inside a unified JSON structure.
*   **Telerik Reporting**: Configures select statements in the `SqlDataSource` using either Visual Studio's built-in query designer or the standalone report query builder.

---

### Stored Procedures
*   **SSRS**: Natively executes stored procedures from the target database by configuring the dataset's query type to `StoredProcedure` inside SSDT or Report Builder.
*   **JasperReports**: Supports stored procedure calls inside SQL query strings, but **imposes strict JDBC constraints**: the stored procedure must return a `java.sql.ResultSet` and cannot contain `OUT` parameters. This ensures the procedure can be called via a standard `PreparedStatement` instead of requiring a `CallableStatement`.
*   **FastReport**: Executes stored procedures natively through standard query/stored procedure components registered inside database engine wrappers.
*   **Stimulsoft Reports**: Invokes stored procedures via backend database controllers by setting the execution command type to `StiDataCommand::Execute`.
*   **Telerik Reporting**: Supports stored procedures through the `SqlDataSource` wizard. It provides workarounds to run stored procedures that utilize temporary tables.

---

### Parameters
*   **SSRS / RDLC**: SSRS parameters are stored in a centralized `Parameters` collection, mapping directly to SQL dataset variables. In RDLC, subreport parameter definitions must be strictly aligned: corresponding parameters in child reports must match parent datatypes exactly, or the local engine will fail.
*   **JasperReports**: Parameters are passed as a `java.util.Map`. In SQL, JasperReports supports two distinct parameter syntaxes:
    *   **`$P{ParamName}`**: Evaluated as standard SQL `PreparedStatement` bind parameters.
    *   **`$P!{ParamName}`**: Replaces the query string text dynamically *before* SQL compilation (used for dynamic table or column substitutions).
    *   In HQL and MDX, `$P{..}` syntax behaves as standard string substitution.
*   **FastReport**: Exposes parameters inside its visual data window [Image 7]. Parameters can be registered programmatically via the options panel (`report1.SetParameterValue`).
*   **Stimulsoft Reports**: Variables can act as SQL parameters by toggling the "Allow using as SQL parameter" property in the variable editor. At runtime, developers can intercept parameters in the `onBeginProcessData` event to programmatically inject or modify parameter keys/values. Stimulsoft automatically escapes parameter values to block SQL injection.
*   **Telerik Reporting**: Supports parameter binding inside the `SqlDataSource` component. Recognized parameters are mapped inside a design-time grid where their database types (`DbType`) can be bound to report parameters or expressions.

---

### Multiple Databases
*   **SSRS**: Natively supports reports drawing from multiple independent shared or embedded data sources (e.g., querying SQL Server, Oracle, and DB2 simultaneously on a single canvas).
*   **JasperReports**: The core `JasperFillManager` is designed to execute against a single `java.sql.Connection` context. To build reports drawing from multiple independent databases, JasperReports utilizes **Subreports** or **Dataset Runs**. Each subreport or dataset run can receive its own unique database connection object via the `REPORT_CONNECTION` parameter, enabling separate queries against distinct database instances.
*   **FastReport**: Allows multiple database connection components (such as VCL `TfrxADODatabase` objects) to be saved inside a single template file, allowing the report to query different databases simultaneously.
*   **Stimulsoft Reports**: Natively supports multiple distinct database connections in a single report dictionary. Connection objects are added to the dictionary (`report.Dictionary.Databases.Add(oDataDatabase)`), and each individual data source query is assigned to a specific connection.
*   **DevExpress Reports**: Natively supports multiple data sources, composite data feeds, and federated data models inside a single report definition.

---

### Runtime Data Binding
*   **SSRS / RDLC**: SSRS processes server-side rendering pipelines to bind datasets automatically upon execution. RDLC requires manual data binding at runtime; developers must populate the data in code and explicitly append it to the local control container via the `LocalReport.DataSources` collection.
*   **JasperReports**: Achieved programmatically by instantiating and filling a custom `JRDataSource` object, then passing it to the `JasperFillManager` at report-filling time.
*   **FastReport**: Bound programmatically by registering datasets with the engine via the parent application (`report.RegisterData(...)`). It also supports dynamic binding directly to business objects that implement the standard `IEnumerable` interface.
*   **Stimulsoft Reports**: Programmers bind data dynamically in code using the `report.regData(dataSet)` or `report.RegData(name, dataSet)` methods. In client-side JS environments, custom results can be programmatically pushed into result rows during events like `onEndProcessData`.
*   **Telerik Reporting**: Natively supports runtime binding to custom business objects, ADO.NET data, and custom XML or ORM models.

---

### Connection Management
*   **SSRS**: Connection caching, security credentials, pooling, and server configurations are managed centrally inside the native mode `ReportServer` databases.
*   **JasperReports**: Completely delegates connection management to the host application, which supplies a valid JDBC `Connection` object to the fill manager. This allows developers to use standard application-server connection pooling frameworks natively.
*   **FastReport**: Recommends routing database calls through the shared, parent application connection to maintain thread safety and prevent connection exhaustion. While individual connection components (like VCL ADO databases) can be initialized per report run, this pattern can cause performance overhead and connection delays.
*   **Stimulsoft Reports**: Connection parameters are typically saved inside report templates, but can be modified dynamically prior to generation in code using dictionary properties. For web deployments, the **`onDatabaseConnect` event** can be used to alter connection settings or pass an already established database connection instance directly to the engine.
*   **Telerik Reporting**: Exposes two connection approaches: **Embedded connections** (connection string is saved directly inside the template's `SqlDataSource.ConnectionString` property) or **Shared connections** (connection string is stored by name in the project's CONFIG file under the `<connectionStrings>` element, parsed at runtime via standard .NET `ConfigurationManager` tools).

