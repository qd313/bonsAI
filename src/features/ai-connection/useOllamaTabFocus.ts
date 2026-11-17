/**
 * Title: The Ollama tab's hand-wired D-pad hops
 *
 * Purpose: The refs the Ollama tab's rows register, and the small "put the ring on that row's control"
 * helpers the tab hands from one section to the next (the knowledge base switch, the reply-style
 * slider's knob, the Thinking row, the timeout and keep-models-loaded knobs, Test
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
 * section above. Each entry also carries finders for those two controls (`firstStop`, `lastStop`), which
 * find without moving: "Open sections as you walk" reads them to know a section's first and last setting.
 *
 * Does not: Move the ring across containers. These are plain hops between controls of the one tab
 * body, through `focusInTabBody`, which plans the pane's place first so the browser's own scroll on
 * focus never jumps it (useTabBodyFocusScroll.ts). The section lines move by Steam's own transfer
 * (FoldedSection.tsx).
 */
import { useCallback, useMemo, useRef } from "react";

import { registerModalReturnFocusOwner } from "../../shared/dpad/modalReturnFocusRegistry";
import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import { plainHop } from "../../shared/dpad/lostFocusHop";

/**
 * Focus `el` the way this tab always has (`focusInTabBody`). False only while the panel's page has lost the
 * browser's focus and Steam's ring did not follow: the section line or control then declines the press and
 * Steam's own step down the column moves the ring (plan 97, lostFocusHop.ts; FoldedSection.tsx).
 */
function hopInTabBody(el: HTMLElement): boolean {
  return plainHop(el, "ollama-tab", () => focusInTabBody(el));
}
import type { FoldChainSection } from "../folded-tabs/FoldedSection";

/**
 * The first matching stop inside one row's own container, or null when the row is not on screen or has none. The
 * query is scoped to the element handed in (a ref the row registered), never the page: under Decky the global
 * document is the wrong one. It only finds; nothing moves (the walk's rule reads it, autoFold.ts).
 */
function firstStopIn(host: HTMLElement | null, selector: string): HTMLElement | null {
  if (!host) return null;
  // focus-patterns-allow: element-scoped query on the row's own ref, the sanctioned pattern (it moved here from OllamaTab.tsx unchanged).
  return host.querySelector<HTMLElement>(selector);
}

/**
 * Give focus to the first matching stop inside one row's own container. Returns false, leaving focus alone, when the
 * row is not on screen or has no stop, so the caller can let Steam's own move carry on.
 */
function focusFirstStopIn(host: HTMLElement | null, selector: string): boolean {
  const target = firstStopIn(host, selector);
  return target ? hopInTabBody(target) : false;
}

/** Hop onto what `find` finds; false when it finds nothing. */
function hopOnto(find: () => HTMLElement | null): boolean {
  const target = find();
  return target ? hopInTabBody(target) : false;
}

const ANY_STOP = "[tabindex], button, input";
const KNOB = "[tabindex], button";

