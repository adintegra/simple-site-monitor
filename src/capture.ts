import path from "path";
import fs from "fs";
import { chromium } from "playwright";
import { VIEWPORT, DATA_DIR } from "./config";
import { loadSites, Site } from "./sites";
import {
  isoTimestamp,
  filenameFromTimestamp,
  loadMeta,
  saveMeta,
  siteDir,
  ScreenshotMeta,
} from "./storage";
import { computeDiff } from "./diff";

export async function captureAllSites(): Promise<void> {
  const sites = loadSites();
  if (sites.length === 0) {
    console.warn("No sites found in sitelist.txt");
    return;
  }

  // const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--disable-features=TranslateUI,BlinkGenPropertyTrees,ImprovedCookieControls,SameSiteByDefaultCookies,LazyFrameLoading'] });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const site of sites) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await captureSite(browser, site);
      } catch (err) {
        console.error(
          `Error capturing site ${site.id} (${site.url}):`,
          err,
        );
      }
    }
  } finally {
    await browser.close();
  }
}

async function captureSite(
  browser: import("playwright").Browser,
  site: Site,
): Promise<void> {
  const ts = isoTimestamp();
  const file = filenameFromTimestamp(ts);

  const dir = siteDir(site.id);
  const filePath = path.join(dir, file);

  const page = await browser.newPage({ viewport: VIEWPORT, bypassCSP: true });
  try {
    // Load the page
    await page.goto(site.url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Scroll to the bottom
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 800;
        const timer = setInterval(() => {
          const scrollHeight =
            document.documentElement.scrollHeight ||
            document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    });

    // Wait for all frames to load
    if (page.frames().length > 0) {
      // Log the page and frames URLs
      console.log("Page URL:", page.url());
      console.log("Frames:", page.frames().map((frame) => frame.url()));

      try {
        await Promise.all(
          page.frames().map((frame) => frame.waitForLoadState("networkidle", { timeout: 60000 }))
        );
      } catch (error) {
        console.error("Timeout waiting for frames to load:", error);
      }
    }

    // Wait 30 seconds
    await page.waitForTimeout(30000);

    // Take the screenshot
    await page.screenshot({
      path: filePath,
      fullPage: true,
      type: "png",
    });
  } finally {
    await page.close();
  }

  // Update metadata and compute diff against previous shot.
  const meta = loadMeta(site.id);
  const previous = meta[meta.length - 1];

  let hasDiff = false;
  let diffFile: string | undefined;
  let diffScore: number | undefined;

  if (previous) {
    const diff = await computeDiff(
      site.id,
      ts,
      previous.file,
      file,
    );
    hasDiff = diff.hasDiff;
    diffFile = diff.diffFile;
    diffScore = diff.diffScore;
  }

  const entry: ScreenshotMeta = {
    timestamp: ts,
    file: path.basename(file),
    hasDiff,
    diffFile,
    diffScore,
  };

  const updated = [...meta, entry];
  saveMeta(site.id, updated);

  console.log(
    `Captured ${site.id} at ${ts} -> ${path.relative(
      DATA_DIR,
      filePath,
    )} (hasDiff=${hasDiff ? "yes" : "no"})`,
  );
}
