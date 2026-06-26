import React, { useEffect, useState } from "react";
import { api, auth } from "../api/client";
import { useToast } from "../components/Toast";

export default function HistoryView({ userEmail }) {
  const showToast = useToast();

  const [rows, setRows] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);

  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [newTime, setNewTime] = useState("08:00");
  const [sheetUrl, setSheetUrl] = useState(null);

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
      setTimes(s.times || []);
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

  function addTime() {
    if (times.includes(newTime)) return;
    const next = [...times, newTime].sort();
    setTimes(next);
    save({ enabled, times: next, notifyEmail });
  }

  function removeTime(t) {
    const next = times.filter((x) => x !== t);
    setTimes(next);
    save({ enabled, times: next, notifyEmail });
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    save({ enabled: next, times, notifyEmail });
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
            Daily Reminder
          </div>
          <label className="notif-toggle-wrap" title="Enable daily spending reminder">
            <input type="checkbox" checked={enabled} onChange={toggleEnabled} />
            <span className="notif-toggle-slider"></span>
          </label>
        </div>

        {enabled && (
          <div className="notif-body" style={{ display: "flex" }}>
            <p className="notif-desc">Get an email nudge so you don't forget to log your spendings.</p>

            <div className="form-row">
              <div className="form-label">Email</div>
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                onBlur={() => save({ enabled, times, notifyEmail })}
              />
            </div>

            <div className="notif-times-list">
              {times.map((t) => (
                <span
                  key={t}
                  className="time-btn active"
                  style={{ width: "auto", padding: "6px 14px", cursor: "pointer" }}
                  onClick={() => removeTime(t)}
                  title="Click to remove"
                >
                  {t} ✕
                </span>
              ))}
            </div>

            <div className="action-btn-group" style={{ width: "100%", maxWidth: 581 }}>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "12px",
                  colorScheme: "dark",
                }}
              />
              <button className="submit-action-btn" onClick={addTime} style={{ flex: "none", width: "auto", padding: "12px 24px" }}>
                Add time
              </button>
            </div>
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