/** The tab's row refs and its hop helpers, as OllamaTab.tsx used to declare them itself. */
export function useOllamaTabFocus() {
  const latencyWarningThumbHostRef = useRef<HTMLDivElement>(null);
  const ollamaKeepAliveThumbHostRef = useRef<HTMLDivElement>(null);
  const kbToggleHostRef = useRef<HTMLDivElement>(null);
  const kbDownloadBtnRef = useRef<HTMLButtonElement>(null);
  const kbRemoveBtnRef = useRef<HTMLButtonElement>(null);
  const kbCancelBtnRef = useRef<HTMLButtonElement>(null);
  const kbLoweredClearBtnRef = useRef<HTMLButtonElement>(null);
  const connectionTestBtnRef = useRef<HTMLButtonElement>(null);
  const replyVerbosityThumbHostRef = useRef<HTMLDivElement>(null);
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

  /*
   * The finders: each section's first and last control, found inside its row's own ref without moving anything.
   * The hops below are "find, then hop"; the walk's rule (autoFold.ts) uses the finders alone.
   */
  const findOllamaKeepAliveThumb = useCallback(() => firstStopIn(ollamaKeepAliveThumbHostRef.current, KNOB), []);
  const findKbToggle = useCallback(() => firstStopIn(kbToggleHostRef.current, ANY_STOP), []);
  const findReplyVerbosityThumb = useCallback(() => firstStopIn(replyVerbosityThumbHostRef.current, KNOB), []);
  // Element-scoped query on the row's own ref — never a global document.querySelector,
  // which under Decky searches a 14-element shell rather than the plugin's DOM.
  const findThinkingEffortRow = useCallback(() => firstStopIn(thinkingEffortHostRef.current, "button:not([disabled])"), []);
  /*
   * The knowledge base's last control, for Up from the Reply style line. Cancel is checked before the two buttons
   * because it only exists while a download runs, and during one both of them are disabled — focusing either would
   * be a no-op. The "Lowered notes" row's Clear sits under that row, nearest the Reply style line, so it comes first.
   */
  const findKbLast = useCallback(
    (): HTMLElement | null =>
      kbLoweredClearBtnRef.current ?? kbCancelBtnRef.current ?? kbDownloadBtnRef.current ?? kbRemoveBtnRef.current ?? findKbToggle(),
    [findKbToggle],
  );
  /*
   * Where AI runs' last control, for Up from the next line: Test connection. When it is greyed (a test or a
   * setup running) it still takes the ring on the Deck, so it is no use asking the button; the ring lands
   * on it and its own Up (Where AI runs, `handleMoveUpFromConnection`) goes on to Cancel or Browse by the
   * plugin's own state.
   */
  const findConnectionTestBtn = useCallback((): HTMLElement | null => connectionTestBtnRef.current, []);
  /* Where AI runs' first control (Run AI on this Deck), for Down from its line. */
  const findWhereFirst = useCallback(() => firstStopIn(whereBodyRef.current, "[tabindex], button:not([disabled]), input"), []);
  const findCustomTimeoutsToggle = useCallback(() => firstStopIn(customTimeoutsHostRef.current, ANY_STOP), []);
  const findModelsBtn = useCallback((): HTMLElement | null => modelsBtnRef.current, []);

  const focusOllamaKeepAliveThumb = useCallback(() => hopOnto(findOllamaKeepAliveThumb), [findOllamaKeepAliveThumb]);
  const focusLatencyWarningThumb = useCallback((): boolean => focusFirstStopIn(latencyWarningThumbHostRef.current, KNOB), []);
  const focusKbToggle = useCallback(() => hopOnto(findKbToggle), [findKbToggle]);
  const focusReplyVerbosityThumb = useCallback(() => hopOnto(findReplyVerbosityThumb), [findReplyVerbosityThumb]);
  const focusThinkingEffortRow = useCallback(() => hopOnto(findThinkingEffortRow), [findThinkingEffortRow]);
  const focusKbUpFromReplyVerbosity = useCallback(() => hopOnto(findKbLast), [findKbLast]);
  const focusConnectionTestBtn = useCallback(() => hopOnto(findConnectionTestBtn), [findConnectionTestBtn]);
  const focusWhereFirst = useCallback(() => hopOnto(findWhereFirst), [findWhereFirst]);
  const focusCustomTimeoutsToggle = useCallback(() => hopOnto(findCustomTimeoutsToggle), [findCustomTimeoutsToggle]);
  const focusModelsBtn = useCallback(() => hopOnto(findModelsBtn), [findModelsBtn]);

  /* The five sections in order, with each one's first and last control: the folded tab's D-pad chain. */
  const chain = useMemo<FoldChainSection[]>(
    () => [
      { id: "where", enterFromTop: focusWhereFirst, enterFromBottom: focusConnectionTestBtn, firstStop: findWhereFirst, lastStop: findConnectionTestBtn },
      { id: "kb", enterFromTop: focusKbToggle, enterFromBottom: focusKbUpFromReplyVerbosity, firstStop: findKbToggle, lastStop: findKbLast },
      {
        id: "reply",
        enterFromTop: focusReplyVerbosityThumb,
        enterFromBottom: focusThinkingEffortRow,
        firstStop: findReplyVerbosityThumb,
        lastStop: findThinkingEffortRow,
      },
      {
        id: "tuning",
        enterFromTop: focusCustomTimeoutsToggle,
        enterFromBottom: focusOllamaKeepAliveThumb,
        firstStop: findCustomTimeoutsToggle,
        lastStop: findOllamaKeepAliveThumb,
      },
      { id: "models", enterFromTop: focusModelsBtn, enterFromBottom: focusModelsBtn, firstStop: findModelsBtn, lastStop: findModelsBtn },
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
      findConnectionTestBtn,
      findCustomTimeoutsToggle,
      findKbLast,
      findKbToggle,
      findModelsBtn,
      findOllamaKeepAliveThumb,
      findReplyVerbosityThumb,
      findThinkingEffortRow,
      findWhereFirst,
    ],
  );

  return {
    latencyWarningThumbHostRef,
    ollamaKeepAliveThumbHostRef,
    kbToggleHostRef,
    kbDownloadBtnRef,
    kbRemoveBtnRef,
    kbCancelBtnRef,
    kbLoweredClearBtnRef,
    connectionTestBtnRef,
    replyVerbosityThumbHostRef,
    whereBodyRef,
    customTimeoutsHostRef,
    modelsBtnRef,
    setThinkingEffortHost,
    focusOllamaKeepAliveThumb,
    focusLatencyWarningThumb,
    focusKbToggle,
    focusReplyVerbosityThumb,
    focusThinkingEffortRow,
    focusKbUpFromReplyVerbosity,
    focusCustomTimeoutsToggle,
    chain,
  };
}
