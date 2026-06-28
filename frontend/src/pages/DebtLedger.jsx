import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import Portal from "../components/Portal";
import SourceDropdown from "../components/SourceDropdown";
import CalendarModal, { formatDateLong } from "../components/CalendarModal";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PayablesIcon = () => (
  <svg width="64" height="52" viewBox="0 0 93 76" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="92" height="75" rx="20.5" fill="#0E1629" fillOpacity="0.8" />
    <rect x="0.5" y="0.5" width="92" height="75" rx="20.5" stroke="#17253E" />
    <path d="M59.25 34.5C64.3683 34.5 68.4692 30.3683 68.4692 25.25C68.4692 20.1317 64.3683 16 59.25 16C54.1317 16 50 20.1317 50 25.25C50 30.3683 54.1317 34.5 59.25 34.5ZM34.5833 34.5C39.7017 34.5 43.8025 30.3683 43.8025 25.25C43.8025 20.1317 39.7017 16 34.5833 16C29.465 16 25.3333 20.1317 25.3333 25.25C25.3333 30.3683 29.465 34.5 34.5833 34.5ZM34.5833 40.6667C27.3992 40.6667 13 44.2742 13 51.4583V56.0833C13 57.7792 14.3875 59.1667 16.0833 59.1667H53.0833C54.7792 59.1667 56.1667 57.7792 56.1667 56.0833V51.4583C56.1667 44.2742 41.7675 40.6667 34.5833 40.6667ZM59.25 40.6667C58.3558 40.6667 57.3383 40.7283 56.2592 40.8208C56.3208 40.8517 56.3517 40.9133 56.3825 40.9442C59.8975 43.5033 62.3333 46.9258 62.3333 51.4583V56.0833C62.3333 57.1625 62.1175 58.2108 61.7783 59.1667H77.75C79.4458 59.1667 80.8333 57.7792 80.8333 56.0833V51.4583C80.8333 44.2742 66.4342 40.6667 59.25 40.6667Z" fill="#91A9FC" />
  </svg>
);

const ReceivablesIcon = () => (
  <svg width="64" height="52" viewBox="0 0 93 76" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="92" height="75" rx="20.5" fill="#0E1629" fillOpacity="0.8" />
    <rect x="0.5" y="0.5" width="92" height="75" rx="20.5" stroke="#17253E" />
    <path fillRule="evenodd" clipRule="evenodd" d="M27.0435 24.32V27.2H24.2261C23.1053 27.2 22.0303 27.6551 21.2378 28.4653C20.4452 29.2755 20 30.3743 20 31.52V51.68C20 52.8257 20.4452 53.9245 21.2378 54.7347C22.0303 55.5449 23.1053 56 24.2261 56H62.7304C63.2854 56 63.835 55.8883 64.3477 55.6712C64.8604 55.4541 65.3263 55.1358 65.7187 54.7347C66.1112 54.3336 66.4224 53.8573 66.6348 53.3332C66.8472 52.8091 66.9565 52.2473 66.9565 51.68V48.8H69.7739C72.103 48.8 74 46.8608 74 44.48V24.32C74 21.9392 72.103 20 69.7739 20H31.2696C28.9405 20 27.0435 21.9392 27.0435 24.32ZM31.7391 24.8V27.2H62.7304C63.2854 27.2 63.835 27.3117 64.3477 27.5288C64.8604 27.7459 65.3263 28.0641 65.7187 28.4653C66.1112 28.8664 66.4224 29.3427 66.6348 29.8668C66.8472 30.3909 66.9565 30.9527 66.9565 31.52V44H69.3043V24.8H31.7391ZM38.7826 41.6C38.7826 40.327 39.2773 39.1061 40.1579 38.2059C41.0385 37.3057 42.2329 36.8 43.4783 36.8C44.7236 36.8 45.918 37.3057 46.7986 38.2059C47.6792 39.1061 48.1739 40.327 48.1739 41.6C48.1739 42.873 47.6792 44.0939 46.7986 44.9941C45.918 45.8943 44.7236 46.4 43.4783 46.4C42.2329 46.4 41.0385 45.8943 40.1579 44.9941C39.2773 44.0939 38.7826 42.873 38.7826 41.6Z" fill="#91A9FC" />
  </svg>
);

