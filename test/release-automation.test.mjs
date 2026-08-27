import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseChecksumRecord, verifyPackedArtifact } from "../scripts/verify-local-release.mjs";
import { verifyRegistryState } from "../scripts/verify-registry-release.mjs";

const version = "1.0.13";
const bytes = Buffer.from("audited-tarball-fixture");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const shasum = createHash("sha1").update(bytes).digest("hex");
const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

test("local release verification binds the recorded checksum to the packed bytes", () => {
  const checksumRecord = parseChecksumRecord(`${sha256}  visualstandard-install-1.0.13.tgz\n`, version);
  const result = verifyPackedArtifact({
    metadata: {
      name: "@visualstandard/install",
      version,
      filename: checksumRecord.filename,
      shasum,
      integrity,
    },
    bytes,
    expectedVersion: version,
    expectedSha256: sha256,
    checksumRecord,
  });
  assert.equal(result.sha256, sha256);
  assert.throws(
    () => verifyPackedArtifact({
      metadata: { name: "@visualstandard/install", version, filename: checksumRecord.filename, shasum, integrity },
      bytes: Buffer.from("different"),
      expectedVersion: version,
      expectedSha256: sha256,
      checksumRecord,
    }),
    /SHA-256|metadata/,
  );
});

test("registry verification requires the exact staged tags and immutable tarball", () => {
  const packument = {
    name: "@visualstandard/install",
    "dist-tags": { latest: "1.0.6", smoke: version },
    versions: {
      [version]: {
        name: "@visualstandard/install",
        version,
        dist: {
          tarball: "https://registry.npmjs.org/@visualstandard/install/-/install-1.0.13.tgz",
          shasum,
          integrity,
        },
      },
    },
  };
  const result = verifyRegistryState({
    packument,
    tarballBytes: bytes,
    expectedVersion: version,
    expectedSha256: sha256,
    expectVersion: "present",
    expectedTags: [{ tag: "smoke", version }],
    tagsNotVersion: ["latest"],
  });
  assert.equal(result.sha256, sha256);
  assert.throws(
    () => verifyRegistryState({
      packument: { ...packument, "dist-tags": { latest: version, smoke: version } },
      tarballBytes: bytes,
      expectedVersion: version,
      expectedSha256: sha256,
      expectVersion: "present",
      expectedTags: [{ tag: "smoke", version }],
      tagsNotVersion: ["latest"],
    }),
    /latest already points/,
  );
});

test("release workflows separate immutable publish, dist-tag promotion and GitHub Release", () => {
  const stage = readFileSync(".github/workflows/publish.yml", "utf8");
  const promote = readFileSync(".github/workflows/promote-latest.yml", "utf8");
  const release = readFileSync(".github/workflows/github-release.yml", "utf8");

  assert.doesNotMatch(stage, /^\s*release:\s*$/m);
  assert.match(stage, /npm publish --access public --tag "\$SMOKE_TAG" --provenance/);
  assert.doesNotMatch(stage, /npm publish[^\n]*--tag latest/);
  assert.match(stage, /expect-tag "latest=\$\{\{ steps\.registry-before\.outputs\.latest_before \}\}"/);

  assert.doesNotMatch(promote, /npm publish/);
  assert.match(promote, /npm dist-tag add "@visualstandard\/install@\$RELEASE_VERSION" latest/);
  assert.match(promote, /NPM_DIST_TAG_TOKEN/);

  assert.doesNotMatch(release, /npm publish|npm dist-tag|NPM_DIST_TAG_TOKEN|id-token:\s*write/);
  assert.match(release, /gh release create/);
  assert.match(release, /RELEASE_COMMIT: 78d8493a5b6d3629607cbbe801c5ed39e618415d/);
});
