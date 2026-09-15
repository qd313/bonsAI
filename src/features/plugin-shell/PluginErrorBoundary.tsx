/**
 * Title: Catching a crash while the screen is being drawn
 *
 * Purpose: If something goes wrong while a piece of the plugin's screen is
 * being drawn — not a button press or a background call, but the actual
 * drawing — this shows a plain "Plugin error" panel with the error message
 * instead of the whole Quick Access Menu going blank with no explanation.
 * It is what React calls an error boundary: a wrapper that can catch a
 * drawing failure in anything inside it.
 *
 * Used for: Wraps the whole of bonsAI's content in index.tsx.
 *
 * Solves: Before this existed, a bug in drawing any one part of the screen
 * could blank the entire plugin panel, with nothing on screen to say why.
 *
 * Does not: Catch a failure in a button press, a background call to the AI
 * or to Steam, or anything that happens after the screen has already been
 * drawn — React's error boundaries only see drawing itself. Those other
 * kinds of failure are reported through toast pop-ups and the app log
 * instead.
 */
import React from "react";

export class PluginErrorBoundary extends React.Component<any, { error: any; info?: any }> {
  /** Initialize boundary state with no captured error. */
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  /** Capture runtime render errors and persist debug details for the fallback panel. */
  componentDidCatch(error: any, info: any) {
    this.setState({ error, info });
    try {
      console.error("React render error", error, info);
    } catch (e) {}
  }

  /** Render either the fallback UI or the child tree based on current boundary state. */
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "white" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Plugin error</div>
          <div style={{ color: "tomato", whiteSpace: "pre-wrap" }}>{String(this.state.error)}</div>
          <pre style={{ color: "gray", whiteSpace: "pre-wrap" }}>{this.state.info?.componentStack ?? ""}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
