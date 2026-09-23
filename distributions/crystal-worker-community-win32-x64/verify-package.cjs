const { createHash } = require("node:crypto");
const { existsSync, readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path");

const bin = path.join(__dirname, "bin");
const executable = path.join(bin, "CrystalWorker.exe");
const manifest = path.join(bin, "SHA256SUMS");

if (!existsSync(executable)) throw new Error("Run npm run stage:community-worker before packing");
if (!existsSync(manifest)) throw new Error("The worker SHA-256 manifest is missing");

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(candidate) : [candidate];
  });
}

const forbidden = filesBelow(bin).filter((file) => (
  statSync(file).isFile() && path.basename(file).toLowerCase().startsWith("crystaldecisions.")
));
if (forbidden.length > 0) {
  throw new Error(`SAP Crystal assemblies must not be published: ${forbidden.join(", ")}`);
}

const manifestEntries = new Set();
for (const line of readFileSync(manifest, "utf8").trim().split(/\r?\n/)) {
  const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!match) throw new Error(`Invalid SHA256SUMS entry: ${line}`);
  manifestEntries.add(match[2]);
  const file = path.join(bin, ...match[2].split("/"));
  const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (actual !== match[1]) throw new Error(`Worker file hash mismatch: ${match[2]}`);
}

const packagedFiles = filesBelow(bin)
  .filter((file) => path.basename(file) !== "SHA256SUMS")
  .map((file) => path.relative(bin, file).split(path.sep).join("/"));
const unlisted = packagedFiles.filter((file) => !manifestEntries.has(file));
if (unlisted.length > 0 || packagedFiles.length !== manifestEntries.size) {
  throw new Error(`SHA256SUMS does not exactly cover the packaged files: ${unlisted.join(", ")}`);
}

console.log("Community worker package contents verified");
