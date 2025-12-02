import { runOnce } from "./monitor";

runOnce().catch((err) => {
  console.error("Error during one-off capture:", err);
  process.exitCode = 1;
});
