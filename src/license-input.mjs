import { closeSync, openSync, readSync, writeSync } from "node:fs";
import { spawnSync } from "node:child_process";

export const LICENSE_PATTERN = /^VS1-[A-Z0-9][A-Z0-9-]{6,122}[A-Z0-9]$/;

export const validateLicenseKey = (value) => {
  if (typeof value !== "string" || value.length < 12 || value.length > 128 || !LICENSE_PATTERN.test(value)) {
    throw new Error("The license key format is invalid. Expected a VS1 key.");
  }
  return value;
};

const readFromDialog = ({ spawn = spawnSync } = {}) => {
  const result = spawn("osascript", [
    "-e",
    'text returned of (display dialog "Enter your Visual Standard Motion Graphics Creator license key (VS1)." default answer "" with hidden answer buttons {"Cancel", "Continue"} default button "Continue" cancel button "Cancel" with title "Visual Standard Motion Graphics Creator")',
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error("License entry was cancelled.");
  return validateLicenseKey(result.stdout.trim());
};

export const readLicenseKey = ({
  platform = process.platform,
  openTty = openSync,
  dialog = readFromDialog,
} = {}) => {
  let fd;
  try {
    fd = openTty("/dev/tty", "r+");
  } catch {
    if (platform === "darwin") return dialog();
    throw new Error("Secure license entry requires an interactive terminal.");
  }
  const stty = (mode) => spawnSync("stty", [mode], { stdio: [fd, fd, fd] });
  writeSync(fd, "Visual Standard Motion Graphics Creator license key (VS1): ");
  stty("-echo");
  const bytes = [];
  const byte = Buffer.alloc(1);
  try {
    while (bytes.length <= 512 && readSync(fd, byte, 0, 1, null) === 1) {
      if (byte[0] === 10 || byte[0] === 13) break;
      bytes.push(byte[0]);
    }
  } finally {
    stty("echo");
    writeSync(fd, "\n");
    closeSync(fd);
  }
  return validateLicenseKey(Buffer.from(bytes).toString("utf8").trim());
};
