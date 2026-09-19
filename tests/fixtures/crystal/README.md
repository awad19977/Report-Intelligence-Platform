# Crystal Report Fixtures

Place only sanitized reports here. A fixture must contain no production credentials, patient/customer data, proprietary logos, or confidential business logic.

The first Milestone 1 fixture should be a small read-only report named `simple-table.rpt`. Record its purpose and SHA-256 hash when it is approved for repository use.

To run the opt-in real-worker test, set:

- `CRYSTAL_WORKER_PATH` to the built `CrystalWorker.exe`.
- `CRYSTAL_TEST_REPORT` to the sanitized `.rpt` file.
- `RIP_ALLOWED_REPORT_ROOTS` to the fixture directory.

Then run:

```powershell
npm test --workspace=@rip/mcp-server
```

The test hashes the report before and after `read_report` and fails if the file changes.
