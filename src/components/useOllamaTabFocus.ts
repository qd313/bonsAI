/**
 * Title: The Ollama tab's hand-wired D-pad hops
 *
 * Purpose: The refs the Ollama tab's rows register, and the small "put the ring on that row's control"
 * helpers the tab hands from one section to the next (the knowledge base switch, the reply-style
 * slider's knob, Terse mode, the Thinking row, the timeout and keep-models-loaded knobs, Test
 * connection). Moved out of OllamaTab.tsx unchanged, so the tab's own file is its layout.
 *
 * Used for: OllamaTab.tsx.
 *
 * Solves: Each section of the tab is its own file, and Steam's own guess at Up and Down between them
 * does not follow the tab's order, so the tab wires the hops by hand. Each helper looks only inside
 * the one row it was handed (a ref the row registered), never the page: under Decky the global
 * document is the wrong one.
 *
 * Folded (plan 91 § 2b): it also lists the tab's five sections in order with each one's first and last
 * control (`chain`), which the section lines use for Down into an open section and Up into the open
 * section above.
 *
 * Does not: Move the ring across containers. These are plain hops between controls of the one tab
 * body, through `focusInTabBody`, which plans the pane's place first so the browser's own scroll on
 * focus never jumps it (useTabBodyFocusScroll.ts). The section lines move by Steam's own transfer
 * (FoldedSection.tsx).
 */
import { useCallback, useMemo, useRef } from "react";

import { registerModalReturnFocusOwner } from "../features/plugin-shell/modalReturnFocusRegistry";
import { focusInTabBody } from "../features/plugin-shell/useTabBodyFocusScroll";
import type { FoldChainSection } from "../features/folded-tabs/FoldedSection";

/**
 * Give focus to the first matching stop inside one row's own container. The query is scoped to the
 * element handed in (a ref the row registered), never the page: under Decky the global document is
 * the wrong one. Returns false, leaving focus alone, when the row is not on screen or has no stop,
 * so the caller can let Steam's own move carry on.
 */
function focusFirstStopIn(host: HTMLElement | null, selector: string): boolean {
  if (!host) return false;
  // focus-patterns-allow: element-scoped query on the row's own ref, the sanctioned pattern (it moved here from OllamaTab.tsx unchanged).
  const target = host.querySelector<HTMLElement>(selector);
  if (!target) return false;
  focusInTabBody(target);
  return true;
}

