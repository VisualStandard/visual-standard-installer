import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const runTar = (args, cwd) => spawnSync("tar", args, {
  cwd,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  maxBuffer: 32 * 1024 * 1024,
});

const inspectArchive = (archive) => {
  const names = runTar(["-tzf", archive], dirname(archive));
  if (names.status !== 0) throw new Error("The authorized installer could not be inspected.");
  for (const raw of names.stdout.split("\n").filter(Boolean)) {
    const clean = raw.replace(/\/$/, "");
    const segments = clean.split("/");
    if (
      raw.startsWith("/")
      || segments[0] !== "package"
      || segments.some((segment) => segment === "" || segment === "." || segment === "..")
      || posix.normalize(clean) !== clean
    ) {
      throw new Error("The authorized installer archive is unsafe.");
    }
  }
  const types = runTar(["-tvzf", archive], dirname(archive));
  if (types.status !== 0 || types.stdout.split("\n").filter(Boolean).some((line) => !["-", "d"].includes(line[0]))) {
    throw new Error("The authorized installer archive contains an unsafe file type.");
  }
};

export const runPrivateInstaller = ({
  archive,
  stagingDirectory,
  privateEntrypoint,
  handoff,
  runtimeHome,
  spawn = spawnSync,
}) => {
  inspectArchive(resolve(archive));
  const extraction = join(stagingDirectory, "authorized");
  mkdirSync(extraction, { mode: 0o700 });
  const unpack = runTar(["-xzf", resolve(archive), "-C", extraction], stagingDirectory);
  if (unpack.status !== 0) throw new Error("The authorized installer could not be prepared.");
  const entrypoint = resolve(extraction, privateEntrypoint);
  const packageRoot = resolve(extraction, "package");
  if (!entrypoint.startsWith(`${packageRoot}/`) || !existsSync(entrypoint) || !lstatSync(entrypoint).isFile()) {
    throw new Error("The authorized installer component is unavailable.");
  }
  const handoffFile = join(stagingDirectory, "visual-standard-install-handoff.json");
  writeFileSync(handoffFile, `${JSON.stringify(handoff)}\n`, { mode: 0o600, flag: "wx" });
  chmodSync(handoffFile, 0o600);
  try {
    const result = spawn(process.execPath, [entrypoint], {
      cwd: packageRoot,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        VISUAL_STANDARD_INSTALL_HANDOFF: handoffFile,
        VISUAL_STANDARD_RUNTIME_HOME: runtimeHome,
      },
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0) throw new Error("Visual Standard Motion Graphics Creator could not be installed.");
    const installedEntrypoint = join(runtimeHome, "alpha", "cli.mjs");
    if (!existsSync(installedEntrypoint) || !lstatSync(installedEntrypoint).isFile()) {
      throw new Error("Visual Standard Motion Graphics Creator installation could not be verified.");
    }
  } finally {
    rmSync(handoffFile, { force: true });
  }
};
