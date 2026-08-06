import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { activateLicense } from "../src/api.mjs";
import { INSTALLER_VERSION, loadConfig } from "../src/config.mjs";
import { install } from "../src/installer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const currentTestFile = fileURLToPath(import.meta.url);
const now = 2_000_000_000;
const retiredName = ["n", "a", "a", "d"].join("");
const retiredState = `.${retiredName}`;
const retiredEnvironment = `${retiredName.toUpperCase()}_`;
const retiredCommand = `${retiredName}-`;
const retiredStageLabels = [
  ["b", "e", "t", "a"].join(""),
  ["a", "c", "c", "e", "p", "t", "a", "n", "c", "e"].join(""),
];
const forbidden = [retiredName, retiredState, retiredEnvironment, retiredCommand, ...retiredStageLabels];
const testLicense = ["VS1", "TEST", "LICENSE", "NOT", "REAL"].join("-");
const productCode = "motion_graphics_creator";

const collect = (directory) => readdirSync(directory).flatMap((name) => {
  const entry = join(directory, name);
  if (name === "node_modules" || name === ".git") return [];
  return statSync(entry).isDirectory() ? collect(entry) : [entry];
});

const createToken = ({ installationId, channel = "stable", privateKey, tokenProductCode = productCode, tokenInstallationId = installationId }) => {
  const header = Buffer.from(JSON.stringify({ alg: "Ed25519", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    licenseId: "00000000-0000-4000-8000-000000000010",
    deviceId: "00000000-0000-4000-8000-000000000020",
    installationId: tokenInstallationId,
    channel,
    productCode: tokenProductCode,
    issuedAt: now - 10,
    expiresAt: now + 3600,
    contractVersion: 1,
  })).toString("base64url");
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
};

const createPrivateFixture = (directory, { fail = false, falseSuccess = false } = {}) => {
  const packageRoot = join(directory, "private-source", "package");
  mkdirSync(packageRoot, { recursive: true });
  const entrypoint = join(packageRoot, "installer-entry.mjs");
  const privateDiagnostic = `${retiredName} private diagnostic`;
  writeFileSync(entrypoint, `
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
export const installFromPrivateHandoff = () => {
const handoff = JSON.parse(readFileSync(process.env.VISUAL_STANDARD_INSTALL_HANDOFF, "utf8"));
if (!handoff.entitlementToken || handoff.contractVersion !== 1) process.exit(2);
${fail ? `throw new Error(${JSON.stringify(privateDiagnostic)});` : ""}
const runtime = process.env.VISUAL_STANDARD_RUNTIME_HOME;
const home = dirname(dirname(runtime));
${falseSuccess ? "return;" : ""}
mkdirSync(runtime, { recursive: true });
mkdirSync(join(runtime, "alpha"), { recursive: true });
writeFileSync(join(runtime, "alpha", "cli.mjs"), "// verified runtime entrypoint\\n");
writeFileSync(join(runtime, "installation-verified.json"), JSON.stringify({ version: handoff.release.version }));
const commands = join(home, ".claude", "commands");
const skill = join(home, ".claude", "skills", "motion-graphics-creator");
mkdirSync(commands, { recursive: true });
mkdirSync(skill, { recursive: true });
for (const name of ["atelier", "create", "index", "market", "mono", "resume", "signal", "update"]) {
  writeFileSync(join(commands, \`visual-\${name}.md\`), \`# /visual-\${name}\\n\`);
}
writeFileSync(join(skill, "SKILL.md"), "# Visual Standard Motion Graphics Creator\\n");
};
`);
  chmodSync(entrypoint, 0o755);
  const archive = join(directory, "private-fixture.tgz");
  const packed = spawnSync("tar", ["-czf", archive, "-C", join(directory, "private-source"), "package"], { encoding: "utf8" });
  assert.equal(packed.status, 0, packed.stderr);
  return {
    archive,
    bytes: readFileSync(archive),
    sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
    sizeBytes: statSync(archive).size,
  };
};

