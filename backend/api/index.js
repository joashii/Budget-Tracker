// Vercel auto-detects any file under /api as a serverless function.
// This one file handles everything (/auth/*, /api/*) - see vercel.json
// for the rewrites that route all incoming paths here.
const app = require("../src/app");

module.exports = app;
