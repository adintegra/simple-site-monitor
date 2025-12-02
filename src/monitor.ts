import cron from "node-cron";
import { SCREENSHOT_CRON } from "./config";
import { captureAllSites } from "./capture";
import { cleanupOldScreens } from "./retention";

export async function runOnce(): Promise<void> {
  await captureAllSites();
  await cleanupOldScreens();
}

export function startScheduler(): void {
  console.log(
    `Starting scheduler with cron "${SCREENSHOT_CRON}"`,
  );

  cron.schedule(SCREENSHOT_CRON, async () => {
    console.log("Running scheduled capture job...");
    try {
      await captureAllSites();
      await cleanupOldScreens();
    } catch (err) {
      console.error("Error in scheduled job:", err);
    }
  });
}

// If run directly via ts-node src/monitor.ts
if (require.main === module) {
  startScheduler();
}
