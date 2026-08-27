import { spawnSync } from "node:child_process";

const SERVICE = "io.visualstandard.motion-graphics-creator.refresh";
const TOKEN_PATTERN = /^vsr1_[A-Za-z0-9_-]{43}$/;

export const writeRefreshCredential = ({ installationId, refreshToken, spawn = spawnSync }) => {
  if (!TOKEN_PATTERN.test(refreshToken)) throw new Error("The Visual Standard update credential is invalid.");
  const result = spawn("/usr/bin/security", [
    "add-generic-password", "-U", "-a", `installation:${installationId}`, "-s", SERVICE,
    "-l", "Visual Standard Motion Graphics Creator updates", "-w", refreshToken,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error("The Visual Standard update credential could not be saved securely in macOS Keychain.");
};
