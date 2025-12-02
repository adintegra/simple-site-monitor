import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { DATA_DIR } from "./config";
import { diffFilenameFromTimestamp } from "./storage";

export interface DiffResult {
  hasDiff: boolean;
  diffFile?: string;
  diffScore?: number;
}

export async function computeDiff(
  siteId: string,
  timestamp: string,
  previousFile: string,
  currentFile: string,
): Promise<DiffResult> {
  const prevPath = path.join(DATA_DIR, siteId, previousFile);
  const currPath = path.join(DATA_DIR, siteId, currentFile);

  if (!fs.existsSync(prevPath) || !fs.existsSync(currPath)) {
    return { hasDiff: false };
  }

  const [prevPng, currPng] = await Promise.all([
    loadPng(prevPath),
    loadPng(currPath),
  ]);

  if (
    prevPng.width !== currPng.width ||
    prevPng.height !== currPng.height
  ) {
    // Different dimensions: treat as full diff, but skip pixel-level diffing.
    return { hasDiff: true, diffScore: 1 };
  }

  const diff = new PNG({ width: currPng.width, height: currPng.height });
  const changedPixels = pixelmatch(
    prevPng.data,
    currPng.data,
    diff.data,
    currPng.width,
    currPng.height,
    { threshold: 0.1 },
  );

  const totalPixels = currPng.width * currPng.height;
  const diffScore = totalPixels
    ? changedPixels / totalPixels
    : 0;
  const hasDiff = changedPixels > 0;

  let diffFile: string | undefined;

  if (hasDiff) {
    diffFile = diffFilenameFromTimestamp(timestamp);
    const diffPath = path.join(DATA_DIR, siteId, diffFile);
    await writePng(diffPath, diff);
  }

  return { hasDiff, diffFile, diffScore };
}

function loadPng(filePath: string): Promise<PNG> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(new PNG())
      .on("parsed", function (this: PNG) {
        resolve(this);
      })
      .on("error", (err: Error) => reject(err));
  });
}

function writePng(filePath: string, png: PNG): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    png
      .pack()
      .pipe(stream)
      .on("finish", () => resolve())
      .on("error", (err: Error) => reject(err));
  });
}
