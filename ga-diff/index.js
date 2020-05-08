#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync, exec } = require("child_process");

const cwd = process.cwd();
const packageFile = path.join(cwd, "package.json");

if (!fs.existsSync(packageFile)) {
  console.log("package.json not found");
  return;
}

const packageDetails = JSON.parse(fs.readFileSync(packageFile));

main(process.argv[2], process.argv[3]);

function fetchTagData() {
  let npmTags;
  let gitTags;

  return new Promise((resolve, reject) => {
    exec("git fetch --tags", { cwd }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        gitTags = stdout;
        if (npmTags !== undefined) {
          resolve(npmTags);
        }
      }
    });

    exec(`npm dist-tag ls ${packageDetails.name}`, { cwd }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        npmTags = stdout;
        if (gitTags !== undefined) {
          resolve(npmTags);
        }
      }
    });
  });
}

function chooseTag(tags, filter) {
  const matches = {
    excellent: [],
    good: [],
    questionable: [],
  };
  for (const tag of tags) {
    if (tag === filter) {
      return tag;
    } else if (tag.indexOf("." + filter + ".") > 0) {
      const target = tag.indexOf("@") < 0 ? matches.excellent : matches.good;
      target.push(tag);
    } else if (tag.indexOf(filter) >= 0) {
      matches.questionable.push(tag);
    }
  }
  for (const found of Object.values(matches))
    if (found.length > 0) {
      found.sort();
      if (found.length > 1) {
        console.log(`Picked ${found[0]} from [${found.join(";")}]`);
      }
      return found[0];
    }
}

function condense(buffer) {
  const lines = buffer.toString().split("\n").filter(Boolean);
  const changeLines = lines
    .map((line) => line.substring(41))
    .filter((line) => !line.startsWith("Babel: "));
  if (changeLines.length < lines.length) {
    changeLines.push(`+${lines.length - changeLines.length} Babel commits`);
  }
  return changeLines.concat([""]).join("\n");
}

async function main(filter, format = "condensed") {
  let output;

  output = await fetchTagData();
  const npmTags = output.toString().split('\n');
  // const npmTags = ["ga: 1.2920.0", "latest: 1.2943.0", "rc: 1.2942.0", ""];

  const gaTag = npmTags.find((info) => info.startsWith("ga:"));

  if (!gaTag) {
    console.log(`Cannot find GA version for ${packageDetails.name}`);
    return;
  }

  const gaVersion = gaTag.substring(4);
  console.log(`${packageDetails.name} GA is ${gaVersion}`);

  output = execSync(`git tag -l '${gaVersion}'`, { cwd });
  const gitTags = output.toString().split("\n");

  if (!gitTags.find((name) => name === gaVersion)) {
    console.log(`Cannot find tag ${gaVersion} in git`);
    return;
  }

  output = execSync(`git tag -l`, { cwd });
  const foundTags = output.toString().split("\n").filter(Boolean);

  const endVersion = chooseTag(foundTags, filter);

  const pretty = format === "condensed" ? "oneline" : format;
  const log = execSync(
    `git log --pretty=${pretty} ${gaVersion}...${endVersion}`,
    {
      cwd,
    }
  );

  output = format === "condensed" ? condense(log) : log.toString();

  console.log("\nChanges:\n");
  console.log(output);
}
