import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function HistoryView({ hidden, weeklyBudget, onEditWeeklyBudget, wbRefreshKey }) {
  const [rows, setRows] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [wbSummary, setWbSummary] = useState({ items: [], totalSpend: 0 });

  function fmt(n) {
    return `₱${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  function display(n) {
    return hidden ? "••••" : fmt(n);
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

  useEffect(() => {
    refreshHistoryTable();
  }, []);

  useEffect(() => {
    api.getWeeklyBudgetSummary()
      .then(setWbSummary)
      .catch(() => setWbSummary({ items: [], totalSpend: 0 }));
  }, [wbRefreshKey]);

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
                      <td className="htbl-spend">{display(spend)}</td>
                      <td className={`htbl-budget ${over ? "htbl-over" : "htbl-under"}`}>{display(budget)}</td>
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
            <span>{display(totalSpend)}</span>
            <span>{display(totalBudget)}</span>
          </div>
        )}
      </div>

      {/* Weekly Budget */}
      <div className="input-panel">
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
          <span
            style={{ fontSize: 12, color: "#91a9fc", cursor: "pointer" }}
            onClick={onEditWeeklyBudget}
          >
            {weeklyBudget && weeklyBudget.status === "set" ? "Edit" : "Set budget"}
          </span>
        </div>

        {weeklyBudget && weeklyBudget.status === "set" ? (
          <>
            <div className="wb-summary-row">
              <span className="wb-summary-label">Budget</span>
              <span className="wb-summary-money">{display(weeklyBudget.amount)}</span>
            </div>
            <div className="wb-summary-row">
              <span className="wb-summary-label">Spent so far</span>
              <span className="wb-summary-money">{display(wbSummary.totalSpend)}</span>
            </div>
            <div className="wb-summary-row">
              <span className="wb-summary-label">Remaining</span>
              <span className={weeklyBudget.amount - wbSummary.totalSpend >= 0 ? "wb-remaining-positive" : "wb-remaining-negative"}>
                {display(weeklyBudget.amount - wbSummary.totalSpend)}
              </span>
            </div>
            {weeklyBudget.source ? (
              <p className="notif-desc" style={{ marginTop: 10 }}>Funded from {weeklyBudget.source}</p>
            ) : weeklyBudget.description ? (
              <p className="notif-desc" style={{ marginTop: 10 }}>{weeklyBudget.description}</p>
            ) : null}

            {wbSummary.items.length > 0 ? (
              <div className="wb-items-list">
                {wbSummary.items.map((it, idx) => (
                  <div className="wb-summary-row" key={idx}>
                    <span className="wb-summary-label">{it.itemName || "(unnamed)"}</span>
                    <span className="wb-summary-money">{display(it.spendings)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="notif-desc" style={{ marginTop: 10 }}>No spending logged yet this week.</p>
            )}
          </>
        ) : (
          <p className="notif-desc">
            {weeklyBudget && weeklyBudget.status === "skipped"
              ? "You skipped setting a budget for this week."
              : "No weekly budget set yet."}
          </p>
        )}
      </div>
    </>
  );
}
