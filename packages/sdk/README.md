# @report-intelligence/sdk

Developer entry point for building Report Intelligence Platform integrations and plugins.

## Install

```sh
npm install @report-intelligence/sdk
```

## Example

```ts
import { createCache, createLogger, ReportSchema } from "@report-intelligence/sdk";

const logger = createLogger();
const cache = createCache();
const report = ReportSchema.parse(input);

logger.info("Validated report", { name: report.name });
await cache.set(`report:${report.name}`, report);
```

The SDK re-exports the core model and plugin contracts and includes basic logger, in-memory cache, and filesystem storage helpers.

## License

LGPL-3.0-only. See the [repository licensing guide](https://github.com/awad19977/Report-Intelligence-Platform/blob/main/LICENSING.md).