const fixture = (directory, { invalidSignature = false, privateFailure = false, privateFalseSuccess = false, wrongProductCode = false, wrongInstallationId = false } = {}) => {
  const installationId = "A".repeat(43);
  const signing = generateKeyPairSync("ed25519");
  const other = generateKeyPairSync("ed25519");
  const token = createToken({
    installationId,
    privateKey: invalidSignature ? other.privateKey : signing.privateKey,
    tokenProductCode: wrongProductCode ? "another_product" : productCode,
    tokenInstallationId: wrongInstallationId ? "B".repeat(43) : installationId,
  });
  const keyringFile = join(directory, "keyring.json");
  writeFileSync(keyringFile, `${JSON.stringify({
    contractVersion: 1,
    keys: [{
      kid: "test-key",
      alg: "Ed25519",
      publicKeySpkiBase64: signing.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    }],
  })}\n`);
  const privateRelease = createPrivateFixture(directory, { fail: privateFailure, falseSuccess: privateFalseSuccess });
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/v1/licenses/activate")) {
      return new Response(JSON.stringify({
        contractVersion: 1,
        entitlementToken: token,
        expiresAt: now + 3600,
      }), { status: 200 });
    }
    if (String(url).endsWith("/v1/releases/authorize")) {
      return new Response(JSON.stringify({
        contractVersion: 1,
        authorizationId: "authorization-test",
        action: "install",
        issuedAt: now,
        release: {
          version: "1.0.3",
          minimumInstallerVersion: INSTALLER_VERSION,
          channel: "stable",
          sha256: privateRelease.sha256,
          sizeBytes: privateRelease.sizeBytes,
          downloadUrl: "https://download.visualstandard.test/release",
          downloadUrlExpiresAt: now + 300,
          rollback: {
            allowed: false,
            targetVersion: null,
            supportedUntil: null,
          },
        },
      }), { status: 200 });
    }
    if (String(url) === "https://download.visualstandard.test/release") {
      return new Response(privateRelease.bytes, { status: 200 });
    }
    throw new Error("unexpected request");
  };
  return {
    calls,
    fetchImpl,
    installationId,
    config: {
      contractVersion: 1,
      installerVersion: INSTALLER_VERSION,
      apiBaseUrl: "https://api.visualstandard.test",
      productCode,
      releaseChannel: "stable",
      privateEntrypoint: "package/installer-entry.mjs",
      keyringFile,
    },
  };
};

test("clean install activates, verifies, downloads, delegates privately, and installs only the Visual Standard Claude surface", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-clean-"));
  const scenario = fixture(home);
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  const logs = [];
  let promptCount = 0;
  await install({
    home,
    platform: "darwin",
    now,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => {
      promptCount += 1;
      return testLicense;
    },
    log: (line) => logs.push(line),
  });
  assert.equal(promptCount, 1);
  assert.deepEqual(scenario.calls.map((call) => new URL(call.url).pathname), [
    "/v1/licenses/activate",
    "/v1/releases/authorize",
    "/release",
  ]);
  assert.deepEqual(JSON.parse(scenario.calls[1].options.body), {
    contractVersion: 1,
    action: "install",
    installerVersion: INSTALLER_VERSION,
    installedVersion: null,
    requestedVersion: null,
  });
  assert.ok(existsSync(join(home, ".visual-standard", "motion-graphics-creator", "installation-verified.json")));
  assert.ok(existsSync(join(home, ".claude", "skills", "motion-graphics-creator", "SKILL.md")));
  for (const command of ["atelier", "create", "index", "market", "mono", "resume", "signal", "update"]) {
    assert.ok(existsSync(join(home, ".claude", "commands", `visual-${command}.md`)));
  }
  const output = logs.join("\n");
  assert.match(output, /Visual Standard Motion Graphics Creator installed and verified/);
  assert.match(output, /reopen the Claude app.*Local session.*\/visual-create/);
  for (const value of forbidden) assert.equal(output.toLowerCase().includes(value.toLowerCase()), false);
});

test("normal Mac and service clock skew does not block installation", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-clock-skew-"));
  const scenario = fixture(home);
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  await install({
    home,
    platform: "darwin",
    now: now - 120,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => testLicense,
    log: () => {},
  });
  assert.ok(existsSync(join(home, ".visual-standard", "motion-graphics-creator", "installation-verified.json")));
});

test("the npm patch keeps the audited stable installer protocol boundary", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const config = loadConfig();
  assert.equal(manifest.version, "1.0.11");
  assert.equal(config.installerVersion, "1.0.7");
  assert.equal(config.apiBaseUrl, "https://visualstandard.io");
  assert.equal(config.productCode, productCode);
  assert.equal(config.releaseChannel, "stable");
  assert.equal(config.privateEntrypoint, "package/installer-entry.mjs");
});

