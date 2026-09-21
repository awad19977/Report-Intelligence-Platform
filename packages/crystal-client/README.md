# @report-intelligence/crystal-client

Public schemas and a validated stdio client for the Report Intelligence Platform Crystal worker protocol.

This package does **not** include SAP Crystal Reports runtime components or the production Windows worker. Supply a compatible worker executable separately and comply with its license and SAP redistribution terms.

## Install

```sh
npm install @report-intelligence/crystal-client
```

## Example

```ts
import { CrystalWorkerClient } from "@report-intelligence/crystal-client";

const client = new CrystalWorkerClient({
  workerPath: "C:\\path\\to\\crystal-worker.exe",
});

try {
  await client.connect();
  const result = await client.readReportResult("C:\\reports\\sample.rpt");
  console.log(result.data.metadata, result.warnings);
} finally {
  await client.disconnect();
}
```

The result-returning methods preserve structured worker warnings. Convenience methods such as `readReport`, `readMetadata`, `extractSql`, `readFormulas`, and `readSubreports` return only the validated data.

## License

LGPL-3.0-only. The separate production worker is not covered by this package license.
