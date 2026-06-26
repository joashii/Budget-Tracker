import React, { useEffect, useRef, useState } from "react";

const FIREFLY_COUNT = 28;
const MESSAGES = ["Initializing", "Connecting to your sheet", "Setting up your workspace", "Loading your data", "Almost there"];
const MIN_MS = 5000;

/**
 * Direct port of loading.html's #loadingScreen: wizard scene + floating
 * shapes + scoped fireflies + progress bar + rotating status text.
 *
 * Props:
 *  loading - boolean, true while real work (auth check, etc.) is still happening.
 *            The screen stays up at least MIN_MS regardless, then fades out
 *            950ms after `loading` flips false, matching hideLoadingScreen().
 *  onHidden - called once the fade-out finishes (good place to unmount this).
 */
export default function LoadingScreen({ loading, onHidden }) {
  const screenRef = useRef(null);
  const statusElRef = useRef(null);
  const [hiding, setHiding] = useState(false);
  const [visible, setVisible] = useState(true);
  const startTimeRef = useRef(Date.now());
  const msgIdxRef = useRef(0);

  // Fireflies + message rotation + responsive scaling (mount once)
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    const lfStyle = document.createElement("style");
    document.head.appendChild(lfStyle);

    const createdFireflies = [];
    for (let i = 1; i <= FIREFLY_COUNT; i++) {
      const ff = document.createElement("div");
      ff.className = "lf";
      const mn = "lfMove" + i;
      ff.style.setProperty("--lf-rot", Math.random() * 10 + 8 + "s");
      ff.style.setProperty("--lf-flash", Math.random() * 6000 + 5000 + "ms");
      ff.style.setProperty("--lf-delay", Math.random() * 8000 + 500 + "ms");
      ff.style.setProperty("--lf-move", mn);

      const steps = Math.floor(Math.random() * 12) + 16;
      let kf = "@keyframes " + mn + " {";
      for (let s = 0; s <= steps; s++) {
        const pct = s * (100 / steps);
        kf += pct + "% { transform: translateX(" + (Math.random() * 100 - 50) + "vw) translateY(" + (Math.random() * 100 - 50) + "vh) scale(" + (Math.random() * 0.75 + 0.25) + "); }";
      }
      kf += "}";
      lfStyle.sheet.insertRule(kf, lfStyle.sheet.cssRules.length);
      screen.insertBefore(ff, screen.firstChild);
      createdFireflies.push(ff);
    }

    const msgTimer = setInterval(() => {
      const el = statusElRef.current;
      if (!el) return;
      el.style.opacity = "0";
      setTimeout(() => {
        msgIdxRef.current = (msgIdxRef.current + 1) % MESSAGES.length;
        el.textContent = MESSAGES[msgIdxRef.current];
        el.style.opacity = "1";
      }, 350);
    }, 2400);

    function scaleScene() {
      const container = screen.querySelector(".l-scene-container");
      const base = screen.querySelector(".l-scene-base");
      if (!container || !base) return;
      const naturalW = 410, naturalH = 310;
      const vw = window.innerWidth, vh = window.innerHeight;
      const scaleW = (vw * 0.9) / naturalW;
      const scaleH = (vh * 0.52) / naturalH;
      const scale = Math.min(scaleW, scaleH, 1);
      container.style.setProperty("--scene-scale", scale.toFixed(4));
      base.style.width = naturalW * scale + "px";
      base.style.height = naturalH * scale + "px";
      screen.style.gap = Math.round(24 * scale) + "px";
    }
    scaleScene();
    window.addEventListener("resize", scaleScene);

    return () => {
      clearInterval(msgTimer);
      window.removeEventListener("resize", scaleScene);
      createdFireflies.forEach((el) => el.remove());
      lfStyle.remove();
    };
  }, []);

  // Min-display-time + fade-out logic (mirrors window.hideLoadingScreen())
  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, MIN_MS - elapsed);
    const t1 = setTimeout(() => {
      setHiding(true);
      const t2 = setTimeout(() => {
        setVisible(false);
        if (onHidden) onHidden();
      }, 950);
      return () => clearTimeout(t2);
    }, remaining);
    return () => clearTimeout(t1);
  }, [loading, onHidden]);

  if (!visible) return null;

  return (
    <div id="loadingScreen" ref={screenRef} className={hiding ? "hiding" : ""}>
      <div className="loader-brand">
        BUDGET <span>TRACKER</span>
      </div>

      <div className="l-scene-base">
        <div className="l-scene-container">
          <div className="l-scene">
            <div className="l-objects">
              <div className="tr"></div>
              <div className="sq"></div>
              <div className="ci"></div>
            </div>
            <div className="l-wizard">
              <div className="wbody"></div>
              <div className="right-arm"><div className="right-hand"></div></div>
              <div className="left-arm"><div className="left-hand"></div></div>
              <div className="whead">
                <div className="beard"></div>
                <div className="face"><div className="adds"></div></div>
                <div className="hat">
                  <div className="hat-of-the-hat"></div>
                  <div className="star s1"></div>
                  <div className="star s2"></div>
                  <div className="star s3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="l-bottom">
        <div className="l-progress-wrap"><div className="l-progress-bar"></div></div>
        <div className="l-status-row">
          <div className="l-dot"></div>
          <div className="l-status" ref={statusElRef}>Initializing</div>
        </div>
      </div>
    </div>
  );
}
