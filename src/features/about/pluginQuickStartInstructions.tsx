/**
 * Title: The help popup's quick-start text
 *
 * Purpose: The actual words shown inside the plugin's "How to use bonsAI"
 * help popup: first, a highlighted box telling a person they must set
 * where the AI runs before anything works, then a short bulleted list
 * covering the rest of the plugin at a glance.
 *
 * Used for: The plugin's help popup.
 *
 * Solves: Keeps one short, up-to-date summary written for this popup,
 * separate from the full project readme, which is too long to read
 * comfortably inside the Quick Access Menu.
 *
 * Does not: Actually set up a connection to the AI, or check whether one
 * is already working — it only tells a person to go do that themselves,
 * on the Ollama tab.
 */
import React from "react";
import { textPx } from "../../styles/textPx";

/**
 * In: nothing — every word here is fixed.
 * Out: the finished block of help text.
 * Can go wrong: nothing — this always returns the same content.
 */
export function PluginQuickStartInstructionsBody() {
  const itemStyle: React.CSSProperties = { marginBottom: "0.45em" };
  return (
    <>
      <p
        style={{
          margin: "0 0 12px 0",
          padding: "10px 12px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.14)",
          fontSize: textPx(13),
          lineHeight: 1.45,
          color: "#e8eef4",
          textAlign: "left",
        }}
      >
        <strong style={{ display: "block", marginBottom: 6, color: "#fff" }}>
          First, choose where the AI runs
        </strong>
        The AI can run in one of two places. Pick one on the <strong>Ollama</strong> tab.
        <br />
        <strong>On this Deck:</strong> switch on <strong>Run AI on this Deck</strong>, then press{" "}
        <strong>Install Ollama</strong>. It works anywhere, but it is slower while a game is running.
        <br />
        <strong>On a PC at home:</strong> install Ollama on that PC. Then type its address into{" "}
        <strong>PC address</strong> (for example{" "}
        <code style={{ fontSize: textPx(12), color: "#b8dcc8" }}>
          http://192.168.1.50:11434
        </code>
        ) and press <strong>Test connection</strong>. It is much faster.
        <br />
        Until one of these is set, every ask fails with a connection error.
      </p>
    <ul
      style={{
        margin: 0,
        paddingLeft: "1.15em",
        fontSize: textPx(13),
        lineHeight: 1.4,
        color: "#c8d4e0",
        textAlign: "left",
      }}
    >
      <li style={itemStyle}>
        <strong>Ask</strong> from the main tab: type in the bar and send; the plugin talks to{" "}
        <strong>Ollama</strong> using the base URL on the <strong>Ollama</strong> tab.
      </li>
      <li style={itemStyle}>
        <strong>Speed / Strategy / Expert</strong> pick different model fallbacks; <strong>Strategy</strong> is tuned for
        gameplay coaching (spoilers-aware, checklist, branch choices).
      </li>
      <li style={itemStyle}>
        <strong>Preset chips</strong> above the bar suggest common prompts; tap one to fill the bar (game context is added when
        available).
      </li>
      <li style={itemStyle}>
        <strong>Screenshots:</strong> attach a Steam shot for vision asks; use <strong>Permissions</strong> if attach is
        blocked. Pick attachment quality under Settings.
      </li>
      <li style={{ marginBottom: 0 }}>
        Other tabs: <strong>Ollama</strong> (connection, models, timing), <strong>Settings</strong> (voice, character),{" "}
        <strong>Permissions</strong> (gates), <strong>About</strong> (links).
      </li>
    </ul>
    </>
  );
}
