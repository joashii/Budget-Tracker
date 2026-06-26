import React from "react";
import { auth } from "../api/client";

export default function Login({ authError }) {
  return (
    <div className="app-container" style={{ justifyContent: "center", minHeight: "60vh" }}>
      <h1 className="brand-title">
        BUDGET <span>TRACKER</span>
      </h1>
      <div className="settle-modal-card" style={{ margin: "0 auto", textAlign: "center" }}>
        <h2 className="settle-modal-title">Sign in to continue</h2>
        <p className="settle-modal-subtitle">
          Sign in with Google to create or open it.
        </p>
        {authError && (
          <p style={{ color: "#f87171", fontSize: 13, marginBottom: 16 }}>{authError}</p>
        )}
        <a href={auth.loginUrl} style={{ textDecoration: "none" }}>
          <button className="submit-action-btn">Continue with Google</button>
        </a>
      </div>
    </div>
  );
}
