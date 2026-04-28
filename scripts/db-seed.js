#!/usr/bin/env node
// Wrapper for `npm run db:seed` — picks compiled JS in production (where src/
// isn't shipped into the runtime image) and falls back to ts-node locally.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const compiled = path.join(__dirname, "..", "dist", "seed.js");

if (fs.existsSync(compiled)) {
  require(compiled);
} else {
  const child = spawn("npx", ["ts-node", "src/seed.ts"], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
}
