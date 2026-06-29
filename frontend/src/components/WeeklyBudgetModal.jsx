import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "./Toast";
import Portal from "./Portal";
import SourceDropdown from "./SourceDropdown";

/**
 * Handles both:
 *  - The automatic popup ("Set your weekly budget?") shown once per week
 *    on the user's chosen day, when status is still "unset".
 *  - The manual "Edit" trigger from the Weekly Budget summary panel, which
 *    can re-open this same form even after the week's budget was already set.
 *
 * allowSkip is only true for the first case - skipping doesn't make sense
 * once a budget has already been set/edited for the week.
 */
export default function WeeklyBudgetModal({ open, onClose, weeklyBudget, sources, onSaved }) {
  const showToast = useToast();

  const [amount, setAmount] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const allowSkip = !weeklyBudget || weeklyBudget.status === "unset";
  const fundingSources = sources.filter((s) => !s.isCash);

  useEffect(() => {
    if (!open) return;
    if (weeklyBudget && weeklyBudget.status === "set") {
      setAmount(String(weeklyBudget.amount || ""));
      if (weeklyBudget.source) {
        setUseManual(false);
        setSource(weeklyBudget.source);
        setDescription("");
      } else {
        setUseManual(true);
        setSource("");
        setDescription(weeklyBudget.description || "");
      }
    } else {
      setAmount("");
      setUseManual(false);
      setSource(fundingSources[0]?.name || "");
      setDescription("");
    }
  }, [open, weeklyBudget]);

  if (!open) return null;

  async function handleSave() {
    const num = Number(amount);
    if (!num || num <= 0) {
      showToast("Enter an amount greater than 0.", "error");
      return;
    }
    if (useManual && !description.trim()) {
      showToast("Please describe where this money came from.", "error");
      return;
    }
    if (!useManual && !source) {
      showToast("Please choose a source, or switch to manual entry.", "error");
      return;
    }

    setSaving(true);
    try {
      await api.saveWeeklyBudget({
        amount: num,
        source: useManual ? "" : source,
        description: useManual ? description.trim() : "",
      });
      showToast("Weekly budget saved.", "success");
      onSaved();
      onClose();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await api.skipWeeklyBudget();
      onSaved();
      onClose();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <div className="modal-overlay open" onClick={allowSkip ? undefined : onClose}>
        <div className="settle-modal-card" onClick={(e) => e.stopPropagation()}>
          <h2 className="settle-modal-title">
            {allowSkip ? "Set your weekly budget?" : "Edit weekly budget"}
          </h2>
          <p className="notif-desc" style={{ marginBottom: 18 }}>
            This becomes your Cash on Hand for the week. You can skip this and decide later, and it's always editable afterward.
          </p>

          <div className="form-row">
            <div className="form-label">Amount</div>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="wb-source-toggle">
            <button
              type="button"
              className={`wb-toggle-pill${!useManual ? " active" : ""}`}
              onClick={() => {
                setUseManual(false);
                if (!source && fundingSources.length > 0) setSource(fundingSources[0].name);
              }}
            >
              From an account
            </button>
            <button
              type="button"
              className={`wb-toggle-pill${useManual ? " active" : ""}`}
              onClick={() => setUseManual(true)}
            >
              Manual entry
            </button>
          </div>

          {useManual ? (
            <div className="form-row">
              <div className="form-label">From</div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Allowance from mom"
              />
            </div>
          ) : fundingSources.length === 0 ? (
            <p className="notif-desc" style={{ color: "#ff8080" }}>
              You don't have any other accounts yet. Add one in the Budget tab first, or use Manual entry.
            </p>
          ) : (
            <div className="form-row" style={{ position: "relative", overflow: "visible" }}>
              <div className="form-label">Source</div>
              <SourceDropdown options={fundingSources} value={source} onChange={setSource} />
            </div>
          )}
          <p className="notif-desc" style={{ marginTop: 8, fontSize: 12 }}>
            {useManual
              ? "No account will be deducted - this is money from outside the app."
              : "Withdraws this amount from the source above and adds it to Cash on Hand."}
          </p>

          <div className="settle-modal-footer" style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {allowSkip && (
              <button className="action-btn" style={{ flex: 1 }} onClick={handleSkip} disabled={saving}>
                Skip this week
              </button>
            )}
            <button className="submit-action-btn" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {!allowSkip && (
            <button
              className="action-btn"
              style={{ width: "100%", marginTop: 10 }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}
