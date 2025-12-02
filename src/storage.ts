import fs from "fs";
import path from "path";
import { DATA_DIR } from "./config";

export interface ScreenshotMeta {
  timestamp: string; // ISO string
  file: string; // PNG filename
  hasDiff: boolean;
  diffFile?: string;
  diffScore?: number;
}

export type SiteMeta = ScreenshotMeta[];

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function siteDir(siteId: string): string {
  ensureDataDir();
  const dir = path.join(DATA_DIR, siteId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function metaPath(siteId: string): string {
  return path.join(siteDir(siteId), "meta.json");
}

export function loadMeta(siteId: string): SiteMeta {
  const mPath = metaPath(siteId);
  if (!fs.existsSync(mPath)) {
    return [];
  }
  const raw = fs.readFileSync(mPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return [];
}

export function saveMeta(siteId: string, meta: SiteMeta): void {
  const mPath = metaPath(siteId);
  fs.writeFileSync(mPath, JSON.stringify(meta, null, 2), "utf8");
}

export function isoTimestamp(): string {
  return new Date().toISOString();
}

export function filenameFromTimestamp(ts: string): string {
  const safe = ts.replace(/[:.]/g, "-");
  return `${safe}.png`;
}

export function diffFilenameFromTimestamp(ts: string): string {
  const safe = ts.replace(/[:.]/g, "-");
  return `${safe}_diff.png`;
}