/** The tab's row refs and its hop helpers, as OllamaTab.tsx used to declare them itself. */
export function useOllamaTabFocus() {
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);
  const ollamaKeepAliveThumbHostRef = useRef<HTMLDivElement>(null);
  const kbToggleHostRef = useRef<HTMLDivElement>(null);
  const kbDownloadBtnRef = useRef<HTMLButtonElement>(null);
  const kbRemoveBtnRef = useRef<HTMLButtonElement>(null);
  const kbCancelBtnRef = useRef<HTMLButtonElement>(null);
  const connectionTestBtnRef = useRef<HTMLButtonElement>(null);
  const replyVerbosityThumbHostRef = useRef<HTMLDivElement>(null);
  const terseToggleHostRef = useRef<HTMLDivElement>(null);
  const thinkingEffortHostRef = useRef<HTMLDivElement | null>(null);
  const whereBodyRef = useRef<HTMLDivElement>(null);
  const customTimeoutsHostRef = useRef<HTMLDivElement>(null);
  const modelsBtnRef = useRef<HTMLButtonElement | null>(null);

  // Registers the row's own container as the modal return-focus owner for its one-time notice
  // (plan 57 bug D). A ref callback, not the ref object alone, because it has to re-register on
  // every mount -- Decky remounts this whole screen when the notice popup closes, and a plain
  // `useRef` object does not fire again on its own. The row is not a single button (it is four,
  // and which one was pressed can change what is selected), so the registered owner is the row's
  // container; `focusOwnerById` in modalReturnFocusRegistry.ts falls back to the first button
  // inside a registered element that is not itself a button.
  const setThinkingEffortHost = useCallback((el: HTMLDivElement | null) => {
    thinkingEffortHostRef.current = el;
    registerModalReturnFocusOwner("ollama-thinking-effort", el);
  }, []);

  const focusOllamaKeepAliveThumb = useCallback((): boolean => {
    return focusFirstStopIn(ollamaKeepAliveThumbHostRef.current, "[tabindex], button");
  }, []);

  const focusLatencyWarningThumb = useCallback((): boolean => {
    return focusFirstStopIn(latencyWarningThumbHostRef.current, "[tabindex], button");
  }, []);

  const focusKbToggle = useCallback((): boolean => {
    return focusFirstStopIn(kbToggleHostRef.current, "[tabindex], button, input");
  }, []);

  const focusReplyVerbosityThumb = useCallback((): boolean => {
    return focusFirstStopIn(replyVerbosityThumbHostRef.current, "[tabindex], button");
  }, []);

  // Element-scoped query on the row's own ref — never a global document.querySelector,
  // which under Decky searches a 14-element shell rather than the plugin's DOM.
  const focusThinkingEffortRow = useCallback((): boolean => {
    return focusFirstStopIn(thinkingEffortHostRef.current, "button:not([disabled])");
  }, []);

  // Same shape as focusKbToggle: an element-scoped query on the row's own ref. The slider above and
  // the Thinking row below both hand focus here, so the toggle is a stop on the Down/Up walk
  // rather than a row the explicit slider-to-Thinking hop would jump over.
  const focusTerseToggle = useCallback((): boolean => {
    return focusFirstStopIn(terseToggleHostRef.current, "[tabindex], button, input");
  }, []);

  const focusKbUpFromReplyVerbosity = useCallback((): boolean => {
    // Cancel is checked first because it only exists while a download runs, and during
    // one both of the buttons below it are disabled — focusing either would be a no-op.
    if (kbCancelBtnRef.current) {
      focusInTabBody(kbCancelBtnRef.current);
      return true;
    }
    if (kbDownloadBtnRef.current) {
      focusInTabBody(kbDownloadBtnRef.current);
      return true;
    }
    if (kbRemoveBtnRef.current) {
      focusInTabBody(kbRemoveBtnRef.current);
      return true;
    }
    return focusKbToggle();
  }, [focusKbToggle]);

  /* Where AI runs' last control, for Up from the next line: Test connection, unless it is disabled (a test or a setup running). */
  const focusConnectionTestBtn = useCallback((): boolean => {
    const el = connectionTestBtnRef.current;
    if (!el || el.disabled) return false;
    focusInTabBody(el);
    return true;
  }, []);

  /* Where AI runs' first control (Run AI on this Deck), for Down from its line. */
  const focusWhereFirst = useCallback(
    (): boolean => focusFirstStopIn(whereBodyRef.current, "[tabindex], button:not([disabled]), input"),
    [],
  );

  const focusCustomTimeoutsToggle = useCallback(
    (): boolean => focusFirstStopIn(customTimeoutsHostRef.current, "[tabindex], button, input"),
    [],
  );

  const focusModelsBtn = useCallback((): boolean => {
    if (modelsBtnRef.current) focusInTabBody(modelsBtnRef.current);
    return Boolean(modelsBtnRef.current);
  }, []);

  /* The five sections in order, with each one's first and last control: the folded tab's D-pad chain. */
  const chain = useMemo<FoldChainSection[]>(
    () => [
      { id: "where", enterFromTop: focusWhereFirst, enterFromBottom: focusConnectionTestBtn },
      { id: "kb", enterFromTop: focusKbToggle, enterFromBottom: focusKbUpFromReplyVerbosity },
      { id: "reply", enterFromTop: focusReplyVerbosityThumb, enterFromBottom: focusThinkingEffortRow },
      { id: "tuning", enterFromTop: focusCustomTimeoutsToggle, enterFromBottom: focusOllamaKeepAliveThumb },
      { id: "models", enterFromTop: focusModelsBtn, enterFromBottom: focusModelsBtn },
    ],
    [
      focusConnectionTestBtn,
      focusCustomTimeoutsToggle,
      focusKbToggle,
      focusKbUpFromReplyVerbosity,
      focusModelsBtn,
      focusOllamaKeepAliveThumb,
      focusReplyVerbosityThumb,
      focusThinkingEffortRow,
      focusWhereFirst,
    ],
  );

  return {
    latencyWarningThumbHostRef,
    ollamaKeepAliveThumbHostRef,
    kbToggleHostRef,
    kbDownloadBtnRef,
    kbRemoveBtnRef,
    kbCancelBtnRef,
    connectionTestBtnRef,
    replyVerbosityThumbHostRef,
    terseToggleHostRef,
    whereBodyRef,
    customTimeoutsHostRef,
    modelsBtnRef,
    setThinkingEffortHost,
    focusOllamaKeepAliveThumb,
    focusLatencyWarningThumb,
    focusKbToggle,
    focusReplyVerbosityThumb,
    focusThinkingEffortRow,
    focusTerseToggle,
    focusKbUpFromReplyVerbosity,
    focusCustomTimeoutsToggle,
    chain,
  };
}
