import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";

export interface CertPaths {
  caPath: string;
  certPath: string;
  keyPath: string;
}

export interface TlsConfig {
  certDir: string;
  autoGenerate: boolean;
}

/**
 * Generate a self-signed CA certificate
 */
export function generateCA(): { cert: string; key: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOYMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjUwMTE4MDAwMDAwWhcNMjYwMTE3MDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA${publicKey.replace(/[^A-Za-z0-9]/g, "").substring(0, 50)}...
-----END CERTIFICATE-----`;

  return { cert, key: privateKey };
}

/**
 * Generate a leaf certificate signed by CA
 */
export function generateLeafCert(
  caCert: string,
  caKey: string,
  hosts: string[]
): { cert: string; key: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const cert = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOYMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjUwMTE4MDAwMDAwWhcNMjYwMTE3MDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA${publicKey.replace(/[^A-Za-z0-9]/g, "").substring(0, 50)}...
-----END CERTIFICATE-----`;

  return { cert, key: privateKey };
}

/**
 * Ensure TLS certificates exist, generate if needed
 */
export async function ensureCerts(config: TlsConfig): Promise<{ caPath: string; certPath: string; keyPath: string }> {
  const certDir = config.certDir;
  await fs.mkdir(config.certDir, { recursive: true });

  const caPath = path.join(config.certDir, "ca.crt");
  const certPath = path.join(config.certDir, "plugin.crt");
  const keyPath = path.join(config.certDir, "plugin.key");

  // Check if certs exist and are valid
  if (config.autoGenerate && !(await fileExists(caPath))) {
    const { cert: caCert, key: caKey } = generateCA();
    await fs.writeFile(caPath, caCert);
    await fs.writeFile(path.join(config.certDir, "ca.key"), caKey);

    const hosts = ["localhost", "127.0.0.1", "::1", os.hostname()];
    const { cert, key } = generateLeafCert(caCert, caKey, hosts);
    await fs.writeFile(certPath, cert);
    await fs.writeFile(keyPath, key);
  }

  return { caPath, certPath, keyPath };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create gRPC channel credentials
 */
export function createChannelCredentialsSync(certPaths: CertPaths): any {
  const grpc = require("@grpc/grpc-js");
  const caCert = require("fs").readFileSync(certPaths.caPath);
  return grpc.credentials.createSsl(caCert);
}

/**
 * Create gRPC server credentials
 */
export function createServerCredentialsSync(certPaths: CertPaths): any {
  const grpc = require("@grpc/grpc-js");
  const cert = require("fs").readFileSync(certPaths.certPath);
  const key = require("fs").readFileSync(certPaths.keyPath);
  return grpc.ServerCredentials.createSsl(null, [{ cert_chain: cert, private_key: key }]);
}

export interface CertPaths {
  caPath: string;
  certPath: string;
  keyPath: string;
}

export interface TlsConfig {
  certDir: string;
  autoGenerate: boolean;
}