const app = require("./app");
const reminderScheduler = require("./services/reminderScheduler");

const PORT = process.env.PORT || 4000;

// Local dev only: polls for due reminders every minute.
// On Vercel, this is replaced by a scheduled Cron Job hitting /api/cron/reminders.
reminderScheduler.startLocalPolling();

app.listen(PORT, () => console.log(`Budget Tracker API listening on http://localhost:${PORT}`));
