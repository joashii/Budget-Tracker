import React, { useEffect, useState } from "react";
import { api, auth } from "../api/client";
import { useToast } from "../components/Toast";

export default function HistoryView({ userEmail }) {
  const showToast = useToast();

  const [rows, setRows] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);

  const [enabled, setEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [sheetUrl, setSheetUrl] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);

  function fmt(n) {
    return `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  async function refreshHistoryTable() {
    setLoadingTable(true);
    try {
      const data = await api.getTodaySpendings();
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoadingTable(false);
    }
  }

  async function loadNotif() {
    try {
      const s = await api.getNotifSettings();
      setEnabled(!!s.enabled);
      setNotifyEmail(s.notifyEmail || userEmail || "");
      const { url } = await api.getSpreadsheetUrl();
      setSheetUrl(url);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  useEffect(() => {
    refreshHistoryTable();
    loadNotif();
  }, []);

  function save(next) {
    api.saveNotifSettings(next).catch((e) => showToast(e.message, "error"));
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    save({ enabled: next, notifyEmail });
  }

  async function sendTest() {
    setSendingTest(true);
    try {
      const res = await api.sendTestNotification();
      showToast(`Test email sent to ${res.sentTo}`, "success");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSendingTest(false);
    }
  }

  const sortedRows = rows ? [...rows].sort((a, b) => (Number(b.spendings) || 0) - (Number(a.spendings) || 0)) : [];
  const totalSpend = sortedRows.reduce((t, r) => t + (Number(r.spendings) || 0), 0);
  const totalBudget = sortedRows.reduce((t, r) => t + (Number(r.budget) || 0), 0);

  return (
    <>
      {/* Today's Spending Table */}
      <div className="input-panel history-panel">
        <div className="history-header-row">
          <div className="history-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Today's Spendings
          </div>
          <button className="history-refresh-btn" onClick={refreshHistoryTable} title="Refresh">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
        </div>

        <div className="history-table-wrap">
          {loadingTable ? (
            <div className="history-loading">Loading...</div>
          ) : sortedRows.length === 0 ? (
            <div className="history-loading">No spendings recorded today.</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th className="htbl-rank">#</th>
                  <th>Item Name</th>
                  <th>Spendings</th>
                  <th>Budget</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => {
                  const spend = Number(row.spendings) || 0;
                  const budget = Number(row.budget) || 0;
                  const over = budget > 0 && spend > budget;
                  return (
                    <tr key={i}>
                      <td className="htbl-rank">{i + 1}</td>
                      <td className="htbl-name">{row.itemName || "—"}</td>
                      <td className="htbl-spend">{fmt(spend)}</td>
                      <td className={`htbl-budget ${over ? "htbl-over" : "htbl-under"}`}>{fmt(budget)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {sortedRows.length > 0 && (
          <div className="history-totals-row">
            <span>Total</span>
            <span>{fmt(totalSpend)}</span>
            <span>{fmt(totalBudget)}</span>
          </div>
        )}
      </div>

      {/* Notification Settings Panel */}
      <div className="input-panel notif-panel">
        <div className="history-header-row">
          <div className="history-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            Daily Reminder <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>(Coming soon)</span>
          </div>
          <label className="notif-toggle-wrap" title="Enable daily spending reminder">
            <input type="checkbox" checked={enabled} onChange={toggleEnabled} />
            <span className="notif-toggle-slider"></span>
          </label>
        </div>

        {enabled && (
          <div className="notif-body" style={{ display: "flex" }}>
            <p className="notif-desc">
              You'll get one email nudge every day at 8:00 AM to remind you to log your spendings.
            </p>

            <div className="form-row">
              <div className="form-label">Email</div>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                onBlur={() => save({ enabled, notifyEmail })}
              />
            </div>

            <button
              className="submit-action-btn"
              onClick={sendTest}
              disabled={sendingTest}
              style={{ width: "100%" }}
            >
              {sendingTest ? "Sending..." : "Send test email now"}
            </button>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="input-panel">
        <div className="history-header-row" style={{ marginBottom: sheetUrl ? 14 : 0 }}>
          <div className="history-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {userEmail}
          </div>
          <span
            style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
            onClick={async () => {
              await auth.logout();
              window.location.reload();
            }}
          >
            Sign out
          </span>
        </div>
        {sheetUrl && (
          <a href={sheetUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", width: "100%" }}>
            <button className="action-btn" style={{ width: "100%" }}>Open Google Sheet ↗</button>
          </a>
        )}
      </div>
    </>
  );
}
