// In local dev, Vite proxies /api and /auth to localhost:4000 (see vite.config.js),
// so VITE_API_URL can stay empty. On Vercel, set VITE_API_URL to your deployed
// backend's URL (e.g. https://budget-tracker-api.vercel.app) as a frontend env var.
const API_ROOT = import.meta.env.VITE_API_URL || "";

async function request(prefix, path, options = {}) {
  const res = await fetch(`${API_ROOT}${prefix}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send the session cookie cross-origin
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const auth = {
  loginUrl: `${API_ROOT}/auth/google`,
  me: () => request("/auth", "/me"),
  logout: () => request("/auth", "/logout", { method: "POST" }),
};

export const api = {
  getBalance: () => request("/api", "/balance"),
  saveBalance: (balance) => request("/api", "/balance", { method: "PUT", body: JSON.stringify({ balance }) }),

  getSources: () => request("/api", "/sources"),
  createSource: (sourceName) => request("/api", "/sources", { method: "POST", body: JSON.stringify({ sourceName }) }),
  postTransaction: (payload) => request("/api", "/sources/transaction", { method: "POST", body: JSON.stringify(payload) }),

  addItem: (payload) => request("/api", "/items", { method: "POST", body: JSON.stringify(payload) }),
  getTodaySpendings: () => request("/api", "/items/today"),

  getDebtTotals: () => request("/api", "/debts/totals"),
  getDebtDirectory: (type) => request("/api", `/debts/${type}`),
  addDebtRecord: (type, payload) => request("/api", `/debts/${type}`, { method: "POST", body: JSON.stringify(payload) }),
  payDebt: (payload) => request("/api", "/debts/payment", { method: "POST", body: JSON.stringify(payload) }),
  deleteDebt: (id) => request("/api", `/debts/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getNotifSettings: () => request("/api", "/notifications"),
  saveNotifSettings: (settings) => request("/api", "/notifications", { method: "PUT", body: JSON.stringify(settings) }),

  getSpreadsheetUrl: () => request("/api", "/spreadsheet-url"),
};
