#!/usr/bin/env node

import { install } from "../src/installer.mjs";

install().catch((error) => {
  console.error(error instanceof Error ? error.message : "Visual Standard Motion Graphics Creator could not be installed.");
  process.exitCode = 1;
});
