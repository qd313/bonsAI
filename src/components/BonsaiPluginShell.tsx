/**
 * Title: The plugin's outermost box
 *
 * Purpose: The very first element the plugin draws — every tab (Main,
 * Settings, Permissions, and the rest) is drawn inside this one box. It
 * carries the plugin's whole stylesheet with it, so nothing drawn inside
 * has to bring its own copy. Because this box exists before any tab does,
 * it is also the first place in the plugin that can learn which real,
 * on-screen document the plugin ended up drawn into — see the gotcha below.
 *
 * Used for: index.tsx, wrapping every tab the plugin has.
 *
 * Solves: Without one shared outer box, each tab would have to inject the
 * plugin's stylesheet for itself and work out its own on-screen document.
 *
 * Does not: Decide which tab is showing, save any settings, or wire up
 * D-pad movement between rows — those all live elsewhere (see
 * useBonsaiPluginShell).
 *
 * Gotchas: Decky runs the plugin's own JavaScript inside a near-empty
 * background page (called SharedJSContext in the Decky SDK), not the popup
 * window a person actually sees on screen. This box's ref callback is what
 * tells the rest of the plugin which document is the real one, by calling
 * rememberUiDocument() the moment it mounts — before any tab has drawn
 * anything. Three other places call that same function, but only once an AI
 * answer exists, so this box's own call is what covers everything before
 * the first reply — including the blur-on-submit that runs the moment the
 * very first question is sent, which by definition happens before any
 * answer exists yet.
 */
import React from "react";

import { buildBonsaiScopeStylesheet } from "../styles/bonsaiScopeStylesheet";
import { rememberUiDocument } from "../utils/uiDocument";

export type BonsaiPluginShellProps = {
  scopeRef: React.RefObject<HTMLDivElement | null>;
  scopeStyle: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Root layout wrapper: scoped Deck/QAM stylesheet + plugin subtree.
 *
 * The ref callback also teaches `uiDocument` which document the UI renders into. This node is the
 * outermost element the plugin owns, so it mounts before any tab body — which is the point. The
 * three registries that also call `rememberUiDocument` (answer bubble, answer stop, spoiler fence)
 * only run once an *answer* exists, so before the first reply every `getUiDocument()` caller was
 * still falling back to SharedJSContext's shell document — including the blur-on-submit in
 * `useBonsaiAskOrchestration`, which is on the first-Ask path by definition.
 */
export const BonsaiPluginShell: React.FC<BonsaiPluginShellProps> = ({ scopeRef, scopeStyle, children }) => (
  <div
    ref={(el: HTMLDivElement | null) => {
      (scopeRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      rememberUiDocument(el);
    }}
    className="bonsai-scope"
    style={scopeStyle}
  >
    <style>{buildBonsaiScopeStylesheet()}</style>
    {children}
  </div>
);
