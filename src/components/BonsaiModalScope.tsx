/**
 * Title: Plugin look-and-feel wrapper for popups
 *
 * Purpose: When the plugin opens one of Steam's own full-screen popups —
 * the models hub, the pull-models list, and others — that popup is drawn
 * outside the plugin's normal box on screen, so none of the plugin's usual
 * styling reaches it on its own. This component wraps a popup's contents
 * so it picks up the plugin's look (fonts, glass panels, and so on) and
 * the person's chosen UI scale, the same as the main screen.
 *
 * Used for: Every popup the plugin opens with Decky's showModal — the
 * models hub, the pull-models list, and others.
 *
 * Solves: Without this, a popup's text and panels would look plain and be
 * sized wrong compared to the rest of the plugin, because it is drawn
 * outside the part of the page the plugin's main stylesheet applies to.
 *
 * Does not: Decide what the popup shows, or handle button presses inside
 * it — this only wraps the popup in the right look. The content inside
 * (its children) owns everything else.
 */
import React from "react";

import { buildModalPortalStylesheet } from "../styles/bonsaiScopeStylesheet";
import { useUiScaleScopeStyle } from "../context/UiScaleContext";
import { readPublishedUiScaleScopeStyle } from "../utils/uiScaleScopeBridge";

export type BonsaiModalScopeProps = {
  children: React.ReactNode;
  className?: string;
  shellRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * In: the popup's own contents (children), an optional extra CSS class,
 * and an optional ref to the wrapping box.
 * Out: that same content, wrapped in a box carrying the plugin's styling
 * and the person's current UI scale.
 * Can go wrong: nothing — this only wraps its children, it does not
 * change what they do.
 */
export function BonsaiModalScope({ children, className, shellRef }: BonsaiModalScopeProps) {
  const contextStyle = useUiScaleScopeStyle();
  const bridgeStyle = readPublishedUiScaleScopeStyle();
  const mergedClass = ["bonsai-scope", className].filter(Boolean).join(" ");
  return (
    <div ref={shellRef} className={mergedClass} style={{ ...bridgeStyle, ...contextStyle }}>
      <style>{buildModalPortalStylesheet()}</style>
      {children}
    </div>
  );
}
