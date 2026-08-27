#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProductionReleaseContract } from "../src/production-release-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));

try {
  const result = validateProductionReleaseContract({
    manifest: readJson("package.json"),
    config: readJson("config.json"),
    keyring: readJson("entitlement-public-keys.json"),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
