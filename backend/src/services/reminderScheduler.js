const google = require("../config/google");
const userStore = require("../db/userStore");
const budgetService = require("./budgetService");
const emailService = require("./emailService");

/**
 * Sends the daily reminder email to every user who has notifications enabled.
 * There's only one fixed send time now (8:00 PM PH time / 12:00 UTC), baked
 * into the Vercel Cron schedule in vercel.json — so this no longer needs to
 * match against a list of saved times, just check the enabled flag.
 *
 * Called either:
 *  - by Vercel Cron hitting GET /api/cron/reminders once a day (production)
 *  - manually for testing via POST /api/notifications/test (instant, single user)
 */
async function runReminderCheck() {
  const userIds = await userStore.getAllUserIds();
  let sent = 0;

  for (const userId of userIds) {
    const user = await userStore.getUser(userId);
    if (!user || !user.refreshToken || !user.spreadsheetId) continue;

    try {
      const authClient = google.clientFromRefreshToken(user.refreshToken);
      const settings = await budgetService.getNotifSettings(authClient, user.spreadsheetId);
      if (settings.enabled) {
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

  return { checked: userIds.length, sent };
}

module.exports = { runReminderCheck };
