import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const installerStateDirectory = (home) => join(home, ".visual-standard", "installer-state");

export const readOrCreateInstallationId = (home) => {
  const directory = installerStateDirectory(home);
  const file = join(directory, "installation-id");
  if (existsSync(file)) {
    const value = readFileSync(file, "utf8").trim();
    if (!IDENTIFIER_PATTERN.test(value)) throw new Error("The local installation identifier is invalid.");
    chmodSync(file, 0o600);
    return value;
  }
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const value = randomBytes(32).toString("base64url");
  const temporary = `${file}.tmp-${process.pid}-${randomBytes(6).toString("hex")}`;
  writeFileSync(temporary, `${value}\n`, { mode: 0o600, flag: "wx" });
  renameSync(temporary, file);
  chmodSync(file, 0o600);
  return value;
};