test("the hidden test channel can override public service identifiers explicitly", () => {
  const internalStage = ["b", "e", "t", "a"].join("");
  const internalProductCode = ["founding", internalStage].join("_");
  const internalReleaseChannel = ["founding", internalStage].join("-");
  const config = loadConfig({
    env: {
      VISUAL_STANDARD_API_BASE_URL: `https://${internalStage}.visualstandard.io`,
      VISUAL_STANDARD_PRODUCT_CODE: internalProductCode,
      VISUAL_STANDARD_RELEASE_CHANNEL: internalReleaseChannel,
    },
  });
  assert.equal(config.apiBaseUrl, `https://${internalStage}.visualstandard.io`);
  assert.equal(config.productCode, internalProductCode);
  assert.equal(config.releaseChannel, internalReleaseChannel);
});

test("buyer instructions install from Terminal before opening Claude Code", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const installGuide = readFileSync(join(root, "docs", "INSTALL.md"), "utf8");
  const instructions = `${readme}\n${installGuide}`;
  assert.match(instructions, /Terminal/);
  assert.match(instructions, /npx @visualstandard\/install/);
  assert.match(instructions, /Do not paste (?:this|the installer) command into Claude Code/);
  assert.match(instructions, /Local/);
  assert.match(instructions, /Cloud sessions/);
  assert.doesNotMatch(instructions, /Open Claude Code and paste/);
});

test("invalid entitlement signature stops before authorization or download", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-signature-"));
  const scenario = fixture(home, { invalidSignature: true });
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  await assert.rejects(() => install({
    home,
    platform: "darwin",
    now,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => testLicense,
    log: () => {},
  }), /signature is invalid/i);
  assert.equal(scenario.calls.length, 1);
  assert.equal(existsSync(join(home, ".visual-standard", "motion-graphics-creator")), false);
});

test("an entitlement for another product stops before authorization or download", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-product-"));
  const scenario = fixture(home, { wrongProductCode: true });
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  await assert.rejects(() => install({
    home,
    platform: "darwin",
    now,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => testLicense,
    log: () => {},
  }), /not valid for this installation/i);
  assert.equal(scenario.calls.length, 1);
});

test("an entitlement for another installation stops before authorization or download", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-installation-"));
  const scenario = fixture(home, { wrongInstallationId: true });
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  await assert.rejects(() => install({
    home,
    platform: "darwin",
    now,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => testLicense,
    log: () => {},
  }), /not valid for this installation/i);
  assert.equal(scenario.calls.length, 1);
});

test("private diagnostics are suppressed and converted to buyer-safe output", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-private-error-"));
  const scenario = fixture(home, { privateFailure: true });
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  await assert.rejects(() => install({
    home,
    platform: "darwin",
    now,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => testLicense,
    log: () => {},
  }), (error) => {
    assert.equal(error.message, "Visual Standard Motion Graphics Creator could not be installed.");
    for (const value of forbidden) assert.equal(error.message.toLowerCase().includes(value.toLowerCase()), false);
    return true;
  });
});

test("a private installer that exits zero without installing cannot report success", async () => {
  const home = mkdtempSync(join(tmpdir(), "visual-standard-false-success-"));
  const scenario = fixture(home, { privateFalseSuccess: true });
  const stateDirectory = join(home, ".visual-standard", "installer-state");
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  writeFileSync(join(stateDirectory, "installation-id"), `${scenario.installationId}\n`, { mode: 0o600 });
  await assert.rejects(() => install({
    home,
    platform: "darwin",
    now,
    fetchImpl: scenario.fetchImpl,
    checkEnvironmentImpl: () => {},
    loadConfigImpl: () => scenario.config,
    readLicenseKeyImpl: () => testLicense,
    log: () => {},
  }), /installation could not be verified/i);
});

test("every commercial API failure has bounded buyer-safe guidance", async () => {
  const expected = new Map([
    ["invalid_request", /current Visual Standard installer/i],
    ["license_invalid", /license key is invalid/i],
    ["license_revoked", /contact support/i],
    ["activation_limit_reached", /two Macs/i],
    ["entitlement_invalid", /activate again/i],
    ["entitlement_expired", /enter the license key again/i],
    ["entitlement_revoked", /contact support/i],
    ["device_inactive", /Mac is not active/i],
    ["channel_not_allowed", /license channel/i],
    ["rollback_not_allowed", /rollback is not authorized/i],
    ["release_not_available", /no eligible Visual Standard/i],
    ["idempotency_conflict", /run the installer again/i],
    ["installer_update_required", /@visualstandard\/install@latest/i],
    ["rate_limited", /wait and try again/i],
    ["release_storage_unavailable", /temporarily unavailable/i],
  ]);
  for (const [code, message] of expected) {
    await assert.rejects(() => activateLicense({
      config: { apiBaseUrl: "https://api.visualstandard.test", releaseChannel: "stable" },
      licenseKey: testLicense,
      installationId: "A".repeat(43),
      fetchImpl: async () => new Response(JSON.stringify({ code }), {
        status: code === "rate_limited" ? 429 : 400,
        headers: code === "rate_limited" ? { "Retry-After": "60" } : {},
      }),
    }), (error) => {
      assert.equal(error.code, code);
      assert.match(error.message, message);
      assert.equal(error.retryAfter, code === "rate_limited" ? "60" : null);
      for (const value of forbidden) assert.equal(error.message.toLowerCase().includes(value.toLowerCase()), false);
      return true;
    });
  }
});

