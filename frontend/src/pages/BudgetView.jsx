import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import Portal from "../components/Portal";
import { useToast } from "../components/Toast";
import SourceDropdown from "../components/SourceDropdown";
import CalendarModal, { formatDateShort } from "../components/CalendarModal";

const TIMEFRAMES = ["Today", "Weekly", "Monthly", "Yearly"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BudgetView({ hidden, onToggleHidden, weeklyBudget, onEditWeeklyBudget, wbRefreshKey }) {
  const showToast = useToast();

  // --- balance panel state ---
  const [balance, setBalance] = useState(0);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- weekly budget summary state ---
  const [wbSummary, setWbSummary] = useState({ items: [], totalSpend: 0 });

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");

  const [showTxModal, setShowTxModal] = useState(false);
  const [isCashTransfer, setIsCashTransfer] = useState(false);
  const [txType, setTxType] = useState("deposit");
  const [txSource, setTxSource] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");

  // --- entry form state ---
  const [timeframe, setTimeframe] = useState("Today");
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [spendings, setSpendings] = useState("");
  const [budget, setBudget] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showCalendar, setShowCalendar] = useState(false);

  function fmt(n) {
    return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([api.getBalance(), api.getSources()]);
      setBalance(b.balance);
      setSources(s);
      if (!sourceName && s.length) setSourceName(s[0].name);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [wbRefreshKey]);

  useEffect(() => {
    api.getWeeklyBudgetSummary()
      .then(setWbSummary)
      .catch(() => setWbSummary({ items: [], totalSpend: 0 }));
  }, [wbRefreshKey]);

  async function handleSaveBalance() {
    const n = Number(balanceInput);
    if (Number.isNaN(n)) return;
    try {
      await api.saveBalance(n);
      setShowBalanceModal(false);
      showToast("Balance updated!");
      loadAll();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function openTx(type) {
    setTxType(type);
    setTxSource(sources[0]?.name || "");
    setTxAmount("");
    setTxDesc("");
    setIsCashTransfer(false);
    setShowTxModal(true);
  }

  async function handleConfirmNewSource() {
    const name = newSourceName.trim();
    if (!name) {
      showToast("Please enter a name for the fund source.", "error");
      return;
    }
    try {
      const response = await api.createSource(name);
      if (response === "Created" || response === "Exists") {
        showToast(`${name} added successfully!`);
        setShowAddSource(false);
        setNewSourceName("");
        loadAll();
      } else {
        showToast("Failed to create tab.", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function handleSubmitTx() {
    try {
      await api.postTransaction({
        sourceName: txSource,
        actionType: txType,
        amount: Number(txAmount) || 0,
        date: todayStr(),
        description: txDesc,
        isCashTransfer,
      });
      setShowTxModal(false);
      showToast("Transaction recorded!");
      loadAll();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function handleSubmitItem() {
    if (!category || !itemName || !spendings) {
      showToast("Please fill in category, item name, and spendings.", "error");
      return;
    }
    try {
      await api.addItem({
        timeframe,
        date: selectedDate,
        category,
        itemName,
        spendings: Number(spendings) || 0,
        budget: Number(budget) || 0,
        sourceName,
      });
      showToast("Item added!");
      setCategory("");
      setItemName("");
      setSpendings("");
      setBudget("");
      loadAll();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  if (loading) return <div className="input-panel" style={{ color: "rgba(255,255,255,0.35)" }}>Loading...</div>;

  return (
    <>
      <div className="balance-panel">
        <div className="balance-panel-top">
          <div className="balance-meta">
            <div className="balance-label">Current balance</div>
            <div className="balance-amount-row">
              <div
                className={`balance-amount${hidden ? " amount-masked" : ""}`}
                onClick={() => {
                  setBalanceInput(String(balance));
                  setShowBalanceModal(true);
                }}
              >
                {hidden ? "••••••••" : fmt(balance)}
              </div>
              <button className="balance-toggle-btn" onClick={onToggleHidden} title="Show / hide balance">
                {hidden ? (
                  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="action-btn-group">
            <button className="action-btn" onClick={() => openTx("withdraw")}>Withdraw</button>
            <button className="action-btn" onClick={() => openTx("deposit")}>Deposit</button>
          </div>
        </div>

        <div className="balance-sources-section">
          <div className="balance-sources-label">Sources of Funds</div>
          {sources.map((s) => (
            <div className="balance-source-row" key={s.name}>
              <span className="src-name">
                <span className={`src-dot${s.isCash ? " cash" : ""}`}></span>
                {s.name}
              </span>
              <span className={`src-val${s.isCash ? " cash" : ""}`}>{hidden ? "••••" : fmt(s.balance)}</span>
            </div>
          ))}
        </div>
      </div>

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
              <span className="wb-summary-money">{hidden ? "••••" : fmt(weeklyBudget.amount)}</span>
            </div>
            <div className="wb-summary-row">
              <span className="wb-summary-label">Spent so far</span>
              <span className="wb-summary-money">{hidden ? "••••" : fmt(wbSummary.totalSpend)}</span>
            </div>
            <div className="wb-summary-row">
              <span className="wb-summary-label">Remaining</span>
              <span className={weeklyBudget.amount - wbSummary.totalSpend >= 0 ? "wb-remaining-positive" : "wb-remaining-negative"}>
                {hidden ? "••••" : fmt(weeklyBudget.amount - wbSummary.totalSpend)}
              </span>
            </div>
            {wbSummary.items.length > 0 && (
              <p className="notif-desc" style={{ marginTop: 10 }}>
                {wbSummary.items.length} item{wbSummary.items.length === 1 ? "" : "s"} logged this week
                {weeklyBudget.source
                  ? ` · funded from ${weeklyBudget.source}`
                  : weeklyBudget.description
                  ? ` · ${weeklyBudget.description}`
                  : ""}
              </p>
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

      <div className="input-panel">
        <div className="timeframe-wrapper">
          {TIMEFRAMES.map((t) => (
            <button key={t} className={`time-btn${timeframe === t ? " active" : ""}`} onClick={() => setTimeframe(t)}>
              {t}
            </button>
          ))}
        </div>

        <div className="form-fields-box">
          <div className="form-row">
            <div className="form-label">Category</div>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-label">Item Name</div>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-label">Spendings</div>
            <input type="number" placeholder="0.00" value={spendings} onChange={(e) => setSpendings(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-label">Budget</div>
            <input type="number" placeholder="0.00" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="form-row" style={{ position: "relative", overflow: "visible" }}>
            <div className="form-label">Source</div>
            <SourceDropdown options={sources} value={sourceName} onChange={setSourceName} />
          </div>
        </div>

        <div className="action-btn-group" style={{ width: "100%", maxWidth: 581, marginTop: 10 }}>
          <button className="submit-action-btn date-btn" type="button" onClick={() => setShowCalendar(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="18" y2="10"></line>
            </svg>
            <span>Date: {formatDateShort(selectedDate)}</span>
          </button>
          <button className="submit-action-btn" onClick={handleSubmitItem}>Add item</button>
        </div>
      </div>

      <CalendarModal
        open={showCalendar}
        value={selectedDate}
        onApply={(d) => {
          setSelectedDate(d);
          setShowCalendar(false);
        }}
        onClose={() => setShowCalendar(false)}
      />

      {showBalanceModal && (
        <Portal>
          <div className="modal-overlay open">
            <div className="settle-modal-card">
              <h2 className="settle-modal-title">Manage Balance</h2>
              <p className="settle-modal-subtitle">Update your total balance directly.</p>

              <div className="modal-input-capsule">
                <div className="modal-capsule-label">Total Balance</div>
                <div className="modal-capsule-field">
                  <input type="number" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} placeholder="0.00" autoFocus />
                </div>
              </div>

              <div className="sources-section-header">
                <h3 className="sources-section-title">Sources of Funds</h3>
              </div>

              <div className="sources-list">
                {sources.length === 0 ? (
                  <div className="list-placeholder">No sources found.</div>
                ) : (
                  sources.map((s) => (
                    <div className="source-item" key={s.name}>
                      <span className="source-name">{s.name}</span>
                      <span className="source-amount">{fmt(s.balance)}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                {!showAddSource ? (
                  <button className="add-source-btn" onClick={() => setShowAddSource(true)}>
                    + Add Source of Fund
                  </button>
                ) : (
                  <div id="sourceInputWrapper" style={{ display: "flex" }}>
                    <input
                      type="text"
                      placeholder="e.g., GCash, PayPal"
                      value={newSourceName}
                      onChange={(e) => setNewSourceName(e.target.value)}
                      autoFocus
                    />
                    <button className="src-save-btn" onClick={handleConfirmNewSource}>Save</button>
                    <button
                      className="src-cancel-btn"
                      onClick={() => {
                        setShowAddSource(false);
                        setNewSourceName("");
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="settle-modal-footer settle-modal-footer-spaced">
                <button
                  className="settle-btn btn-cancel"
                  onClick={() => {
                    setShowBalanceModal(false);
                    setShowAddSource(false);
                    setNewSourceName("");
                  }}
                >
                  Cancel
                </button>
                <button className="settle-btn btn-update" onClick={handleSaveBalance}>Save Changes</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showTxModal && (
        <Portal>
          <div className="modal-overlay open">
            <div className="settle-modal-card">
              <h2 className="settle-modal-title">{txType === "deposit" ? "Record Deposit" : "Record Withdrawal"}</h2>

              <div className="modal-input-capsule" style={{ position: "relative", overflow: "visible" }}>
                <div className="modal-capsule-label">Source</div>
                <SourceDropdown options={sources} value={txSource} onChange={setTxSource} />
              </div>

              <div className="modal-input-capsule">
                <div className="modal-capsule-label">Amount (₱)</div>
                <div className="modal-capsule-field">
                  <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" autoFocus />
                </div>
              </div>

              <div className="modal-input-capsule">
                <div className="modal-capsule-label">Description</div>
                <div className="modal-capsule-field">
                  <input type="text" value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="optional" />
                </div>
              </div>

              {txSource !== "Cash on Hand" && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    margin: "4px 0 18px",
                    cursor: "pointer",
                    whiteSpace: "normal",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isCashTransfer}
                    onChange={(e) => setIsCashTransfer(e.target.checked)}
                    style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: "var(--text-blue)" }}
                  />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
                    This is a cash transfer — also {txType === "deposit" ? "subtract from" : "add to"} Cash on Hand
                  </span>
                </label>
              )}

              <div className="settle-modal-footer">
                <button className="settle-btn btn-cancel" onClick={() => setShowTxModal(false)}>Cancel</button>
                <button className="settle-btn btn-update" onClick={handleSubmitTx}>Save</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
