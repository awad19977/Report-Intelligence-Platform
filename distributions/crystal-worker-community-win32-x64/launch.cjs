#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { getWorkerPath } = require("./index.cjs");

const result = spawnSync(getWorkerPath(), process.argv.slice(2), { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
