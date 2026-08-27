import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { parseChecksumRecord, verifyPackedArtifact } from "../scripts/verify-local-release.mjs";
import { verifyRegistryState } from "../scripts/verify-registry-release.mjs";

const version = "1.0.14";
const bytes = Buffer.from("audited-tarball-fixture");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const shasum = createHash("sha1").update(bytes).digest("hex");
const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;

test("local release verification binds the recorded checksum to the packed bytes", () => {
  const checksumRecord = parseChecksumRecord(`${sha256}  visualstandard-install-1.0.14.tgz\n`, version);
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

test("registry verification requires an unused version and the exact previous latest", () => {
  const absentPackument = {
    name: "@visualstandard/install",
    "dist-tags": { latest: "1.0.6" },
    versions: {},
  };
  const absent = verifyRegistryState({
    packument: absentPackument,
    expectedVersion: version,
    expectedSha256: sha256,
    expectVersion: "absent",
    expectedTags: [{ tag: "latest", version: "1.0.6" }],
  });
  assert.equal(absent.present, false);
  assert.throws(
    () => verifyRegistryState({
      packument: { ...absentPackument, "dist-tags": { ...absentPackument["dist-tags"], latest: "1.0.13" } },
      expectedVersion: version,
      expectedSha256: sha256,
      expectVersion: "absent",
      expectedTags: [{ tag: "latest", version: "1.0.6" }],
    }),
    /latest is not 1\.0\.6/,
  );
});

test("registry verification accepts only the published 1.0.14 bytes on latest", () => {
  const packument = {
    name: "@visualstandard/install",
    "dist-tags": { latest: version },
    versions: {
      [version]: {
        name: "@visualstandard/install",
        version,
        dist: {
          tarball: "https://registry.npmjs.org/@visualstandard/install/-/install-1.0.14.tgz",
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
    expectedTags: [{ tag: "latest", version }],
  });
  assert.equal(result.sha256, sha256);
});

test("release workflow publishes once, directly to latest, using OIDC provenance", () => {
  const publish = readFileSync(".github/workflows/publish.yml", "utf8");
  const release = readFileSync(".github/workflows/github-release.yml", "utf8");

  assert.match(publish, /RELEASE_VERSION: 1\.0\.14/);
  assert.match(publish, /RELEASE_TAG: v1\.0\.14/);
  assert.match(publish, /PREVIOUS_LATEST: 1\.0\.6/);
  assert.match(publish, /id-token:\s*write/);
  assert.match(publish, /npm publish --access public --tag latest --provenance/);
  assert.match(publish, /expect-version absent/);
  assert.match(publish, /expect-tag "latest=\$PREVIOUS_LATEST"/);
  assert.match(publish, /test "\$GITHUB_REF" = "refs\/tags\/\$RELEASE_TAG"/);
  assert.doesNotMatch(publish, /NPM_DIST_TAG_TOKEN|npm dist-tag|--tag smoke|SMOKE_TAG/);
  assert.equal(existsSync(".github/workflows/promote-latest.yml"), false);

  assert.match(release, /RELEASE_VERSION: 1\.0\.14/);
  assert.match(release, /expect-tag "latest=\$RELEASE_VERSION"/);
  assert.doesNotMatch(release, /npm publish|npm dist-tag|NPM_DIST_TAG_TOKEN|id-token:\s*write|smoke=/);
  assert.match(release, /gh release create/);
});
