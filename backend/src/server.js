const app = require("./app");

const PORT = process.env.PORT || 4000;

// Reminders are now sent by Vercel Cron hitting /api/cron/reminders once a
// day (see vercel.json), or instantly via POST /api/notifications/test.

app.listen(PORT, () => console.log(`Budget Tracker API listening on http://localhost:${PORT}`));
