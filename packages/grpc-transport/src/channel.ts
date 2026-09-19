import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import * as path from "path";
import * as fs from "fs/promises";
import { CertPaths, TlsConfig, ensureCerts, createChannelCredentialsSync, createServerCredentialsSync } from "./certs.js";
import winston from "winston";

export interface ChannelOptions {
  host: string;
  port: number;
  tls?: CertPaths;
  keepAlive?: boolean;
  maxReceiveMessageLength?: number;
  maxSendMessageLength?: number;
}

export interface ServerOptions {
  port: number;
  host?: string;
  tls?: CertPaths;
  maxReceiveMessageLength?: number;
  maxSendMessageLength?: number;
}

export interface GrpcClientOptions {
  protoPath: string;
  packageName: string;
  serviceName: string;
  channelOptions: ChannelOptions;
}

export interface GrpcServerOptions {
  protoPath: string;
  packageName: string;
  serviceName: string;
  implementation: any;
  serverOptions: ServerOptions;
}

export async function loadProto(protoPath: string, options: any = {}): Promise<any> {
  const packageDefinition = await protoLoader.load(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpc = require("@grpc/grpc-js");
  return grpc.loadPackageDefinition(packageDefinition);
}

export function createChannel(options: ChannelOptions): any {
  const grpc = require("@grpc/grpc-js");
  const target = `${options.host}:${options.port}`;
  
  let credentials: any;
  
  if (options.tls) {
    credentials = createChannelCredentialsSync(options.tls);
  } else {
    credentials = grpc.credentials.createInsecure();
  }

  const channelOptions: any = {
    "grpc.keepalive_time_ms": options.keepAlive ? 30000 : -1,
    "grpc.keepalive_timeout_ms": 10000,
    "grpc.keepalive_permit_without_calls": 1,
    "grpc.http2.max_pings_without_data": 0,
    "grpc.max_receive_message_length": options.maxReceiveMessageLength || 100 * 1024 * 1024,
    "grpc.max_send_message_length": options.maxSendMessageLength || 100 * 1024 * 1024,
  };

  return new grpc.Client(target, credentials, channelOptions) as any;
}

export async function createServer(options: ServerOptions): Promise<any> {
  const grpc = require("@grpc/grpc-js");
  const server = new grpc.Server();

  let credentials: any;
  
  if (options.tls) {
    credentials = createServerCredentialsSync(options.tls);
  } else {
    credentials = grpc.ServerCredentials.createInsecure();
  }

  const bindAddress = `${options.host || "0.0.0.0"}:${options.port}`;
  
  await new Promise<void>((resolve, reject) => {
    server.bindAsync(`${options.host || "0.0.0.0"}:${options.port}`, credentials, (err: any, port: any) => {
      if (err) {
        reject(err);
      } else {
        console.log(`gRPC server bound to ${options.host || "0.0.0.0"}:${options.port}`);
        resolve();
      }
    });
  });

  return server;
}

export async function createGrpcClient<T>(options: GrpcClientOptions): Promise<T> {
  const grpc = require("@grpc/grpc-js");
  const protoLoader = require("@grpc/proto-loader");
  
  const packageDefinition = await protoLoader.load(options.protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const grpcObj = grpc.loadPackageDefinition(packageDefinition);
  const packageObj = grpcObj[options.packageName] as any;
  const Service = packageObj[options.serviceName];
  
  if (!Service) {
    throw new Error(`Service ${options.serviceName} not found in package ${options.packageName}`);
  }

  const channel = createChannel(options.channelOptions);
  const client = new Service(
    `${options.channelOptions.host}:${options.channelOptions.port}`,
    channel.credentials,
    {}
  );

  return client as T;
}

export async function createGrpcServer(options: GrpcServerOptions): Promise<any> {
  const grpcObj = await loadProto(options.protoPath);
  const packageObj = grpcObj[options.packageName] as any;
  const Service = packageObj[options.serviceName];
  
  if (!Service) {
    throw new Error(`Service ${options.serviceName} not found in package ${options.packageName}`);
  }

  const server = await createServer(options.serverOptions);
  server.addService(Service.service, options.implementation);
  
  return server;
}

export const defaultGrpcOptions = {
  keepAlive: true,
  maxReceiveMessageLength: 100 * 1024 * 1024,
  maxSendMessageLength: 100 * 1024 * 1024,
};

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableCodes: number[];
}

export const defaultRetryPolicy: any = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableCodes: [
    14,
    4,
    8,
  ],
};

export async function executeWithRetry<T>(
  call: () => Promise<any>,
  policy: any = { maxRetries: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2, retryableCodes: [14, 4, 8] }
): Promise<any> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      return await call();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === 3 || ![14, 4, 8].includes(error.code)) {
        throw error;
      }
      
      const delay = Math.min(
        100 * Math.pow(2, attempt),
        5000
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Max retries exceeded");
}

export function createLogger(prefix: string): any {
  const winston = require("winston");
  return winston.createLogger({
    level: process.env["LOG_LEVEL"] || "info",
    format: require("winston").format.combine(
      require("winston").format.timestamp(),
      require("winston").format.printf(({ timestamp, level, message, ...meta }: any) => {
        return `${timestamp} [${prefix}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
      })
    ),
    transports: [new (require("winston").transports.Console)()],
  });
}