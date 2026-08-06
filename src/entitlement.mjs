import { createPublicKey, timingSafeEqual, verify as verifySignature } from "node:crypto";
import { readFileSync } from "node:fs";
import { CONTRACT_VERSION, MAX_OFFLINE_SECONDS } from "./config.mjs";

const decode = (segment) => {
  if (typeof segment !== "string" || !/^[A-Za-z0-9_-]+$/.test(segment)) throw new Error("The authorization token is malformed.");
  const buffer = Buffer.from(segment, "base64url");
  if (buffer.toString("base64url") !== segment) throw new Error("The authorization token is malformed.");
  return buffer;
};

const parseObject = (segment) => {
  try {
    const value = JSON.parse(decode(segment).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new Error("The authorization token is malformed.");
  }
};

const exactKeys = (value, expected) => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
};

export const loadKeyring = (file) => {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error("The Visual Standard verification keyring is unavailable.");
  }
  if (parsed.contractVersion !== CONTRACT_VERSION || !Array.isArray(parsed.keys)) {
    throw new Error("The Visual Standard verification keyring is invalid.");
  }
  return parsed;
};

const sameText = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const installationId = /^[A-Za-z0-9_-]{22,128}$/;
const identifier = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const verifyEntitlement = (token, {
  keyring,
  expectedChannel,
  expectedInstallationId,
  expectedProductCode,
  now = Math.floor(Date.now() / 1000),
}) => {
  if (typeof token !== "string" || token.length > 16_384) throw new Error("The authorization token is invalid.");
  const segments = token.split(".");
  if (segments.length !== 3) throw new Error("The authorization token is malformed.");
  const header = parseObject(segments[0]);
  const payload = parseObject(segments[1]);
  if (!exactKeys(header, ["alg", "kid"]) || !exactKeys(payload, ["licenseId", "deviceId", "installationId", "channel", "productCode", "issuedAt", "expiresAt", "contractVersion"])) {
    throw new Error("The authorization token contains unsupported fields.");
  }
  const key = keyring.keys.find((candidate) => candidate.kid === header.kid && candidate.alg === "Ed25519");
  if (header.alg !== "Ed25519" || !key) throw new Error("The authorization signing key is unavailable.");
  let publicKey;
  try {
    publicKey = createPublicKey({ key: Buffer.from(key.publicKeySpkiBase64, "base64"), format: "der", type: "spki" });
  } catch {
    throw new Error("The authorization verification key is invalid.");
  }
  if (!verifySignature(null, Buffer.from(`${segments[0]}.${segments[1]}`, "ascii"), publicKey, decode(segments[2]))) {
    throw new Error("The authorization signature is invalid.");
  }
  if (
    payload.contractVersion !== CONTRACT_VERSION
    || !Number.isSafeInteger(payload.issuedAt)
    || !Number.isSafeInteger(payload.expiresAt)
    || payload.issuedAt > now
    || payload.expiresAt <= now
    || payload.expiresAt - payload.issuedAt > MAX_OFFLINE_SECONDS
    || !uuid.test(payload.licenseId)
    || !uuid.test(payload.deviceId)
    || !installationId.test(payload.installationId)
    || !identifier.test(payload.channel)
    || !identifier.test(payload.productCode)
    || !sameText(payload.channel, expectedChannel)
    || !sameText(payload.installationId, expectedInstallationId)
    || !sameText(payload.productCode, expectedProductCode)
  ) {
    throw new Error("The authorization token is not valid for this installation.");
  }
  return payload;
};
