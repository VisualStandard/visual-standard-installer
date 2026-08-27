import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PRODUCTION_RELEASE,
  validateProductionReleaseContract,
} from "../src/production-release-contract.mjs";

const manifest = { version: PRODUCTION_RELEASE.packageVersion };
const config = {
  contractVersion: PRODUCTION_RELEASE.contractVersion,
  installerVersion: PRODUCTION_RELEASE.installerVersion,
  apiBaseUrl: PRODUCTION_RELEASE.apiBaseUrl,
  productCode: PRODUCTION_RELEASE.productCode,
  releaseChannel: PRODUCTION_RELEASE.releaseChannel,
  privateEntrypoint: PRODUCTION_RELEASE.privateEntrypoint,
};

const productionKeyring = () => {
  const { publicKey } = generateKeyPairSync("ed25519");
  return {
    contractVersion: 1,
    keys: [{
      kid: "prod-2026-08-v1",
      alg: "Ed25519",
      publicKeySpkiBase64: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    }],
  };
};

test("installer 1.0.12 accepts only the coordinated stable production contract", () => {
  const result = validateProductionReleaseContract({ manifest, config, keyring: productionKeyring() });
  assert.equal(result.packageVersion, "1.0.12");
  assert.equal(result.kid, "prod-2026-08-v1");
  assert.match(result.publicKeySpkiSha256, /^[a-f0-9]{64}$/);
});

test("release preflight rejects the distributed TEST keyring until signing alignment", () => {
  const testKeyring = JSON.parse(readFileSync("entitlement-public-keys.json", "utf8"));
  assert.throws(
    () => validateProductionReleaseContract({ manifest, config, keyring: testKeyring }),
    /non-production channel/i,
  );
});

test("installer and runtime retain authorization compatibility at protocol 1.0.7", () => {
  assert.equal(PRODUCTION_RELEASE.installerVersion, "1.0.7");
  assert.equal(PRODUCTION_RELEASE.releaseChannel, "stable");
  assert.equal(PRODUCTION_RELEASE.productCode, "motion_graphics_creator");
});
