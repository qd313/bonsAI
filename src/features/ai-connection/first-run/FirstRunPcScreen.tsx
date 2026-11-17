/**
 * Title: The first-time setup's second screen: "Use the AI on my PC"
 *
 * Purpose: What "Use the AI on my PC" on the first screen opens (board 5, tab 4, round 1 A, kept by round 4): the
 * title, one line saying nothing is downloaded on this path and Back changes nothing, the PC address field with Find
 * LAN beside it, the help lines (the address's usual port, this Deck's address, what the PC needs), the test's
 * result line, and the foot [Test connection] [Back]. Once a test connects the action reads "Ask your first
 * question" and closes the popup. The ring starts on Back, and B is Back.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx, which keeps the address, the test's answer and the Find LAN state and
 * hands them in.
 *
 * Solves: The PC half of the old popup, moved onto its own screen now that the first screen is the checklist; its
 * address field, Find LAN and test result line are the same ones, and walk the same way (docs/focus-graph.md).
 *
 * Does not: Save or test anything itself; the popup does (the address is remembered only after a test that
 * connected, as on the Ollama tab).
 */
import React from "react";
import { TextField } from "@decky/ui";

import { textPx } from "../../../styles/textPx";
import type { SearchStopProps } from "../../search-tab/useSearchNav";
import { isHttpsOllamaAddress, OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "../ollamaAddress";
import type { ConnectionStatus } from "../OllamaWhereAiRunsSection.types";
import { OLLAMA_ROW_HELP } from "../ollamaTabFolds";
import { FIRST_RUN_HELP_STYLE, PopupButton } from "./FirstRunPopupParts";
import { PC_FOOT_ACTION, PC_FOOT_BACK, type FirstRunPopupNav, type PC_SCREEN_ROWS } from "./useFirstRunPopupNav";

/** Every word of this screen that is not a help line shared with the Ollama tab. */
const FIRST_RUN_PC_WORDS = {
  title: "Use the AI on my PC",
  lead: "Nothing is downloaded on this path. Back changes nothing.",
  pcAddress: "PC address",
  pcNeeds: "The PC needs Ollama with a model, and must accept connections from your network.",
  test: "Test connection",
  done: "Ask your first question",
  back: "Back",
} as const;

export type FirstRunPcScreenProps = {
  nav: FirstRunPopupNav<(typeof PC_SCREEN_ROWS)[number]>;
  ip: string;
  onIpChange: (ip: string) => void;
  deckIp: string;
  connection: ConnectionStatus | null;
  testing: boolean;
  mdnsDiscovering: boolean;
  mdnsMessage: string | null;
  onFindLan: () => void;
  onTest: () => void;
  onDone: () => void;
  onBack: () => void;
};

/** The screen. In: the address, the test's answer and the actions. Out: the screen's words and its five stops. */
export function FirstRunPcScreen(p: FirstRunPcScreenProps): React.ReactElement {
  const ready = Boolean(p.connection?.reachable);
  return (
    <>
      <div style={{ fontSize: textPx(16), fontWeight: 700, color: "#ffffff" }}>{FIRST_RUN_PC_WORDS.title}</div>
      <div style={FIRST_RUN_HELP_STYLE}>{FIRST_RUN_PC_WORDS.lead}</div>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div style={{ fontVariant: "small-caps", letterSpacing: "0.06em", fontSize: textPx(11), fontWeight: 600, color: "#b8c6d6", marginBottom: 2 }}>
            {FIRST_RUN_PC_WORDS.pcAddress}
          </div>
          <AddressField stop={p.nav.stop("address", 0)} value={p.ip} onChange={p.onIpChange} />
        </div>
        <PopupButton
          stop={p.nav.stop("address", 1)}
          label={p.mdnsDiscovering ? "…" : "Find LAN"}
          ariaLabel="Find Ollama on LAN via mDNS"
          fill={false}
          greyed={p.mdnsDiscovering || p.testing}
          onPress={p.onFindLan}
        />
      </div>
      <div style={FIRST_RUN_HELP_STYLE}>{OLLAMA_ROW_HELP.pcAddress}</div>
      {isHttpsOllamaAddress(p.ip) ? <div style={{ fontSize: textPx(11), color: "tomato" }}>{OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE}</div> : null}
      <div style={FIRST_RUN_HELP_STYLE}>
        {"This Deck's IP: "}
        <span style={{ color: "#b8c6d6", fontVariantNumeric: "tabular-nums" }}>{p.deckIp}</span>
        {". "}
        {FIRST_RUN_PC_WORDS.pcNeeds}
      </div>
      {p.mdnsMessage ? <div style={FIRST_RUN_HELP_STYLE}>{p.mdnsMessage}</div> : null}
      <TestResultLine status={p.connection} hidden={p.connection?.error === OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE && isHttpsOllamaAddress(p.ip)} />
      <div style={{ display: "flex", flexDirection: "row", gap: 8, marginTop: 4 }}>
        <PopupButton
          stop={p.nav.stop("foot", PC_FOOT_ACTION)}
          label={ready ? FIRST_RUN_PC_WORDS.done : p.testing ? "Testing…" : FIRST_RUN_PC_WORDS.test}
          ariaLabel={ready ? "Ask your first question: close this window" : "Test the connection to the PC"}
          look="primary"
          greyed={!ready && (p.testing || !p.ip.trim())}
          onPress={ready ? p.onDone : p.onTest}
        />
        <PopupButton
          stop={p.nav.stop("foot", PC_FOOT_BACK)}
          label={FIRST_RUN_PC_WORDS.back}
          ariaLabel="Back to the first screen"
          look="plain"
          onPress={p.onBack}
        />
      </div>
    </>
  );
}

/** The PC address box: Steam's text field, whose stop is the input inside it (a ref on the field holds the component). */
function AddressField({ stop, value, onChange }: { stop: SearchStopProps; value: string; onChange: (next: string) => void }): React.ReactElement {
  const { ref, ...rest } = stop;
  return (
    // focus-patterns-allow: element-scoped query on this component's own wrapper, to hand the walk the input, as the Search tab's find box does.
    <div ref={(box) => ref(box ? (box.querySelector("input") ?? box) : null)}>
      <TextField
        label=""
        value={value}
        spellCheck={false}
        {...(rest as Record<string, unknown>)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

/** The one line a test leaves under the address: connected (green) or the reason it did not (red). */
function TestResultLine({ status, hidden }: { status: ConnectionStatus | null; hidden: boolean }): React.ReactElement | null {
  if (!status || hidden) return null;
  if (status.reachable) {
    const n = status.models?.length ?? 0;
    return (
      <div style={{ fontSize: textPx(12), color: "#81c784" }} aria-live="polite">
        Connected · Ollama v{status.version}
        {n > 0 ? ` · ${n} model${n === 1 ? "" : "s"}` : ""}
      </div>
    );
  }
  return (
    <div style={{ fontSize: textPx(12), color: "tomato" }} aria-live="polite">
      Unreachable — {status.error}
    </div>
  );
}
