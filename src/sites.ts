import fs from "fs";
import path from "path";
import { SITE_LIST_PATH } from "./config";

export interface Site {
  id: string;
  url: string;
  label: string;
}

function slugify(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function loadSites(): Site[] {
  const raw = fs.readFileSync(SITE_LIST_PATH, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  return lines.map((url) => {
    const id = slugify(url);
    const label = url;
    return { id, url, label };
  });
}

export function getSiteById(id: string): Site | undefined {
  return loadSites().find((s) => s.id === id);
}
