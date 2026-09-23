# Microsoft Store Community worker

The npm Community worker remains the single-install distribution. Microsoft Store distribution is an optional second channel. The Store signs the MSIX after certification; it does not sign the raw EXE inside the npm package.

## Build the submission package

Reserve **Crystal Worker Community** in Partner Center and copy the exact **Package Identity Name**, **Publisher ID**, and **Publisher Display Name** from its app identity page. The identity values are case-sensitive. Then on Windows with the Windows SDK installed:

```powershell
./scripts/build-community-store-msix.ps1 `
  -IdentityName '<Package Identity Name>' `
  -Publisher '<Publisher ID>' `
  -PublisherDisplayName '<Publisher Display Name>' `
  -Version '0.1.0.0'
```

The script verifies the staged worker, excludes SAP assemblies, creates the app manifest and logos, and writes an unsigned MSIX under `artifacts/store/`. It adds the `report-intelligence-crystal-worker.exe` app execution alias. Submit that MSIX through Partner Center. Microsoft signs it after certification. The user still needs a compatible SAP Crystal Reports x64 runtime.

The MCP resolver checks the Store alias after Pro and before the unsigned npm Community worker. A Store installation therefore works without a separate `CRYSTAL_WORKER_PATH` setting. Run `report-intelligence-mcp doctor --report C:\reports\example.rpt` after installation.

The repository currently has no reserved Store identity, Store listing, or certification result. A development package built with placeholder identity values is only a packaging test and must not be submitted.
