import React, { useEffect, useRef } from "react";

const FIREFLY_COUNT = 15;

/**
 * Direct port of createFireflies() from the original index.html.
 * Generates N <div class="firefly"> elements appended to document.body,
 * each with a randomized unique @keyframes "moveN" rule and CSS custom
 * properties consumed by the .firefly / .firefly::before / .firefly::after
 * rules already defined in theme.css.
 */
export default function Fireflies() {
  const styleElRef = useRef(null);
  const fireflyElsRef = useRef([]);

  useEffect(() => {
    const styleSheet = document.createElement("style");
    document.head.appendChild(styleSheet);
    styleElRef.current = styleSheet;

    const created = [];

    for (let i = 1; i <= FIREFLY_COUNT; i++) {
      const firefly = document.createElement("div");
      firefly.className = "firefly";

      firefly.style.setProperty("--rotation-speed", Math.random() * 10 + 8 + "s");
      firefly.style.setProperty("--flash-duration", Math.random() * 6000 + 5000 + "ms");
      firefly.style.setProperty("--flash-delay", Math.random() * 8000 + 500 + "ms");
      firefly.style.setProperty("--move-name", "move" + i);

      const steps = Math.floor(Math.random() * 12) + 16;
      let kf = "@keyframes move" + i + " {";
      for (let s = 0; s <= steps; s++) {
        const pct = s * (100 / steps);
        const tx = Math.random() * 100 - 50 + "vw";
        const ty = Math.random() * 100 - 50 + "vh";
        const scale = Math.random() * 75 / 100 + 0.25;
        kf += pct + "% { transform: translateX(" + tx + ") translateY(" + ty + ") scale(" + scale + "); }";
      }
      kf += "}";
      styleSheet.sheet.insertRule(kf, styleSheet.sheet.cssRules.length);

      document.body.appendChild(firefly);
      created.push(firefly);
    }

    fireflyElsRef.current = created;

    // Clean up on unmount (React StrictMode double-invokes effects in dev,
    // and this prevents duplicate fireflies from piling up on hot reloads).
    return () => {
      created.forEach((el) => el.remove());
      styleSheet.remove();
    };
  }, []);

  return null;
}
