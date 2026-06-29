import React, { useEffect, useState } from "react";
import { api, auth } from "./api/client";
import Fireflies from "./components/Fireflies";
import LoadingScreen from "./components/LoadingScreen";
import { ToastProvider } from "./components/Toast";
import SettingsModal from "./components/SettingsModal";
import Login from "./pages/Login";
import HistoryView from "./pages/HistoryView";
import BudgetView from "./pages/BudgetView";
import DebtLedger from "./pages/DebtLedger";
import WeeklyBudgetModal from "./components/WeeklyBudgetModal";

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

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

function AppShell() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [tab, setTab] = useState("budget"); // matches original default active = view-budget

  const [showSettings, setShowSettings] = useState(false);
  const [alwaysHide, setAlwaysHide] = useState(false);
  const [moneyHidden, setMoneyHidden] = useState(false);

  const [sources, setSources] = useState([]);
  const [weeklyBudget, setWeeklyBudget] = useState(null);
  const [showWeeklyBudgetModal, setShowWeeklyBudgetModal] = useState(false);
  const [wbRefreshKey, setWbRefreshKey] = useState(0);

  const params = new URLSearchParams(window.location.search);
  const authError = params.get("authError");

  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getMoneySettings()
      .then((s) => {
        setAlwaysHide(s.alwaysHide);
        setMoneyHidden(s.alwaysHide ? true : !s.visible);
      })
      .catch(() => {});
    api.getSources().then(setSources).catch(() => {});
  }, [user]);

  // Weekly Budget: load this week's status + the popup settings, then decide
  // whether to auto-show the popup (chosen day, after 8 AM, not yet set/skipped).
  useEffect(() => {
    if (!user) return;
    Promise.all([api.getWeeklyBudget(), api.getWeeklyBudgetSettings()])
      .then(([wb, settings]) => {
        setWeeklyBudget(wb);
        if (!settings.enabled) return;
        const now = new Date();
        const isChosenDay = now.getDay() === settings.dayOfWeek;
        const isPast8AM = now.getHours() >= 8;
        if (isChosenDay && isPast8AM && wb.status === "unset") {
          setShowWeeklyBudgetModal(true);
        }
      })
      .catch(() => {});
  }, [user, wbRefreshKey]);

  function refreshWeeklyBudget() {
    setWbRefreshKey((k) => k + 1);
  }

  function toggleMoneyHidden() {
    const next = !moneyHidden;
    setMoneyHidden(next);
    // Only the manual show/hide state needs saving here - alwaysHide itself
    // is changed separately via toggleAlwaysHide.
    api.saveMoneySettings({ alwaysHide, visible: !next }).catch(() => {});
  }

  function toggleAlwaysHide() {
    const next = !alwaysHide;
    setAlwaysHide(next);
    if (next) setMoneyHidden(true);
    api.saveMoneySettings({ alwaysHide: next, visible: !moneyHidden }).catch(() => {});
  }

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
          <button className="nav-tab nav-tab-sheet" onClick={() => setShowSettings(true)} title="Settings">
            <SettingsIcon />
          </button>
        </div>

        <div className="main-view-section active show">
          {tab === "history" && <HistoryView hidden={moneyHidden} />}
          {tab === "budget" && (
            <BudgetView
              hidden={moneyHidden}
              onToggleHidden={toggleMoneyHidden}
              weeklyBudget={weeklyBudget}
              onEditWeeklyBudget={() => setShowWeeklyBudgetModal(true)}
              wbRefreshKey={wbRefreshKey}
            />
          )}
          {tab === "debt" && <DebtLedger hidden={moneyHidden} />}
        </div>

        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          userEmail={user.email}
          alwaysHide={alwaysHide}
          onToggleAlwaysHide={toggleAlwaysHide}
        />

        <WeeklyBudgetModal
          open={showWeeklyBudgetModal}
          onClose={() => setShowWeeklyBudgetModal(false)}
          weeklyBudget={weeklyBudget}
          sources={sources}
          onSaved={refreshWeeklyBudget}
        />
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
