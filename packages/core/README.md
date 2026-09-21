# @report-intelligence/core

Shared TypeScript types, Zod schemas, and small runtime utilities for the Report Intelligence Platform.

## Install

```sh
npm install @report-intelligence/core
```

## Example

```ts
import { ReportSchema, type Report } from "@report-intelligence/core";

const report: Report = ReportSchema.parse(input);
```

The package defines the platform's normalized report model, including data sources, joins, formulas, parameters, sections, subreports, custom functions, and dependency information.

## License

LGPL-3.0-only. See the [repository licensing guide](https://github.com/awad19977/Report-Intelligence-Platform/blob/main/LICENSING.md).
