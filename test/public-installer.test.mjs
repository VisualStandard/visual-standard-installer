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
import { install } from "../src/installer.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const currentTestFile = fileURLToPath(import.meta.url);
const now = 2_000_000_000;
const retiredName = ["n", "a", "a", "d"].join("");
const retiredState = `.${retiredName}`;
const retiredEnvironment = `${retiredName.toUpperCase()}_`;
const retiredCommand = `${retiredName}-`;
const forbidden = [retiredName, retiredState, retiredEnvironment, retiredCommand];
const testLicense = ["VS1", "TEST", "LICENSE", "NOT", "REAL"].join("-");

const collect = (directory) => readdirSync(directory).flatMap((name) => {
  const entry = join(directory, name);
  if (name === "node_modules" || name === ".git") return [];
  return statSync(entry).isDirectory() ? collect(entry) : [entry];
});

const createToken = ({ installationId, channel = "stable", privateKey }) => {
  const header = Buffer.from(JSON.stringify({ alg: "Ed25519", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    licenseId: "license-test",
    deviceId: installationId,
    channel,
    issuedAt: now - 10,
    expiresAt: now + 3600,
    contractVersion: 1,
  })).toString("base64url");
  const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
};

const createPrivateFixture = (directory, { fail = false } = {}) => {
  const packageRoot = join(directory, "private-source", "package");
  mkdirSync(packageRoot, { recursive: true });
  const entrypoint = join(packageRoot, "installer-entry.mjs");
  const privateDiagnostic = `${retiredName} private diagnostic`;
  writeFileSync(entrypoint, `
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
const handoff = JSON.parse(readFileSync(process.env.VISUAL_STANDARD_INSTALL_HANDOFF, "utf8"));
if (!handoff.entitlementToken || handoff.contractVersion !== 1) process.exit(2);
${fail ? `console.error(${JSON.stringify(privateDiagnostic)}); process.exit(9);` : ""}
const runtime = process.env.VISUAL_STANDARD_RUNTIME_HOME;
const home = dirname(dirname(runtime));
mkdirSync(runtime, { recursive: true });
writeFileSync(join(runtime, "installation-verified.json"), JSON.stringify({ version: handoff.release.version }));
const commands = join(home, ".claude", "commands");
const skill = join(home, ".claude", "skills", "motion-graphics-creator");
mkdirSync(commands, { recursive: true });
mkdirSync(skill, { recursive: true });
for (const name of ["atelier", "create", "index", "market", "mono", "resume", "signal", "update"]) {
  writeFileSync(join(commands, \`visual-\${name}.md\`), \`# /visual-\${name}\\n\`);
}
writeFileSync(join(skill, "SKILL.md"), "# Visual Standard Motion Graphics Creator\\n");
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

const fixture = (directory, { invalidSignature = false, privateFailure = false } = {}) => {
  const installationId = "A".repeat(43);
  const signing = generateKeyPairSync("ed25519");
  const other = generateKeyPairSync("ed25519");
  const token = createToken({
    installationId,
    privateKey: invalidSignature ? other.privateKey : signing.privateKey,
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
  const privateRelease = createPrivateFixture(directory, { fail: privateFailure });
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
          minimumInstallerVersion: "1.0.8",
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
      installerVersion: "1.0.8",
      apiBaseUrl: "https://api.visualstandard.test",
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
  assert.ok(existsSync(join(home, ".visual-standard", "motion-graphics-creator", "installation-verified.json")));
  assert.ok(existsSync(join(home, ".claude", "skills", "motion-graphics-creator", "SKILL.md")));
  for (const command of ["atelier", "create", "index", "market", "mono", "resume", "signal", "update"]) {
    assert.ok(existsSync(join(home, ".claude", "commands", `visual-${command}.md`)));
  }
  const output = logs.join("\n");
  assert.match(output, /Visual Standard Motion Graphics Creator installed and verified/);
  for (const value of forbidden) assert.equal(output.toLowerCase().includes(value.toLowerCase()), false);
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
  assert.equal(manifest.version, "1.0.8");
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
