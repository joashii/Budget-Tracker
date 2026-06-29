import React, { useEffect, useState } from "react";
import { api, auth } from "../api/client";
import { useToast } from "./Toast";
import Portal from "./Portal";

export default function SettingsModal({ open, onClose, userEmail, alwaysHide, onToggleAlwaysHide }) {
  const showToast = useToast();

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(null);

  const [wbEnabled, setWbEnabled] = useState(false);
  const [wbDay, setWbDay] = useState(1);

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    if (!open) return;
    api.getNotifSettings()
      .then((s) => {
        setNotifEnabled(!!s.enabled);
        setNotifyEmail(s.notifyEmail || userEmail || "");
      })
      .catch((e) => showToast(e.message, "error"));
    api.getSpreadsheetUrl()
      .then(({ url }) => setSheetUrl(url))
      .catch(() => {});
    api.getWeeklyBudgetSettings()
      .then((s) => {
        setWbEnabled(!!s.enabled);
        setWbDay(s.dayOfWeek);
      })
      .catch((e) => showToast(e.message, "error"));
  }, [open]);

  if (!open) return null;

  function saveWeeklyBudgetSettings(next) {
    api.saveWeeklyBudgetSettings(next).catch((e) => showToast(e.message, "error"));
  }

  function toggleWbEnabled() {
    const next = !wbEnabled;
    setWbEnabled(next);
    saveWeeklyBudgetSettings({ enabled: next, dayOfWeek: wbDay });
  }

  function pickWbDay(d) {
    setWbDay(d);
    saveWeeklyBudgetSettings({ enabled: wbEnabled, dayOfWeek: d });
  }

  function saveNotif(next) {
    api.saveNotifSettings(next).catch((e) => showToast(e.message, "error"));
  }

  function toggleNotifEnabled() {
    const next = !notifEnabled;
    setNotifEnabled(next);
    saveNotif({ enabled: next, notifyEmail });
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

  return (
    <Portal>
      <div className="modal-overlay open" onClick={onClose}>
        <div className="settle-modal-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
          <h2 className="settle-modal-title">Settings</h2>

          {/* Hide Money */}
          <div className="settings-section">
            <div className="history-header-row">
              <div className="history-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                Hide Money
              </div>
              <label className="notif-toggle-wrap" title="Always hide amounts on open">
                <input type="checkbox" checked={alwaysHide} onChange={onToggleAlwaysHide} />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>
            <p className="notif-desc">
              {alwaysHide
                ? "Amounts will always start masked (••••) every time you open the app."
                : "Amounts will remember whatever show/hide state you left them in last time."}
            </p>
          </div>

          {/* Weekly Budget */}
          <div className="settings-section">
            <div className="history-header-row">
              <div className="history-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Weekly Budget
              </div>
              <label className="notif-toggle-wrap" title="Enable the weekly budget popup">
                <input type="checkbox" checked={wbEnabled} onChange={toggleWbEnabled} />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>

            {wbEnabled && (
              <div className="notif-body" style={{ display: "flex" }}>
                <p className="notif-desc">
                  On your chosen day, after 8:00 AM, you'll be asked to set this week's budget if you haven't yet.
                </p>
                <div className="weekday-picker">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      className={`weekday-btn${wbDay === idx ? " active" : ""}`}
                      onClick={() => pickWbDay(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Reminder */}
          <div className="settings-section">
            <div className="history-header-row">
              <div className="history-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                Daily Reminder <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>(Coming soon)</span>
              </div>
              <label className="notif-toggle-wrap" title="Enable daily spending reminder">
                <input type="checkbox" checked={notifEnabled} onChange={toggleNotifEnabled} />
                <span className="notif-toggle-slider"></span>
              </label>
            </div>

            {notifEnabled && (
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
                    onBlur={() => saveNotif({ enabled: notifEnabled, notifyEmail })}
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
          <div className="settings-section">
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

          <div className="settle-modal-footer">
            <button className="action-btn" style={{ width: "100%" }} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
