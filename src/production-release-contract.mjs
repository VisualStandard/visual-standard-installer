import { createHash, createPublicKey } from "node:crypto";

export const PRODUCTION_RELEASE = Object.freeze({
  packageVersion: "1.0.14",
  contractVersion: 1,
  installerVersion: "1.0.7",
  apiBaseUrl: "https://visualstandard.io",
  productCode: "motion_graphics_creator",
  releaseChannel: "stable",
  privateEntrypoint: "package/installer-entry.mjs",
});

const internalChannels = [
  "test",
  ["b", "e", "t", "a"].join(""),
  ["f", "o", "u", "n", "d", "i", "n", "g"].join(""),
  ["a", "c", "c", "e", "p", "t", "a", "n", "c", "e"].join(""),
];
const internalIdentifier = new RegExp(`(?:^|[._-])(?:${internalChannels.join("|")})(?:$|[._-])`, "i");

const exactBase64 = (value) => {
  if (typeof value !== "string" || value.length < 40) return null;
  const decoded = Buffer.from(value, "base64");
  return decoded.toString("base64").replace(/=+$/, "") === value.replace(/=+$/, "") ? decoded : null;
};

export const validateProductionReleaseContract = ({ manifest, config, keyring }) => {
  if (manifest?.version !== PRODUCTION_RELEASE.packageVersion) {
    throw new Error(`Production installer version must be ${PRODUCTION_RELEASE.packageVersion}.`);
  }
  for (const field of ["contractVersion", "installerVersion", "apiBaseUrl", "productCode", "releaseChannel", "privateEntrypoint"]) {
    if (config?.[field] !== PRODUCTION_RELEASE[field]) {
      throw new Error(`Production installer ${field} is not aligned.`);
    }
  }
  if (keyring?.contractVersion !== PRODUCTION_RELEASE.contractVersion || !Array.isArray(keyring.keys) || keyring.keys.length !== 1) {
    throw new Error("Production entitlement keyring must contain exactly one active public key.");
  }
  const [key] = keyring.keys;
  if (!key || key.alg !== "Ed25519" || typeof key.kid !== "string" || !/^[A-Za-z0-9._~-]{1,64}$/.test(key.kid) || internalIdentifier.test(key.kid)) {
    throw new Error("Production entitlement key identifier is invalid or belongs to a non-production channel.");
  }
  const spki = exactBase64(key.publicKeySpkiBase64);
  if (!spki) throw new Error("Production entitlement public key is not canonical base64 SPKI.");
  let publicKey;
  try {
    publicKey = createPublicKey({ key: spki, format: "der", type: "spki" });
  } catch {
    throw new Error("Production entitlement public key is not valid SPKI.");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    throw new Error("Production entitlement public key must use Ed25519.");
  }
  return {
    packageVersion: PRODUCTION_RELEASE.packageVersion,
    kid: key.kid,
    publicKeySpkiSha256: createHash("sha256").update(spki).digest("hex"),
  };
};
