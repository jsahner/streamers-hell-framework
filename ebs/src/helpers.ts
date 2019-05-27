import crypto from "crypto";
import fileType from "file-type";
import fs from "fs";
import path from "path";
import util from "util";
import { PollParticipants } from "./API";
import { InternalViewerRole } from "./behaviors/viewerConnection";
import { IMAGE_PATH } from "./globals";
import log from "./log";

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Defaults to ViewerRole.Anonymous.
 */
export function toViewerRole(
  participants: PollParticipants
): InternalViewerRole {
  switch (participants) {
    case "all":
      return InternalViewerRole.Anonymous;

    case "logged_in":
      return InternalViewerRole.Unlinked;

    case "subscribers":
      return InternalViewerRole.Subscriber;

    default:
      return InternalViewerRole.Anonymous;
  }
}

export async function verifyAndSaveImage(buffer: Buffer) {
  const t = fileType(buffer);

  if (t == null || t.mime !== "image/png") {
    log.info(`Image is no valid PNG file`);
    return;
  }

  const hash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  const filename = `${hash}.png`;

  try {
    // only overwrite if file is not already on disk
    await writeFile(path.join(IMAGE_PATH, filename), buffer, { flag: "wx" });
  } catch (err) {
    // ignored
  }

  return filename;
}

export const writeFile = util.promisify(fs.writeFile);
