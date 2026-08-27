import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE_NAME = "@visualstandard/install";
const REGISTRY_ORIGIN = "https://registry.npmjs.org";

const valuesFor = (args, name) => args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]] : []);
const valueFor = (args, name) => {
  const values = valuesFor(args, name);
  if (values.length !== 1) throw new Error(`Expected exactly one ${name}.`);
  return values[0];
};

const tagRecord = (value) => {
  const match = value.match(/^([a-z][a-z0-9._-]*)=([0-9]+\.[0-9]+\.[0-9]+)$/);
  if (!match) throw new Error(`Invalid dist-tag expectation: ${value}.`);
  return { tag: match[1], version: match[2] };
};

export function verifyRegistryState({
  packument,
  tarballBytes = null,
  expectedVersion,
  expectedSha256,
  expectVersion,
  expectedTags = [],
  absentTags = [],
  tagsNotVersion = [],
}) {
  if (packument?.name !== PACKAGE_NAME || !packument.versions || !packument["dist-tags"]) {
    throw new Error("npm registry metadata is unavailable or belongs to another package.");
  }
  for (const { tag, version } of expectedTags) {
    if (packument["dist-tags"][tag] !== version) throw new Error(`npm dist-tag ${tag} is not ${version}.`);
  }
  for (const tag of absentTags) {
    if (Object.hasOwn(packument["dist-tags"], tag)) throw new Error(`npm dist-tag ${tag} already exists.`);
  }
  for (const tag of tagsNotVersion) {
    if (packument["dist-tags"][tag] === expectedVersion) throw new Error(`npm dist-tag ${tag} already points to ${expectedVersion}.`);
  }
  const metadata = packument.versions[expectedVersion];
  if (expectVersion === "absent") {
    if (metadata) throw new Error(`npm version ${expectedVersion} already exists and cannot be republished.`);
    return { name: PACKAGE_NAME, version: expectedVersion, present: false, distTags: packument["dist-tags"] };
  }
  if (expectVersion !== "present" || !metadata || !tarballBytes) {
    throw new Error(`npm version ${expectedVersion} or its tarball is unavailable.`);
  }
  if (metadata.name !== PACKAGE_NAME || metadata.version !== expectedVersion || !metadata.dist) {
    throw new Error("Published npm identity does not match the release.");
  }
  const tarballUrl = new URL(metadata.dist.tarball);
  if (tarballUrl.protocol !== "https:" || tarballUrl.origin !== REGISTRY_ORIGIN) {
    throw new Error("Published npm tarball is not hosted on the canonical registry.");
  }
  const bytes = Buffer.from(tarballBytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const shasum = createHash("sha1").update(bytes).digest("hex");
  const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
  if (sha256 !== expectedSha256 || metadata.dist.shasum !== shasum || metadata.dist.integrity !== integrity) {
    throw new Error("Published npm tarball integrity does not match the approved artifact.");
  }
  return {
    name: PACKAGE_NAME,
    version: expectedVersion,
    present: true,
    size: bytes.length,
    sha256,
    shasum,
    integrity,
    distTags: packument["dist-tags"],
  };
}

export async function fetchRegistryState({ expectedVersion, expectedSha256, expectVersion, expectedTags, absentTags, tagsNotVersion }) {
  const registryUrl = `${REGISTRY_ORIGIN}/${encodeURIComponent(PACKAGE_NAME)}?audit=${Date.now()}`;
  const response = await fetch(registryUrl, { headers: { accept: "application/json", "cache-control": "no-cache" } });
  if (!response.ok) throw new Error(`npm registry metadata request failed with ${response.status}.`);
  const packument = await response.json();
  const metadata = packument.versions?.[expectedVersion];
  let tarballBytes = null;
  if (expectVersion === "present") {
    if (!metadata?.dist?.tarball) throw new Error(`npm version ${expectedVersion} is unavailable.`);
    const tarballUrl = new URL(metadata.dist.tarball);
    if (tarballUrl.protocol !== "https:" || tarballUrl.origin !== REGISTRY_ORIGIN) {
      throw new Error("Published npm tarball is not hosted on the canonical registry.");
    }
    const tarball = await fetch(tarballUrl, { headers: { "cache-control": "no-cache" } });
    if (!tarball.ok) throw new Error(`npm tarball request failed with ${tarball.status}.`);
    tarballBytes = Buffer.from(await tarball.arrayBuffer());
  }
  return verifyRegistryState({
    packument,
    tarballBytes,
    expectedVersion,
    expectedSha256,
    expectVersion,
    expectedTags,
    absentTags,
    tagsNotVersion,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const expectedVersion = valueFor(args, "--version");
    const expectedSha256 = valueFor(args, "--sha256");
    const expectVersion = valueFor(args, "--expect-version");
    if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(expectedVersion) || !/^[a-f0-9]{64}$/.test(expectedSha256)) {
      throw new Error("Release version or SHA-256 is invalid.");
    }
    const manifest = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    if (manifest.name !== PACKAGE_NAME || manifest.version !== expectedVersion) {
      throw new Error("Local package identity does not match the registry gate.");
    }
    const result = await fetchRegistryState({
      expectedVersion,
      expectedSha256,
      expectVersion,
      expectedTags: valuesFor(args, "--expect-tag").map(tagRecord),
      absentTags: valuesFor(args, "--expect-tag-absent"),
      tagsNotVersion: valuesFor(args, "--expect-tag-not-version"),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Registry release verification failed.");
    process.exitCode = 1;
  }
}
