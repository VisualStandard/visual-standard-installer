import { randomBytes } from "node:crypto";
import { CLOCK_SKEW_SECONDS, CONTRACT_VERSION, DOWNLOAD_URL_SECONDS, requireHttpsUrl } from "./config.mjs";
import { validateLicenseKey } from "./license-input.mjs";

const SAFE_ERRORS = new Map([
  ["invalid_request", "The installer request was rejected. Install the current Visual Standard installer and try again."],
  ["license_invalid", "The license key is invalid."],
  ["license_revoked", "This license is not active. Contact support."],
  ["activation_limit_reached", "This license is already active on two Macs."],
  ["entitlement_invalid", "The local authorization is invalid. Activate again."],
  ["entitlement_expired", "The authorization expired. Enter the license key again."],
  ["entitlement_revoked", "This authorization has been revoked. Contact support."],
  ["device_inactive", "This Mac is not active for the license. Contact support."],
  ["channel_not_allowed", "No release is available for this license channel."],
  ["rollback_not_allowed", "The requested rollback is not authorized."],
  ["release_not_available", "No eligible Visual Standard Motion Graphics Creator release is available."],
  ["idempotency_conflict", "The release request conflicted with an earlier attempt. Run the installer again."],
  ["installer_update_required", "A newer Visual Standard installer is required. Run npx @visualstandard/install@latest."],
  ["rate_limited", "Too many requests. Wait and try again."],
  ["release_storage_unavailable", "The release service is temporarily unavailable."],
]);

export class PublicApiError extends Error {
  constructor(code, status, retryAfter = null) {
    super(SAFE_ERRORS.get(code) ?? "The Visual Standard service rejected the request.");
    this.name = "PublicApiError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

const postJson = async (url, { headers = {}, body, fetchImpl = fetch }) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("The Visual Standard service could not be reached securely.");
  }
  let text;
  try {
    text = await response.text();
  } catch {
    throw new Error("The Visual Standard service returned an invalid response.");
  }
  if (text.length > 65_536) throw new Error("The Visual Standard service response was too large.");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The Visual Standard service returned an invalid response.");
  }
  if (!response.ok) {
    const code = parsed.error ?? parsed.code;
    throw new PublicApiError(
      typeof code === "string" ? code : "unknown",
      response.status,
      response.headers.get("retry-after"),
    );
  }
  return parsed;
};

export const activateLicense = async ({ config, licenseKey, installationId, fetchImpl }) => {
  validateLicenseKey(licenseKey);
  const response = await postJson(`${config.apiBaseUrl}/v1/licenses/activate`, {
    fetchImpl,
    body: {
      licenseKey,
      installationId,
      releaseChannel: config.releaseChannel,
    },
  });
  if (response.contractVersion !== CONTRACT_VERSION || typeof response.entitlementToken !== "string" || !Number.isSafeInteger(response.expiresAt) || !/^vsr1_[A-Za-z0-9_-]{43}$/.test(response.refreshToken)) {
    throw new Error("The activation response is invalid.");
  }
  return response;
};

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const semverParts = (value) => value.match(semver)?.slice(1).map(Number);
const isAtLeast = (actual, minimum) => {
  const left = semverParts(actual);
  const right = semverParts(minimum);
  if (!left || !right) return false;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
};

export const authorizeRelease = async ({
  config,
  entitlementToken,
  now = Math.floor(Date.now() / 1000),
  fetchImpl,
}) => {
  const response = await postJson(`${config.apiBaseUrl}/v1/releases/authorize`, {
    fetchImpl,
    headers: {
      Authorization: `Bearer ${entitlementToken}`,
      "Idempotency-Key": randomBytes(24).toString("base64url"),
    },
    body: {
      contractVersion: CONTRACT_VERSION,
      action: "install",
      installerVersion: config.installerVersion,
      installedVersion: null,
      requestedVersion: null,
    },
  });
  const release = response?.release;
  const rollback = release?.rollback;
  if (
    response?.contractVersion !== CONTRACT_VERSION
    || response.action !== "install"
    || typeof response.authorizationId !== "string"
    || response.authorizationId.length < 1
    || !Number.isSafeInteger(response.issuedAt)
    || response.issuedAt > now + CLOCK_SKEW_SECONDS
    || !release
    || !semver.test(release.version)
    || !semver.test(release.minimumInstallerVersion)
    || !isAtLeast(config.installerVersion, release.minimumInstallerVersion)
    || release.channel !== config.releaseChannel
    || typeof release.sha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(release.sha256)
    || !Number.isSafeInteger(release.sizeBytes)
    || release.sizeBytes < 1
    || !Number.isSafeInteger(release.downloadUrlExpiresAt)
    || release.downloadUrlExpiresAt - response.issuedAt !== DOWNLOAD_URL_SECONDS
    || release.downloadUrlExpiresAt <= now - CLOCK_SKEW_SECONDS
    || !rollback
    || typeof rollback.allowed !== "boolean"
    || (
      rollback.allowed
        ? !semver.test(rollback.targetVersion) || !Number.isSafeInteger(rollback.supportedUntil) || rollback.supportedUntil <= now - CLOCK_SKEW_SECONDS
        : rollback.targetVersion !== null || rollback.supportedUntil !== null
    )
  ) {
    throw new Error("The authorized release response is invalid.");
  }
  requireHttpsUrl(release.downloadUrl, "Authorized release URL");
  return release;
};
