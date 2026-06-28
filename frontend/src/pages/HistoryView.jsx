import React, { useEffect, useState } from "react";
import { api } from "../api/client";

export default function HistoryView({ hidden }) {
  const [rows, setRows] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);

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

    </>
  );
}
