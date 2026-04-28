import React from "react";

/**
 * Brief QAM-friendly quick start for the “How to use bonsAI” modal.
 * Kept in one place to stay aligned with README tone without duplicating the full doc.
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
          fontSize: 13,
          lineHeight: 1.45,
          color: "#e8eef4",
          textAlign: "left",
        }}
      >
        <strong style={{ display: "block", marginBottom: 6, color: "#fff" }}>
          Set your gaming PC&apos;s IP in Settings first
        </strong>
        Ollama usually runs on your <strong>main rig</strong> (not only on the Deck). In <strong>Settings</strong>, under
        Connection, enter that PC&apos;s <strong>LAN IP</strong> in the <strong>Ollama IP address</strong> field (for example{" "}
        <code style={{ fontSize: 12, color: "#b8dcc8" }}>
          192.168.1.50
        </code>
        ). <strong>You must do this — if it is empty or wrong, every ask will fail with a connection error.</strong>
      </p>
    <ul
      style={{
        margin: 0,
        paddingLeft: "1.15em",
        fontSize: 13,
        lineHeight: 1.4,
        color: "#c8d4e0",
        textAlign: "left",
      }}
    >
      <li style={itemStyle}>
        <strong>Ask</strong> from the main tab: type in the bar and send; the plugin talks to <strong>Ollama</strong> on your
        LAN using the URL you set in <strong>Settings</strong>.
      </li>
      <li style={itemStyle}>
        <strong>Speed / Strategy / Expert</strong> pick different model fallbacks; <strong>Strategy</strong> is tuned for
        gameplay coaching (spoilers-aware).
      </li>
      <li style={itemStyle}>
        <strong>Preset chips</strong> above the bar suggest common prompts; tap one to fill the bar (game context is added when
        available).
      </li>
      <li style={itemStyle}>
        <strong>Screenshots:</strong> attach a Steam shot for vision asks; use <strong>Permissions</strong> if attach is
        blocked. Pick attachment quality under Settings.
      </li>
      <li style={itemStyle}>
        <strong>TDP / power</strong> tips are read-only by default; enable <strong>Hardware control</strong> in Permissions if
        you want the plugin to apply changes on the Deck.
      </li>
      <li style={{ marginBottom: 0 }}>
        Other tabs: <strong>Settings</strong> (URL, policy, timing), <strong>Permissions</strong> (gates), <strong>About</strong>{" "}
        (links).
      </li>
    </ul>
    </>
  );
}
