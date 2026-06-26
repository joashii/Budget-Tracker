const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendSpendingReminderEmail(toEmail) {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const html = `
  <div style="margin:0;padding:0;background:#060913;">
    <div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;background:#060913;color:#e8eaf6;max-width:520px;margin:0 auto;padding:40px 24px;">
      <div style="margin-bottom:32px;">
        <p style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#91A9FC;margin:0 0 6px 0;">Budget Tracker</p>
        <div style="height:1px;background:linear-gradient(90deg,#3E527F 0%,transparent 100%);"></div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(20,26,46,0.9) 0%,rgba(14,22,41,0.9) 100%);border:1px solid #3E527F;border-radius:16px;padding:32px;margin-bottom:24px;">
        <h1 style="font-size:22px;font-weight:600;color:#ffffff;margin:0 0 10px 0;">Time to log your spendings!</h1>
        <p style="font-size:15px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 28px 0;">
          This is your daily reminder to record what you've spent today. Staying on top of your budget only takes a minute.
        </p>
        <a href="${appUrl}" style="display:inline-block;background:rgba(145,169,252,0.18);border:1px solid #91A9FC;color:#91A9FC;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:600;">Open Budget Tracker &rarr;</a>
      </div>
      <p style="font-size:12px;color:rgba(145,169,252,0.8);">Sent on ${today} &bull; ${timeStr}</p>
    </div>
  </div>`;

  await getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to: toEmail,
    subject: "📋 Don't forget to log your spendings today",
    html,
  });
}

module.exports = { sendSpendingReminderEmail };
