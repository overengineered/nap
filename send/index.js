#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const tildePath = require("tilde-path");
const { execSync } = require("child_process");

const argv = require("minimist")(process.argv.slice(2));
const target = argv._[0] || argv.target;

if (!target) {
  console.log("Usage: nap-send [--once] targetdir");
  process.exit();
}

function isDirectory(path) {
  try {
    return fs.lstatSync(path).isDirectory();
  } catch (e) {
    return false;
  }
}

function updateInstalledModule(sourceDir, targetDir, verbose) {
  const syncableEntities = fs.readdirSync(targetDir, { withFileTypes: true });
  const availableEntities = fs.readdirSync(sourceDir, { withFileTypes: true });

  // Black list all source directories and hidden files
  const exclude = new Set();
  for (const entity of availableEntities) {
    if (entity.isDirectory()) {
      exclude.add(entity.name);
    } else if (entity.name[0] === ".") {
      exclude.add(entity.name);
    }
  }
  // White list directories present in installed module directory
  for (const entity of syncableEntities) {
    if (entity.isDirectory()) {
      exclude.delete(entity.name);
    }
  }
  // Never sync these
  exclude.add("package.json");
  exclude.add("node_modules");

  syncDirectories(sourceDir, targetDir, Array.from(exclude.values()), verbose);
  console.log("✓");
}

function syncDirectories(source, target, exclude, verbose) {
  const exclusions = exclude.map((name) => `--exclude="${name}"`).join(" ");
  const command = `rsync -rti --delete ${exclusions} "${source}" "${target}"`;
  if (verbose) {
    console.log(command);
  } else {
    console.log("↻");
  }
  execSync(command, { stdio: "inherit" });
}

const cwd = process.cwd();
const packageFile = path.join(cwd, "package.json");
if (!fs.existsSync(packageFile)) {
  console.log(`Expected to find file ${packageFile}`);
  process.exit(1);
}

const packageDetails = JSON.parse(fs.readFileSync(packageFile));
const moduleName = packageDetails.name;

const targetDir = path.join(target, "node_modules", moduleName);
if (!isDirectory(targetDir)) {
  console.log(`Directory ${targetDir} not found`);
  process.exit(1);
}

updateInstalledModule(cwd, targetDir, true);

if (argv.once) {
  console.log(`Synced ${tildePath(cwd)} to ${tildePath(targetDir)}`);
  process.exit();
}

console.log(`Watching for changes in ${tildePath(cwd)}`);

const watcher = require("chokidar").watch(".", { ignoreInitial: true });

const callback = require("debounce")(
  () => updateInstalledModule(cwd, targetDir, false),
  95
);
watcher.on("all", callback);
