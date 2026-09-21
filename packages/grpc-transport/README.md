# @report-intelligence/grpc-transport

Experimental gRPC client, server, retry, and TLS-certificate helpers for Report Intelligence Platform worker transports.

## Install

```sh
npm install @report-intelligence/grpc-transport
```

## Example

```ts
import { createGrpcClient } from "@report-intelligence/grpc-transport";

const client = await createGrpcClient({
  protoPath: "./proto/worker.proto",
  packageName: "rip.worker",
  serviceName: "CrystalWorker",
  channelOptions: { host: "127.0.0.1", port: 50051 },
});
```

This package is experimental. Its API and wire integration may change before version 1.0, and it does not include a production report worker.

## License

LGPL-3.0-only.
