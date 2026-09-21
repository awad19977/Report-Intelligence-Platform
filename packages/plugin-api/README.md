# @report-intelligence/plugin-api

Public contracts for Report Intelligence Platform plugins.

## Install

```sh
npm install @report-intelligence/plugin-api
```

## Example

```ts
import type { PluginInfo } from "@report-intelligence/plugin-api";

const info = {
  id: "example-reader",
  name: "Example Reader",
  version: "1.0.0",
  description: "Reads an example report format",
  supportedFormats: ["json"],
  capabilities: ["read"],
  minPlatformVersion: "0.1.0",
  dependencies: [],
} satisfies PluginInfo;
```

The package provides capability and configuration schemas plus interfaces for readers, writers, generators, renderers, validators, exporters, search, documentation, dependency analysis, and modification.

## License

LGPL-3.0-only. Plugins that merely use these interfaces may use other licenses, subject to the LGPL's requirements.
