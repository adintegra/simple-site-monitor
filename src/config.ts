import path from "path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const SITE_LIST_PATH = path.join(
  process.cwd(),
  "sitelist.txt",
);

// Screenshot interval in cron format (default: every 15 minutes)
export const SCREENSHOT_CRON =
  process.env.SCREENSHOT_CRON || "*/7 * * * *";

// Retention period in days
export const RETENTION_DAYS = Number(
  process.env.RETENTION_DAYS || 7,
);

export const VIEWPORT = {
  width: 1280,
  height: 720,
};

export const SERVER_PORT = Number(process.env.PORT || 3000);
