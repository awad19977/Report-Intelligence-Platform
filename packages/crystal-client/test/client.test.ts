import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CrystalWorkerClient, CrystalWorkerError } from "../src/client.js";
import { redactSecrets } from "../src/report.js";

const mockWorker = fileURLToPath(new URL("./fixtures/mock-worker.mjs", import.meta.url));

function createClient(requestTimeoutMs = 1_000): CrystalWorkerClient {
  return new CrystalWorkerClient({
    workerPath: process.execPath,
    workerArgs: [mockWorker],
    requestTimeoutMs,
    startupTimeoutMs: 1_000,
    shutdownTimeoutMs: 1_000,
  });
}

describe("CrystalWorkerClient", () => {
  it("negotiates protocol v1 and validates read_report responses", async () => {
    const client = createClient();
    await client.connect();

    const report = await client.readReport("C:/reports/sample.rpt");

    expect(report.format).toBe("crystal");
    expect(report.fileName).toBe("sample.rpt");
    expect(report.metadata.title).toBe("Sample");
    await client.disconnect();
  });

  it("redacts secret-bearing fields recursively", () => {
    const value = redactSecrets({
      connectionString: "Server=db;Password=secret",
      nested: { password: "secret", ordinary: "visible" },
    });

    expect(value).toEqual({
      connectionString: "[REDACTED]",
      nested: { password: "[REDACTED]", ordinary: "visible" },
    });
  });

  it("rejects timed-out requests with a stable code", async () => {
    const client = createClient(25);
    await client.connect();

    await expect(client.request("delay")).rejects.toMatchObject<Partial<CrystalWorkerError>>({
      code: "WORKER_TIMEOUT",
    });
    await client.disconnect();
  });

  it("fails the connection when stdout contains malformed JSON", async () => {
    const client = createClient();
    await client.connect();

    await expect(client.request("malformed")).rejects.toMatchObject<Partial<CrystalWorkerError>>({
      code: "INTERNAL_ERROR",
    });
    await client.disconnect();
  });

  it("rejects pending requests when the worker exits", async () => {
    const client = createClient();
    await client.connect();

    await expect(client.request("exit")).rejects.toMatchObject<Partial<CrystalWorkerError>>({
      code: "WORKER_DISCONNECTED",
    });
    await client.disconnect();
  });
});
