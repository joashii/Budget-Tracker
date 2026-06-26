const jwt = require("jsonwebtoken");

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const EXPIRY = "30d";

function signSession(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: EXPIRY });
}

function verifySession(token) {
  try {
    return jwt.verify(token, SECRET); // { userId, iat, exp }
  } catch {
    return null;
  }
}

module.exports = { signSession, verifySession };
