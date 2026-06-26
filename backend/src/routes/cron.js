const express = require("express");
const reminderScheduler = require("../services/reminderScheduler");

const router = express.Router();

/**
 * GET /api/cron/reminders
 * Vercel Cron hits this on a schedule (see vercel.json "crons").
 * Protected with CRON_SECRET so randoms can't trigger it / spam emails.
 *
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on requests
 * it triggers itself, IF you've set a CRON_SECRET env var on the project -
 * see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
router.get("/reminders", async (req, res) => {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const result = await reminderScheduler.runReminderCheck();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

module.exports = router;