export default function DebtLedger({ hidden }) {
  const showToast = useToast();

  const [ledgerType, setLedgerType] = useState("Payables");
  const [totals, setTotals] = useState({ payables: 0, receivables: 0 });
  const [sources, setSources] = useState([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [dateStart, setDateStart] = useState(todayStr());
  const [dateDue, setDateDue] = useState(todayStr());
  const [calendarTarget, setCalendarTarget] = useState(null); // "start" | "due" | null

  const [showDirectory, setShowDirectory] = useState(false);
  const [directoryType, setDirectoryType] = useState("Payables");
  const [records, setRecords] = useState([]);

  const [actionRecord, setActionRecord] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentSource, setPaymentSource] = useState("");

  function fmt(n) {
    return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  function display(n) {
    return hidden ? "••••" : fmt(n);
  }

  async function loadTotals() {
    try {
      const [tot, src] = await Promise.all([api.getDebtTotals(), api.getSources()]);
      setTotals(tot);
      setSources(src);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  useEffect(() => {
    loadTotals();
  }, []);

  async function openDirectory(type) {
    setDirectoryType(type);
    try {
      const recs = await api.getDebtDirectory(type);
      setRecords(recs);
      setShowDirectory(true);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function handleAddDebt() {
    if (!name || !amount) {
      showToast("Please fill in name and amount.", "error");
      return;
    }
    try {
      await api.addDebtRecord(ledgerType, { name, amount: Number(amount) || 0, description: desc, dateStart, dateDue });
      showToast("Record added!");
      setName(""); setAmount(""); setDesc("");
      loadTotals();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function openAction(record) {
    setActionRecord(record);
    setPaymentAmount("");
    setPaymentSource(sources[0]?.name || "");
  }

  async function handlePay() {
    if (!actionRecord) return;
    try {
      await api.payDebt({
        id: actionRecord.id,
        paymentAmount: Number(paymentAmount) || 0,
        sourceName: paymentSource,
        ledgerType: directoryType,
      });
      showToast("Payment recorded!");
      setActionRecord(null);
      const recs = await api.getDebtDirectory(directoryType);
      setRecords(recs);
      loadTotals();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function handleDelete() {
    if (!actionRecord) return;
    try {
      await api.deleteDebt(actionRecord.id);
      showToast("Record deleted!");
      setActionRecord(null);
      const recs = await api.getDebtDirectory(directoryType);
      setRecords(recs);
      loadTotals();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  return (
    <>
      <div className="summary-grid">
        <div className="summary-card" onClick={() => openDirectory("Payables")}>
          <PayablesIcon />
          <div>
            <div className="card-label">Payables</div>
            <div className="card-value">{display(totals.payables)}</div>
          </div>
        </div>
        <div className="summary-card" onClick={() => openDirectory("Receivables")}>
          <ReceivablesIcon />
          <div>
            <div className="card-label">Receivables</div>
            <div className="card-value">{display(totals.receivables)}</div>
          </div>
        </div>
      </div>

      <div className="input-panel">
        <div className="timeframe-wrapper">
          <button className={`time-btn${ledgerType === "Payables" ? " active" : ""}`} onClick={() => setLedgerType("Payables")}>
            Payables
          </button>
          <button className={`time-btn${ledgerType === "Receivables" ? " active" : ""}`} onClick={() => setLedgerType("Receivables")}>
            Receivables
          </button>
        </div>

        <div className="form-fields-box">
          <div className="form-row">
            <div className="form-label">{ledgerType === "Payables" ? "Creditor Name" : "Debtor Name"}</div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-label">Amount</div>
            <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-label">Description</div>
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
        </div>

        <div className="action-btn-group" style={{ width: "100%", maxWidth: 581, marginTop: 10 }}>
          <button className="submit-action-btn date-btn" type="button" onClick={() => setCalendarTarget("start")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="18" y2="10"></line>
            </svg>
            <div className="date-btn-content">
              <small>Date Borrowed</small>
              <span>{formatDateLong(dateStart)}</span>
            </div>
          </button>
          <button className="submit-action-btn date-btn" type="button" onClick={() => setCalendarTarget("due")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="18" y2="10"></line>
            </svg>
            <div className="date-btn-content">
              <small>Date Due</small>
              <span>{formatDateLong(dateDue)}</span>
            </div>
          </button>
        </div>
        <button className="submit-action-btn add-debt-btn" onClick={handleAddDebt} style={{ width: "100%", maxWidth: 581, marginTop: 10 }}>
          Add item
        </button>
      </div>

      <CalendarModal
        open={calendarTarget === "start"}
        value={dateStart}
        onApply={(d) => { setDateStart(d); setCalendarTarget(null); }}
        onClose={() => setCalendarTarget(null)}
      />
      <CalendarModal
        open={calendarTarget === "due"}
        value={dateDue}
        onApply={(d) => { setDateDue(d); setCalendarTarget(null); }}
        onClose={() => setCalendarTarget(null)}
      />

      {showDirectory && (
        <Portal>
          <div className="modal-overlay open">
            <div className="modal-box" style={{ maxWidth: 450 }}>
              <div className="modal-header-row">
                <h3 className="modal-title" style={{ margin: 0 }}>{directoryType}</h3>
                <button className="modal-close-btn" onClick={() => setShowDirectory(false)}>✕</button>
              </div>
              <div className="directory-list">
                {records.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No outstanding {directoryType.toLowerCase()}.</p>
                )}
                {records.map((r) => (
                  <div className="directory-item" key={r.id} onClick={() => openAction(r)}>
                    <span>{r.name} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>(due {r.dueDate})</span></span>
                    <span>{display(r.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {actionRecord && (
        <Portal>
          <div className="modal-overlay open">
            <div className="modal-box settle-modal-card">
              <h3 className="settle-modal-title">Settle: {actionRecord.name}</h3>
              <p className="settle-modal-subtitle">Current Balance: {fmt(actionRecord.balance)}</p>

              <div className="modal-input-capsule">
                <div className="modal-capsule-label">Amount Paid</div>
                <div className="modal-capsule-field">
                  <input type="number" placeholder="0.00" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </div>
              </div>

              <div className="modal-input-capsule" style={{ position: "relative", overflow: "visible" }}>
                <div className="modal-capsule-label">Source of Fund</div>
                <SourceDropdown options={sources} value={paymentSource} onChange={setPaymentSource} />
              </div>

              <div className="settle-modal-footer">
                <button className="settle-btn btn-delete" onClick={handleDelete}>Delete</button>
                <button className="settle-btn btn-cancel" onClick={() => setActionRecord(null)}>Cancel</button>
                <button className="settle-btn btn-update" onClick={handlePay}>Update</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
