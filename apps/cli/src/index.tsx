#!/usr/bin/env node
import { createRuntime } from "./runtime.js";
import { runCli } from "./cli.js";

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const normalized = args.filter((arg) => arg !== "--verbose");

  if (
    normalized[0] === "help" ||
    normalized[0] === "--help" ||
    normalized[0] === "-h"
  ) {
    process.stdout.write("Podcast Tracker CLI\n");
    process.stdout.write(
      "Run `podcast-tracker auth login` then `podcast-tracker`.\n"
    );
    process.stdout.write(
      "Subcommands: auth login|status|logout, smoke, help\n"
    );
    return;
  }

  try {
    const runtime = createRuntime(verbose);
    const exitCode = await runCli(runtime, args);
    process.exitCode = exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`podcast-tracker: ${message}\n`);
    process.exitCode = 1;
  }
};

void main();
