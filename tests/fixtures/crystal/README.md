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

## Golden JSON

`mock-report.golden.json` is the platform-independent golden artifact for the complete mock-worker report. Its `filePath` uses the stable `<REPORT_PATH>` placeholder, and its expected MCP output includes redacted secrets plus structured warnings. Real sanitized `.rpt` fixtures must add their own expected normalized JSON and warning artifacts when approved.

## Candidate real fixture

`Orders10k.rpt` is currently present at the repository root as a local, ignored candidate fixture.

- Size: 52,736 bytes
- SHA-256: `B426C24C6D6B21643B4066E246365F7F9D69503168B9B89285602B7C6A33FFCD`
- Real worker/MCP read: all 10 advertised extraction tools passed
- Before/after SHA-256 verification: passed
- Saved-data flag: true
- Connection information returned by the worker: none
- Download source: [benbrahim777/Crystal-Reports](https://github.com/benbrahim777/Crystal-Reports)
- Upstream file: [Orders10k.rpt](https://github.com/benbrahim777/Crystal-Reports/blob/master/Orders10k.rpt)
- Upstream description: course-created Crystal Reports using SAP's Xtreme sample data
- Redistribution license: none declared by the upstream repository
- Sanitization/redistribution approval: blocked until explicit permission is obtained or the fixture is replaced
- Project decision: local integration testing only; a sanitized replacement will be created later
- Host Crystal licensing confirmation: pending

Do not commit the binary or a full extracted golden artifact. A public GitHub repository without a license does not grant general permission to reproduce or distribute its contents. The report remains suitable for local read-only integration testing while a cleared fixture is sourced.

## Additional local stress fixture

`HIS_ClaimOfCustomerSummary.rpt` is used only for local structural testing.

- Size: 110,592 bytes
- SHA-256: `B6B004D94325E6E8F6A7E8F8D4F23C73F0D7D60F85C482C42B0915AD03CAC1ED`
- Saved-data flag: false
- All 10 advertised extraction tools: passed
- Narrow-tool projections match the full `read_report` model
- Formula references and typed dependencies: extracted
- Subreport links: extracted
- Main-report custom functions: extracted
- Extracted JSON: `test-results/HIS_ClaimOfCustomerSummary.read-report.json` (ignored)
- Warning: `UNSUPPORTED_CUSTOM_FUNCTIONS` for embedded-subreport custom functions not exposed by the installed SDK
- Warning: `INCOMPLETE_FORMULA_SYNTAX` for `formulas[2].syntax`
- Before/after SHA-256 verification: passed

Neither the report nor its extracted JSON should be committed.
