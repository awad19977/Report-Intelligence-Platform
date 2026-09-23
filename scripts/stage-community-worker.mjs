import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(repositoryRoot, "distributions", "crystal-worker-community-win32-x64");
const target = path.join(packageRoot, "bin");
const defaultSource = path.resolve(
  repositoryRoot,
  "..",
  "Report-Intelligence-Commercial",
  "workers",
  "crystal-worker",
  "bin",
  "Release",
  "net48",
);
const source = path.resolve(process.argv[2] ?? defaultSource);

if (!target.startsWith(`${packageRoot}${path.sep}`)) {
  throw new Error(`Refusing to stage outside the worker distribution: ${target}`);
}

const sourceInfo = await stat(source).catch(() => undefined);
if (!sourceInfo?.isDirectory()) {
  throw new Error(`Release worker output was not found: ${source}`);
}

const sourceFiles = await readdir(source, { recursive: true, withFileTypes: true });
const forbidden = sourceFiles
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().startsWith("crystaldecisions."))
  .map((entry) => entry.name);
if (forbidden.length > 0) {
  throw new Error(`SAP Crystal assemblies must not be packaged: ${forbidden.join(", ")}`);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, {
  recursive: true,
  filter(candidate) {
    const name = path.basename(candidate).toLowerCase();
    return name !== "crystalworker.pdb" && !name.endsWith(".xml");
  },
});

const executable = path.join(target, "CrystalWorker.exe");
const executableInfo = await stat(executable).catch(() => undefined);
if (!executableInfo?.isFile()) {
  throw new Error(`Release output does not contain CrystalWorker.exe: ${source}`);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(candidate));
    else if (entry.isFile() && entry.name !== "SHA256SUMS") files.push(candidate);
  }
  return files;
}

const files = (await collectFiles(target)).sort((left, right) => left.localeCompare(right));
const hashes = [];
for (const file of files) {
  const hash = createHash("sha256").update(await readFile(file)).digest("hex");
  const relative = path.relative(target, file).split(path.sep).join("/");
  hashes.push(`${hash}  ${relative}`);
}
await writeFile(path.join(target, "SHA256SUMS"), `${hashes.join("\n")}\n`, "utf8");

console.log(`Staged ${files.length} worker files from ${source}`);
