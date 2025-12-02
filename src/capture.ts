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

  const browser = await chromium.launch();
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

  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    // Navigate with longer timeout and wait for load state
    await page.goto(site.url, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    // Wait for network to be idle (but don't fail if it times out)
    try {
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    } catch {
      // Some sites have continuous network activity - continue anyway
      console.warn(`Network idle timeout for ${site.id}, continuing...`);
    }

    // Initial delay to allow page to settle
    await page.waitForTimeout(10000);

    // Scroll through the page to trigger lazy-loaded content
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

    // Wait for network idle again after scrolling (triggers lazy-loaded content)
    // Don't fail if it times out - some sites have continuous activity
    try {
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    } catch {
      console.warn(`Post-scroll network idle timeout for ${site.id}, continuing...`);
    }

    // Wait for all iframes to load
    try {
      await page.waitForFunction(
        () => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          if (iframes.length === 0) return true;

          return iframes.every((iframe) => {
            try {
              // Check if iframe has loaded content
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              return iframeDoc && iframeDoc.readyState === "complete";
            } catch {
              // Cross-origin iframe - assume loaded if src is set
              return iframe.src !== "";
            }
          });
        },
        { timeout: 30000 },
      );
    } catch {
      // If iframe check times out, continue anyway
      console.warn(`Iframe load check timed out for ${site.id}, proceeding...`);
    }

    // Final extended delay to ensure all iframe content is rendered
    await page.waitForTimeout(20000);

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
