const fs = require("node:fs");
const path = require("node:path");

const workerPath = path.join(__dirname, "bin", "CrystalWorker.exe");

function getWorkerPath() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("The Report Intelligence Crystal Worker Community package requires Windows x64.");
  }
  if (!fs.existsSync(workerPath)) {
    throw new Error(`The packaged Crystal worker executable is missing: ${workerPath}`);
  }
  return workerPath;
}

module.exports = {
  edition: "community",
  getWorkerPath,
  workerPath,
};
