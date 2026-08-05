import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CONTRACT_VERSION = 1;
export const INSTALLER_VERSION = "1.0.7";
export const MAX_OFFLINE_SECONDS = 7 * 24 * 60 * 60;
export const DOWNLOAD_URL_SECONDS = 300;

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const requireHttpsUrl = (value, label) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is invalid.`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(`${label} must use HTTPS without credentials.`);
  }
  return parsed;
};

export const loadConfig = ({
  env = process.env,
  configFile = resolve(packageRoot, "config.json"),
  keyringFile = resolve(packageRoot, "entitlement-public-keys.json"),
} = {}) => {
  let stored;
  try {
    stored = JSON.parse(readFileSync(configFile, "utf8"));
  } catch {
    throw new Error("The Visual Standard installer configuration is unavailable.");
  }
  const apiBaseUrl = env.VISUAL_STANDARD_API_BASE_URL ?? stored.apiBaseUrl;
  const releaseChannel = env.VISUAL_STANDARD_RELEASE_CHANNEL ?? stored.releaseChannel;
  if (stored.contractVersion !== CONTRACT_VERSION || stored.installerVersion !== INSTALLER_VERSION) {
    throw new Error("The Visual Standard installer configuration is incompatible.");
  }
  if (typeof stored.productCode !== "string" || !/^[a-z0-9][a-z0-9_]{1,62}$/.test(stored.productCode)) {
    throw new Error("The Visual Standard product configuration is invalid.");
  }
  if (typeof releaseChannel !== "string" || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(releaseChannel)) {
    throw new Error("The Visual Standard release channel is invalid.");
  }
  if (typeof stored.privateEntrypoint !== "string" || !/^package\/[A-Za-z0-9._/-]+\.mjs$/.test(stored.privateEntrypoint)) {
    throw new Error("The authorized installer interface is invalid.");
  }
  return {
    contractVersion: CONTRACT_VERSION,
    installerVersion: INSTALLER_VERSION,
    apiBaseUrl: requireHttpsUrl(apiBaseUrl, "Visual Standard service URL").href.replace(/\/$/, ""),
    productCode: stored.productCode,
    releaseChannel,
    privateEntrypoint: stored.privateEntrypoint,
    keyringFile: resolve(keyringFile),
  };
};
