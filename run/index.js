#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const cwd = process.cwd();
const packageFile = path.join(cwd, "package.json");

if (!fs.existsSync(packageFile)) {
  console.log(`${packageFile} not found`);
  return;
}

const command = "npm run " + process.argv.slice(2).join(" ");

console.log(command);
execSync(command, { cwd, stdio: "inherit" });
