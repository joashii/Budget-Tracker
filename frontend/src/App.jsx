import React, { useEffect, useState } from "react";
import { api, auth } from "./api/client";
import Fireflies from "./components/Fireflies";
import LoadingScreen from "./components/LoadingScreen";
import { ToastProvider } from "./components/Toast";
import Login from "./pages/Login";
import HistoryView from "./pages/HistoryView";
import BudgetView from "./pages/BudgetView";
import DebtLedger from "./pages/DebtLedger";

const TABS = [
  {
    key: "history",
    icon: (
      <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    ),
  },
  {
    key: "budget",
    icon: (
      <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="18" y2="10"></line>
      </svg>
    ),
  },
  {
    key: "debt",
    icon: (
      <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
  },
];

const SheetIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

function AppShell() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [tab, setTab] = useState("budget"); // matches original default active = view-budget

  const params = new URLSearchParams(window.location.search);
  const authError = params.get("authError");

  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  async function handleOpenSheet() {
    try {
      const { url } = await api.getSpreadsheetUrl();
      window.open(url, "_blank");
    } catch {
      // ignore
    }
  }

  const loadingOverlay = showLoadingScreen ? (
    <LoadingScreen loading={checkingAuth} onHidden={() => setShowLoadingScreen(false)} />
  ) : null;

  if (checkingAuth) return loadingOverlay;

  if (!user) {
    return (
      <>
        {loadingOverlay}
        <Fireflies />
        <Login authError={authError} />
      </>
    );
  }

  return (
    <>
      {loadingOverlay}
      <Fireflies />
      <div className="app-container">
        <h1 className="brand-title">
          BUDGET <span>TRACKER</span>
        </h1>

        <div className="nav-bar">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`nav-tab${tab === t.key ? " active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
            </button>
          ))}
          <button className="nav-tab nav-tab-sheet" onClick={handleOpenSheet} title="Open Google Sheet">
            <SheetIcon />
          </button>
        </div>

        <div className="main-view-section active show">
          {tab === "history" && <HistoryView userEmail={user.email} />}
          {tab === "budget" && <BudgetView />}
          {tab === "debt" && <DebtLedger />}
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
