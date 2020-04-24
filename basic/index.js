#!/usr/bin/env node

let start = process.hrtime();

console.log("Starting in ", process.cwd());
console.log("Arguments:", ...process.argv.slice(2));

let nextPrint;

function periodicPrint() {
  const [seconds, nanoseconds] = process.hrtime(start);
  const printPause = seconds < 10 ? 1000 : 10000;
  nextPrint = setTimeout(periodicPrint, printPause);
  console.log(`Running: ${formatDuration(seconds, nanoseconds)}s`);
}

function stopPrinting(immediate = false) {
  clearTimeout(nextPrint);
  if (!immediate) {
    console.log("Ending in 2s...");
    setTimeout(finish, 2000);
  }
}

function finish() {
  console.log(`Finished (${formatDuration(...process.hrtime(start))} seconds)`);
}

function formatDuration(seconds, nanoseconds) {
  const milliseconds = Math.round(nanoseconds / 1000000);
  return seconds + milliseconds / 1000;
}

process.on("SIGTERM", stopPrinting);
process.on("SIGINT", () => stopPrinting(true));
periodicPrint();
