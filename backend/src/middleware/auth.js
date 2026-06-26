const userStore = require("../db/userStore");
const google = require("../config/google");
const { verifySession } = require("../utils/jwt");

const COOKIE_NAME = "session";

/** Requires a valid session cookie; attaches req.ctx = { userId, authClient, spreadsheetId, email } */
async function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = token && verifySession(token);
  if (!payload) return res.status(401).json({ error: "Not authenticated" });

  const user = await userStore.getUser(payload.userId);
  if (!user || !user.refreshToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const authClient = google.clientFromRefreshToken(user.refreshToken);
  req.ctx = { userId: payload.userId, authClient, spreadsheetId: user.spreadsheetId || null, email: user.email };
  next();
}

module.exports = { requireAuth, COOKIE_NAME };
