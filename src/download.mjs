import { createHash, randomBytes } from "node:crypto";
import { chmodSync, closeSync, mkdirSync, openSync, rmSync, writeSync } from "node:fs";
import { join } from "node:path";
import { requireHttpsUrl } from "./config.mjs";

export const downloadRelease = async ({ release, directory, fetchImpl = fetch }) => {
  requireHttpsUrl(release.downloadUrl, "Authorized release URL");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const archive = join(directory, `visual-standard-release-${randomBytes(8).toString("hex")}.tgz`);
  let response;
  try {
    response = await fetchImpl(release.downloadUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error("The authorized release download failed.");
  }
  if (!response.ok || !response.body) throw new Error("The authorized release is temporarily unavailable.");
  if (response.url) requireHttpsUrl(response.url, "Final authorized release URL");
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) !== release.sizeBytes) {
    throw new Error("The authorized release size is invalid.");
  }
  const hash = createHash("sha256");
  const fd = openSync(archive, "wx", 0o600);
  let size = 0;
  try {
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      size += buffer.length;
      if (size > release.sizeBytes) throw new Error("The authorized release size is invalid.");
      hash.update(buffer);
      writeSync(fd, buffer);
    }
  } catch (error) {
    closeSync(fd);
    rmSync(archive, { force: true });
    throw error;
  }
  closeSync(fd);
  if (size !== release.sizeBytes || hash.digest("hex") !== release.sha256) {
    rmSync(archive, { force: true });
    throw new Error("The authorized release verification failed.");
  }
  return archive;
};