test("public repository and packed npm archive contain no retired identity, secrets, or private runtime", () => {
  for (const file of collect(root)) {
    const bytes = readFileSync(file);
    if (bytes.includes(0)) continue;
    const source = bytes.toString("utf8");
    for (const value of forbidden) assert.equal(source.toLowerCase().includes(value.toLowerCase()), false, file);
    if (file !== currentTestFile) {
      assert.doesNotMatch(source, /BEGIN (?:OPENSSH |RSA |EC |ENCRYPTED )?PRIVATE KEY|sk_live_|sk_test_|whsec_|SUPABASE_SERVICE_ROLE|STRIPE_SECRET_KEY|VS1-[A-Z0-9]{12,}/i, file);
    }
  }

  const output = mkdtempSync(join(tmpdir(), "visual-standard-pack-"));
  const packed = spawnSync("npm", [
    "pack",
    "--json",
    "--force",
    "--pack-destination",
    output,
    "--cache",
    join(output, "cache"),
  ], { cwd: root, encoding: "utf8" });
  assert.equal(packed.status, 0, packed.stderr);
  const parsedMetadata = JSON.parse(packed.stdout);
  const metadata = Array.isArray(parsedMetadata) ? parsedMetadata[0] : parsedMetadata;
  assert.ok(metadata && Array.isArray(metadata.files), "npm pack did not return package metadata");
  const archives = readdirSync(output).filter((name) => name.endsWith(".tgz"));
  assert.equal(archives.length, 1, `Expected one packed archive, found: ${archives.join(", ")}`);
  const archive = join(output, archives[0]);
  const listing = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
  assert.equal(listing.status, 0, listing.stderr);
  const contents = spawnSync("tar", ["-xOzf", archive], { encoding: "utf8" });
  assert.equal(contents.status, 0, contents.stderr);
  for (const value of forbidden) {
    assert.equal(listing.stdout.toLowerCase().includes(value.toLowerCase()), false);
    assert.equal(contents.stdout.toLowerCase().includes(value.toLowerCase()), false);
  }
  assert.doesNotMatch(listing.stdout, /runtime|buyer-agent|reference|prompts|entitlement\.json/i);
  assert.doesNotMatch(contents.stdout, /BEGIN (?:OPENSSH |RSA |EC |ENCRYPTED )?PRIVATE KEY|sk_live_|sk_test_|whsec_|SUPABASE_SERVICE_ROLE|STRIPE_SECRET_KEY|VS1-[A-Z0-9]{12,}/i);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(manifest.version, "1.0.11");
  assert.equal(manifest.homepage, "https://visualstandard.io");
  assert.equal(manifest.repository.url, "git+https://github.com/VisualStandard/visual-standard-installer.git");
  assert.equal(manifest.documentation, "https://github.com/VisualStandard/visual-standard-installer/tree/main/docs");
  assert.equal(manifest.bugs.url, "https://github.com/VisualStandard/visual-standard-installer/issues");
  assert.equal(manifest.security, "https://github.com/VisualStandard/visual-standard-installer/security/policy");
  assert.deepEqual(manifest.bin, { "visualstandard-install": "bin/install.mjs" });
  assert.equal(manifest.dependencies, undefined);
  assert.equal(metadata.files.find((file) => file.path === "bin/install.mjs")?.mode, 0o755);
  assert.deepEqual(metadata.files.map((file) => file.path).sort(), [...manifest.files, "package.json"].sort());
});

test("archive documentation is reversible and limited to Visual Standard locations", () => {
  const source = readFileSync(join(root, "docs", "UNINSTALL.md"), "utf8");
  assert.match(source, /\.visual-standard\/motion-graphics-creator/);
  assert.match(source, /\.claude\/commands/);
  assert.match(source, /\.claude\/skills\/motion-graphics-creator/);
  assert.doesNotMatch(source, /rm\s+-rf/);
  for (const value of forbidden) assert.equal(source.toLowerCase().includes(value.toLowerCase()), false);
});
