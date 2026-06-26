const { google } = require("googleapis");
require("dotenv").config();

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

/**
 * Multi-user OAuth2. Each human signs in with their own Google account;
 * we get a refresh_token for them and use it to read/write THEIR Drive/Sheets.
 * This replaces the old single service-account setup.
 *
 * Setup (Google Cloud Console):
 * 1. APIs & Services -> Credentials -> Create Credentials -> OAuth client ID -> "Web application"
 * 2. Authorized redirect URI: http://localhost:4000/auth/google/callback (add your prod URL too)
 * 3. Put the Client ID/Secret in backend/.env as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * 4. OAuth consent screen: add the Sheets/Drive scopes above, add yourself as a test user
 *    while the app is unverified.
 */
function newOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/auth/google/callback"
  );
}

function getAuthUrl() {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // ensures we get a refresh_token
    prompt: "consent",      // ensures we get a refresh_token even on repeat logins
    scope: SCOPES,
  });
}

async function exchangeCodeForTokens(code) {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  return { tokens, profile }; // tokens.refresh_token, tokens.access_token, profile.email/id
}

/** Builds an authenticated OAuth2 client from a stored refresh token. */
function clientFromRefreshToken(refreshToken) {
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function sheetsFor(authClient) {
  return google.sheets({ version: "v4", auth: authClient });
}

function driveFor(authClient) {
  return google.drive({ version: "v3", auth: authClient });
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  clientFromRefreshToken,
  sheetsFor,
  driveFor,
};
