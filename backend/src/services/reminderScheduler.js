const google = require("../config/google");
const userStore = require("../db/userStore");
const budgetService = require("./budgetService");
const emailService = require("./emailService");

/**
 * Checks every user's saved notification settings against the current time
 * and sends an email for any match. Called either:
 *  - by Vercel Cron hitting GET /api/cron/reminders (production)
 *  - by a local setInterval in server.js (local `npm run dev`)
 */
async function runReminderCheck() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const nowStr = `${hh}:${mm}`;

  const userIds = await userStore.getAllUserIds();
  let sent = 0;

  for (const userId of userIds) {
    const user = await userStore.getUser(userId);
    if (!user || !user.refreshToken || !user.spreadsheetId) continue;

    try {
      const authClient = google.clientFromRefreshToken(user.refreshToken);
      const settings = await budgetService.getNotifSettings(authClient, user.spreadsheetId);
      if (settings.enabled && settings.times && settings.times.includes(nowStr)) {
        const toEmail = settings.notifyEmail || user.email;
        if (toEmail) {
          await emailService.sendSpendingReminderEmail(toEmail);
          sent++;
        }
      }
    } catch (e) {
      console.error(`Reminder check failed for user ${userId}:`, e.message);
    }
  }

  return { checked: userIds.length, sent, at: nowStr };
}

/** Local-dev convenience only: re-runs the check every minute via setInterval. */
function startLocalPolling() {
  setInterval(() => {
    runReminderCheck().catch((e) => console.error("Reminder poll failed:", e));
  }, 60 * 1000);
}

module.exports = { runReminderCheck, startLocalPolling };
