import fs from "fs";
import path from "path";
import { RETENTION_DAYS, DATA_DIR } from "./config";
import { loadSites } from "./sites";
import { loadMeta, saveMeta } from "./storage";

export async function cleanupOldScreens(): Promise<void> {
  const sites = loadSites();
  if (!fs.existsSync(DATA_DIR)) {
    return;
  }

  const cutoff =
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const site of sites) {
    const meta = loadMeta(site.id);
    if (meta.length === 0) continue;

    const keep = [];
    for (const entry of meta) {
      const ts = Date.parse(entry.timestamp);
      if (Number.isNaN(ts) || ts >= cutoff) {
        keep.push(entry);
      } else {
        // delete screenshot and diff files
        const shotPath = path.join(
          DATA_DIR,
          site.id,
          entry.file,
        );
        safeUnlink(shotPath);
        if (entry.diffFile) {
          const diffPath = path.join(
            DATA_DIR,
            site.id,
            entry.diffFile,
          );
          safeUnlink(diffPath);
        }
      }
    }

    if (keep.length !== meta.length) {
      saveMeta(site.id, keep);
      console.log(
        `Cleaned up old screenshots for ${site.id} (kept ${keep.length}/${meta.length})`,
      );
    }
  }
}

function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`Failed to delete ${filePath}:`, err);
  }
}
