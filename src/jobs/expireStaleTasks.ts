import { taskService } from "../services/task.service";

const EXPIRY_INTERVAL_MS = 60_000; // 1 minute

let intervalHandle: NodeJS.Timeout | null = null;

/**
 * Start the background job that expires stale OPEN tasks.
 * Runs every minute and marks tasks whose expiresAt is in the past as EXPIRED.
 */
export function startExpireStaleTasksJob(): void {
  if (intervalHandle) return; // already running

  const run = async () => {
    try {
      const count = await taskService.expireStale();
      if (count > 0) {
        console.log(`[cron] Expired ${count} stale task(s)`);
      }
    } catch (err) {
      console.error("[cron] expireStaleTasks failed:", err);
    }
  };

  // Run once immediately, then every interval
  run();
  intervalHandle = setInterval(run, EXPIRY_INTERVAL_MS);
}

export function stopExpireStaleTasksJob(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
