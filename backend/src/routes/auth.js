const express = require("express");
const google = require("../config/google");
const userStore = require("../db/userStore");
const budgetService = require("../services/budgetService");
const { signSession } = require("../utils/jwt");
const { COOKIE_NAME } = require("../middleware/auth");

const router = express.Router();
const FRONTEND_URL = process.env.APP_URL || "http://localhost:5173";

// Deployed on Vercel (or any https host) -> cookie must be Secure + SameSite=None
// so it survives the cross-origin frontend<->backend request. Locally over http,
// browsers reject Secure cookies, so we fall back to Lax + non-secure.
const IS_PROD = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
const COOKIE_OPTS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: "/",
};

router.get("/google", (req, res) => {
  res.redirect(google.getAuthUrl());
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens, profile } = await google.exchangeCodeForTokens(code);

    const userId = profile.id;
    const existing = await userStore.getUser(userId);

    const refreshToken = tokens.refresh_token || (existing && existing.refreshToken);
    if (!refreshToken) {
      throw new Error(
        "No refresh token received. Remove app access at myaccount.google.com/permissions and try again."
      );
    }

    await userStore.upsertUser(userId, { email: profile.email, name: profile.name, refreshToken });

    const authClient = google.clientFromRefreshToken(refreshToken);
    const spreadsheetId = await budgetService.ensureUserSpreadsheet(authClient, userId);
    await userStore.upsertUser(userId, { spreadsheetId });

    const token = signSession(userId);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect(`${FRONTEND_URL}?authError=${encodeURIComponent(err.message)}`);
  }
});

router.get("/me", async (req, res) => {
  const { verifySession } = require("../utils/jwt");
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = token && verifySession(token);
  if (!payload) return res.status(401).json({ error: "Not authenticated" });

  const user = await userStore.getUser(payload.userId);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ email: user.email, name: user.name });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: undefined });
  res.json({ ok: true });
});

module.exports = router;
