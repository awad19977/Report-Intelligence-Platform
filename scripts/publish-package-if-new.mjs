import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const packageDirectory = process.argv[2];
const tag = process.argv[3] ?? "latest";
if (!packageDirectory) {
  throw new Error("Usage: node scripts/publish-package-if-new.mjs <package-directory> [tag]");
}

const absoluteDirectory = path.resolve(packageDirectory);
const manifest = JSON.parse(await readFile(path.join(absoluteDirectory, "package.json"), "utf8"));
if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
  throw new Error(`Package manifest is missing name or version: ${absoluteDirectory}`);
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const packageId = `${manifest.name}@${manifest.version}`;
const lookup = spawnSync(npm, ["view", packageId, "version", "--json"], {
  encoding: "utf8",
  shell: false,
});

if (lookup.status === 0) {
  console.log(`${packageId} already exists; skipping immutable version`);
  process.exit(0);
}

const lookupError = `${lookup.stdout ?? ""}\n${lookup.stderr ?? ""}`;
if (!/E404|404 Not Found|is not in this registry/i.test(lookupError)) {
  throw new Error(`Could not determine whether ${packageId} exists:\n${lookupError.trim()}`);
}

console.log(`Publishing new package version ${packageId} with tag ${tag}`);
const publish = spawnSync(npm, ["publish", absoluteDirectory, "--access", "public", "--tag", tag], {
  stdio: "inherit",
  shell: false,
});
if (publish.error) throw publish.error;
if (publish.status !== 0) process.exit(publish.status ?? 1);
