import React, { useEffect, useState } from "react";
import Portal from "./Portal";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Controlled calendar modal matching the original .calendar-modal markup
 * (calendar-header / cal-nav-btn / calendar-weekdays / calendar-days / cal-day).
 *
 * Props:
 *  open        - boolean, whether the modal is shown
 *  value       - "YYYY-MM-DD" currently selected date
 *  onApply     - (dateStr) => void, called when "Apply" is clicked
 *  onClose     - () => void, called when "Cancel" or overlay is dismissed
 */
export default function CalendarModal({ open, value, onApply, onClose }) {
  const [viewDate, setViewDate] = useState(() => parseDate(value));
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    if (open) {
      setViewDate(parseDate(value));
      setSelected(value);
    }
  }, [open, value]);

  if (!open) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) cells.push(day);

  function dateStrFor(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function changeMonth(direction) {
    setViewDate(new Date(year, month + direction, 1));
  }

  function handleApply() {
    if (!selected) return;
    onApply(selected);
  }

  return (
    <Portal>
      <div className="modal-overlay open" style={{ zIndex: 9999 }}>
        <div className="modal-box calendar-modal">
          <div className="calendar-header">
            <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>❬</button>
            <h3 className="calendar-current-month">{MONTH_NAMES[month]} {year}</h3>
            <button className="cal-nav-btn" onClick={() => changeMonth(1)}>❭</button>
          </div>
          <div className="calendar-weekdays">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="calendar-days">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="cal-day empty"></div>;
              const ds = dateStrFor(day);
              return (
                <div
                  key={ds}
                  className={`cal-day${ds === selected ? " active" : ""}`}
                  onClick={() => setSelected(ds)}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="modal-footer cal-footer">
            <button className="action-btn cal-cancel" onClick={onClose}>Cancel</button>
            <button className="action-btn cal-apply" onClick={handleApply}>Apply</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
}

/** Helper used by callers to format the date-button label, matching original short/long formats. */
export function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
