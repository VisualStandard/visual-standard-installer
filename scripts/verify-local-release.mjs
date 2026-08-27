import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const PACKAGE_NAME = "@visualstandard/install";

const valueFor = (args, name) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing ${name}.`);
  return args[index + 1];
};

export function parseChecksumRecord(source, expectedVersion) {
  const records = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (records.length !== 1) throw new Error("CHECKSUMS.sha256 must contain exactly one release record.");
  const match = records[0].match(/^([a-f0-9]{64})  (visualstandard-install-([0-9]+\.[0-9]+\.[0-9]+)\.tgz)$/);
  if (!match || match[3] !== expectedVersion) throw new Error("CHECKSUMS.sha256 does not match the release version.");
  return { sha256: match[1], filename: match[2] };
}

export function verifyPackedArtifact({ metadata, bytes, expectedVersion, expectedSha256, checksumRecord }) {
  if (metadata.name !== PACKAGE_NAME || metadata.version !== expectedVersion) {
    throw new Error("Packed npm identity does not match the release.");
  }
  if (metadata.filename !== checksumRecord.filename) throw new Error("Packed filename does not match CHECKSUMS.sha256.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const shasum = createHash("sha1").update(bytes).digest("hex");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (sha256 !== expectedSha256 || checksumRecord.sha256 !== expectedSha256) {
    throw new Error("Packed SHA-256 does not match the approved checksum.");
  }
  if (metadata.shasum !== shasum || metadata.integrity !== integrity) {
    throw new Error("npm pack metadata does not match the packed bytes.");
  }
  return {
    name: metadata.name,
    version: metadata.version,
    filename: metadata.filename,
    size: bytes.length,
    sha256,
    shasum,
    integrity,
  };
}

export function verifyLocalRelease({ root = process.cwd(), expectedVersion, expectedSha256 }) {
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  if (manifest.name !== PACKAGE_NAME || manifest.version !== expectedVersion) {
    throw new Error("package.json does not match the exact release identity.");
  }
  if (manifest.publishConfig?.tag !== "latest" || manifest.publishConfig?.provenance !== true) {
    throw new Error("package.json publish policy is not provenance-enabled.");
  }
  const checksumRecord = parseChecksumRecord(
    readFileSync(resolve(root, "CHECKSUMS.sha256"), "utf8"),
    expectedVersion,
  );
  const directory = mkdtempSync(join(tmpdir(), "visual-standard-release-verify-"));
  try {
    const packed = spawnSync("npm", [
      "pack",
      "--json",
      "--force",
      "--ignore-scripts",
      "--pack-destination",
      directory,
      "--cache",
      join(directory, "cache"),
    ], { cwd: root, encoding: "utf8" });
    if (packed.status !== 0) throw new Error(packed.stderr || "npm pack failed.");
    const result = JSON.parse(packed.stdout);
    const metadata = Array.isArray(result) ? result[0] : result;
    if (!metadata) throw new Error("npm pack returned no metadata.");
    const bytes = readFileSync(join(directory, metadata.filename));
    return verifyPackedArtifact({ metadata, bytes, expectedVersion, expectedSha256, checksumRecord });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const expectedVersion = valueFor(process.argv.slice(2), "--version");
    const expectedSha256 = valueFor(process.argv.slice(2), "--sha256");
    if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(expectedVersion) || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
      throw new Error("Release version or SHA-256 is invalid.");
    }
    console.log(JSON.stringify(verifyLocalRelease({ expectedVersion, expectedSha256 }), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Local release verification failed.");
    process.exitCode = 1;
  }
}
