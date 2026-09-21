import { WorkerClient as IWorkerClient, WorkerHealth, WorkerClientConfig } from "@report-intelligence/core";
import { createChannel, loadProto } from "./channel.js";
import { ensureCerts, createChannelCredentialsSync } from "./certs.js";
import * as path from "path";
import * as crypto from "crypto";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export class GrpcWorkerClient implements IWorkerClient {
  private client: any;
  private logger: any;
  private connected = false;

  constructor(
    private config: WorkerClientConfig,
    logger?: any
  ) {
    this.logger = logger || console;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    const packageDefinition = await protoLoader.load(
      path.join(process.cwd(), "proto/worker.proto"),
      { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
    );
    const grpcObj = grpc.loadPackageDefinition(packageDefinition);
    const packageObj = grpcObj["rip.worker"] as any;
    const Service = packageObj.CrystalWorker;

    let credentials: any;
    if (this.config.tls) {
      const { caPath } = await ensureCerts({
        certDir: this.config.tls.caPath,
        autoGenerate: true
      });
      credentials = grpc.credentials.createSsl(
        require("fs").readFileSync(caPath)
      );
    } else {
      credentials = grpc.credentials.createInsecure();
    }

    const channel = createChannel({
      host: this.config.host,
      port: this.config.port,
      tls: this.config.tls,
      keepAlive: true,
    });

    this.client = new Service(
      `${this.config.host}:${this.config.port}`,
      credentials,
      { "grpc.keepalive_time_ms": 30000 }
    );

    this.connected = true;
  }

  async execute<T>(command: string, args: unknown[] = []): Promise<T> {
    if (!this.connected) {
      await this.connect();
    }

    const id = crypto.randomUUID();
    const argsArray = args.map(arg => this.toProtoValue(arg));

    const request = {
      id,
      command,
      args: argsArray,
      timeout_ms: this.config.timeout || 60000,
    };

    return new Promise((resolve, reject) => {
      this.client.Execute(request, (err: any, response: any) => {
        if (err) {
          reject(new Error(err.details || err.message));
        } else if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(this.fromProtoValue(response.result));
        }
      });
    });
  }

  async *executeStream<T>(command: string, args: unknown[] = []): AsyncIterable<T> {
    if (!this.connected) {
      await this.connect();
    }

    const id = crypto.randomUUID();
    const argsArray = args.map(arg => this.toProtoValue(arg));

    const request = {
      id,
      command,
      args: argsArray,
      timeout_ms: this.config.timeout || 60000,
    };

    const call = this.client.ExecuteStream(request);

    for await (const chunk of call) {
      if (chunk.data && chunk.data.length > 0) {
        yield this.fromProtoValue(chunk.data);
      }
      if (chunk.is_final) break;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<any> {
    return this.execute("health_check", []);
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    return this;
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    return this;
  }

  private toProtoValue(value: unknown): any {
    if (value === null || value === undefined) {
      return {};
    }
    if (typeof value === "string") {
      return { string_value: value };
    }
    if (typeof value === "number") {
      return { number_value: value };
    }
    if (typeof value === "boolean") {
      return { bool_value: value };
    }
    if (Array.isArray(value)) {
      return {
        list_value: {
          values: value.map(v => this.toProtoValue(v)),
        },
      };
    }
    if (typeof value === "object") {
      const fields: Record<string, any> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        fields[key] = this.toProtoValue(val);
      }
      return { struct_value: { fields } };
    }
    return {};
  }

  private fromProtoValue(value: any): any {
    if (!value) return null;
    if (value.string_value !== undefined) return value.string_value;
    if (value.number_value !== undefined) return value.number_value;
    if (value.bool_value !== undefined) return value.bool_value;
    if (value.struct_value) {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value.struct_value.fields || {})) {
        result[key] = this.fromProtoValue(val);
      }
      return result;
    }
    if (value.list_value) {
      return value.list_value.values.map((v: any) => this.fromProtoValue(v));
    }
    if (value.bytes_value) {
      return Buffer.from(value.bytes_value);
    }
    return null;
  }
}
