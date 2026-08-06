import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { activateLicense, authorizeRelease } from "./api.mjs";
import { loadConfig } from "./config.mjs";
import { downloadRelease } from "./download.mjs";
import { verifyEntitlement, loadKeyring } from "./entitlement.mjs";
import { readOrCreateInstallationId } from "./identity.mjs";
import { readLicenseKey } from "./license-input.mjs";
import { runPrivateInstaller } from "./private-launcher.mjs";

const PRODUCT = "Visual Standard Motion Graphics Creator";

const commandExists = (name) => spawnSync("/usr/bin/env", ["sh", "-lc", `command -v ${name}`], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
}).status === 0;

export const checkEnvironment = ({ platform = process.platform, nodeVersion = process.versions.node } = {}) => {
  if (platform !== "darwin") throw new Error(`${PRODUCT} supports macOS only.`);
  if (Number(nodeVersion.split(".")[0]) < 20) throw new Error("Node.js 20 or newer is required.");
  if (!commandExists("tar")) throw new Error("The macOS archive utility is required.");
  if (!commandExists("claude")) throw new Error("Claude Code must be installed and signed in.");
  if (!commandExists("brew")) throw new Error("Homebrew is required so Visual Standard can install FFmpeg and Whisper. Install Homebrew from brew.sh, then run this installer again.");
};

export const install = async ({
  env = process.env,
  home = homedir(),
  platform = process.platform,
  now = Math.floor(Date.now() / 1000),
  fetchImpl = fetch,
  readLicenseKeyImpl = readLicenseKey,
  loadConfigImpl = loadConfig,
  checkEnvironmentImpl = checkEnvironment,
  runPrivateInstallerImpl = runPrivateInstaller,
  log = console.log,
} = {}) => {
  checkEnvironmentImpl({ platform });
  const config = loadConfigImpl({ env });
  const runtimeHome = join(home, ".visual-standard", "motion-graphics-creator");
  if (existsSync(runtimeHome)) {
    throw new Error(`${PRODUCT} is already installed. Run /visual-update in Claude Code.`);
  }
  const licenseKey = readLicenseKeyImpl({ platform });
  const installationId = readOrCreateInstallationId(home);
  const activation = await activateLicense({ config, licenseKey, installationId, fetchImpl });
  const entitlement = verifyEntitlement(activation.entitlementToken, {
    keyring: loadKeyring(config.keyringFile),
    expectedChannel: config.releaseChannel,
    expectedInstallationId: installationId,
    expectedProductCode: config.productCode,
    now,
  });
  if (activation.expiresAt !== entitlement.expiresAt) throw new Error("The activation response could not be verified.");
  const release = await authorizeRelease({
    config,
    entitlementToken: activation.entitlementToken,
    now,
    fetchImpl,
  });
  const staging = mkdtempSync(join(tmpdir(), "visual-standard-install-"));
  try {
    const archive = await downloadRelease({ release, directory: staging, fetchImpl });
    await runPrivateInstallerImpl({
      archive,
      stagingDirectory: staging,
      privateEntrypoint: config.privateEntrypoint,
      runtimeHome,
      handoff: {
        contractVersion: config.contractVersion,
        installerVersion: config.installerVersion,
        entitlementToken: activation.entitlementToken,
        deviceId: entitlement.deviceId,
        installationId: entitlement.installationId,
        productCode: entitlement.productCode,
        channel: entitlement.channel,
        issuedAt: entitlement.issuedAt,
        expiresAt: entitlement.expiresAt,
        release: {
          version: release.version,
          channel: release.channel,
          sha256: release.sha256,
          sizeBytes: release.sizeBytes,
          rollback: release.rollback,
        },
      },
    });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  log(`${PRODUCT} installed and verified.`);
  log("Quit and reopen the Claude app, open Code, start a Local session, and run /visual-create.");
};
