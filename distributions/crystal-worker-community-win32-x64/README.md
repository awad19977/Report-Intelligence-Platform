# @report-intelligence/crystal-worker-community-win32-x64

Binary-only Community worker for local, read-only SAP Crystal Reports extraction on Windows x64.

## Use

Install the MCP server. Its optional dependency installs this worker automatically on supported systems:

```sh
npm install @report-intelligence/mcp-server
```

If optional dependencies are disabled, install both packages explicitly:

```sh
npm install @report-intelligence/mcp-server @report-intelligence/crystal-worker-community-win32-x64
```

The MCP server discovers a Pro worker first, then this Community worker. `CRYSTAL_WORKER_PATH` always overrides automatic discovery.

The npm archive contains the unsigned worker plus a SHA-256 file manifest. Releases from the GitHub trusted-publishing workflow can carry npm provenance; the first manual bootstrap release may not. Neither the manifest nor provenance is a Windows Authenticode signature. A separate Microsoft Store MSIX can be installed when available; the MCP server recognizes its execution alias.

## Prerequisite

Install a compatible SAP Crystal Reports runtime for .NET Framework, Windows x64. SAP runtime files are not included in this package and remain governed by SAP's terms.

## Scope

Community provides the read-only extraction functionality exposed by the public MCP server. Advanced editing, generation, validation, migration, enterprise operation, and support are reserved for future Pro and Enterprise products.

## License

This is free-to-use proprietary object code, not LGPL-covered source. See `LICENSE`. Third-party notices are in `THIRD_PARTY_NOTICES.md`.
