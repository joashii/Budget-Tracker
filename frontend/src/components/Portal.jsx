import React from "react";
import { createPortal } from "react-dom";

/**
 * Renders children directly into document.body via a portal.
 *
 * Why this exists: .main-view-section has `transform: translateY(...)` for
 * its slide-in animation. Per the CSS spec, ANY element with a `transform`
 * becomes a new containing block for `position: fixed` descendants - so a
 * modal-overlay nested inside it only covers that section's box, not the
 * real viewport (the "overlay only darkens one area" bug). The original
 * vanilla-JS app avoided this by keeping all modal-overlay divs as direct
 * siblings outside the tab-panel-content sections. This Portal replicates
 * that structure in React.
 */
export default function Portal({ children }) {
  return createPortal(children, document.body);
}
