import React, { useEffect, useRef, useState } from "react";

/**
 * Controlled dropdown matching the original's custom-dropdown-options /
 * custom-option-item pattern (used for Source selection in the budget form,
 * transaction modal, and settle modal).
 *
 * Props:
 *  options  - array of { name, balance }
 *  value    - currently selected source name
 *  onChange - (name) => void
 *  placeholder - shown when nothing selected
 */
export default function SourceDropdown({ options, value, onChange, placeholder = "Select source..." }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.name === value);

  function fmt(n) {
    return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  return (
    <div ref={wrapRef} style={{ flex: 1, position: "relative", overflow: "visible", minWidth: 0 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: "100%",
          minHeight: 46,
          background: "transparent",
          color: "var(--text-white)",
          cursor: "pointer",
          userSelect: "none",
          fontSize: 16,
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: selected ? "#fff" : "rgba(255,255,255,0.5)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            minWidth: 0,
          }}
        >
          {selected ? selected.name : placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {open && (
        <div className="custom-dropdown-options">
          {options.map((o) => (
            <div
              key={o.name}
              className={`custom-option-item${o.name === value ? " selected-active" : ""}`}
              onClick={() => {
                onChange(o.name);
                setOpen(false);
              }}
            >
              <span>{o.name}</span>
              <span>{fmt(o.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
