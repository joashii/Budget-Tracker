const fs = require("fs");
const path = require("path");

/**
 * User store with two backends:
 *  - Vercel KV (Redis-compatible), used automatically when KV_REST_API_URL is set
 *    (i.e. when deployed on Vercel with a KV store attached to the project)
 *  - A local JSON file, used for local `npm run dev` (no KV env vars needed)
 *
 * Interface other files depend on: getUser(id) / upsertUser(id, fields).
 * Swap to a real Postgres/Mongo table later by reimplementing just these two.
 */

const USING_KV = !!process.env.KV_REST_API_URL;

let kv = null;
if (USING_KV) {
  // Lazy require so local dev doesn't need @vercel/kv installed/configured.
  kv = require("@vercel/kv").kv;
}

const DB_PATH = path.join(__dirname, "users.json");

function readAllLocal() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeAllLocal(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function getUser(userId) {
  if (USING_KV) {
    const user = await kv.get(`user:${userId}`);
    return user || null;
  }
  const all = readAllLocal();
  return all[userId] || null;
}

async function upsertUser(userId, fields) {
  if (USING_KV) {
    const existing = (await kv.get(`user:${userId}`)) || {};
    const next = { ...existing, ...fields, id: userId };
    await kv.set(`user:${userId}`, next);
    // Maintain an index of all user ids so the reminder cron can iterate them.
    await kv.sadd("user-ids", userId);
    return next;
  }
  const all = readAllLocal();
  all[userId] = { ...(all[userId] || {}), ...fields, id: userId };
  writeAllLocal(all);
  return all[userId];
}

/** Used by the reminder cron to check every user's notification settings. */
async function getAllUserIds() {
  if (USING_KV) {
    return await kv.smembers("user-ids");
  }
  return Object.keys(readAllLocal());
}

module.exports = { getUser, upsertUser, getAllUserIds, USING_KV };
