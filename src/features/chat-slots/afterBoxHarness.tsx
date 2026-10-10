/**
 * Title: Decky's boxes and the plugin's rebuild, for the "after a Delete box" tests
 * Purpose: Draws what the Deck draws around a Decky box and nothing less: Decky's title bar (its back
 *          arrow, then bonsAI's name row) as one tree; the plugin's own screen as another, built the way
 *          index.tsx builds it (the plugin shell's session note, the real chat list hook, the real restore
 *          that runs when the screen comes back, the real Main tab); and a stand-in for `showModal`
 *          that does what Decky does to the screen: the plugin screen is thrown away and a fresh one
 *          built in its place, either as the box opens or as it closes (the Deck has not shown which,
 *          so a test runs both). Steam's ring moves only by Steam's own transfer
 *          (test-harness/steamRing.tsx).
 * Used for: afterDeleteRebuild.test.tsx only. Not part of the plugin.
 * Solves: The tests that passed one step from the screen all left the plugin standing while a box was
 *         open. The Deck rebuilds it, and the chat that should be open afterwards was lost in the gap.
 * Does not: Draw the question box (a single stop stands in for it), the answer, or any other tab.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { act, render } from "@testing-library/react";

import { MainTab } from "../../components/MainTab";
import { baseMainTabProps } from "../chat-title/chatTitleTestFixtures";
import { ChatTitleView } from "../chat-title/ChatTitleView";
import { setChatTitleTab } from "../chat-title/chatTitleStore";
import { useChatSlots } from "../../hooks/useChatSlots";
import { useBonsaiPluginShell } from "../../hooks/useBonsaiPluginShell";
import { buildInitialSessionSnapshot } from "../plugin-shell/initialSessionSnapshot";
import { useSessionRestoreAfterRemount } from "../plugin-shell/useSessionRestoreAfterRemount";
import { useChatSlotActivityState } from "../plugin-shell/useChatSlotActivityState";
import { peekBonsaiSessionPendingRestore } from "../../utils/bonsaiSessionSurvival";
import { registerNavFocus, unregisterNavFocus, type NavRefHolder } from "../../utils/navFocusRegistry";
import { SteamRingFocusable, putSteamRingOn, steamRingHolder } from "../../test-harness/steamRing";
import type { AskThreadCollapsedTurn, AskThreadExpandedTurnKey } from "../../types/bonsaiUi";

const noop = () => undefined;

/** The plugin's own screen, as index.tsx builds it, down to the parts a Delete box touches. */
function PluginScreen() {
  const { activeSlotIdRef } = useChatSlotActivityState();
  const [collapsed, setCollapsed] = useState<AskThreadCollapsedTurn[]>(
    () => peekBonsaiSessionPendingRestore()?.askThreadCollapsed ?? [],
  );
  const [displayQuestion, setDisplayQuestion] = useState("");
  const [expanded, setExpanded] = useState<AskThreadExpandedTurnKey>("live");
  const sessionSnapshotRef = useRef<() => ReturnType<typeof buildInitialSessionSnapshot>>(buildInitialSessionSnapshot);
  const shell = useBonsaiPluginShell({ getSessionSnapshot: () => sessionSnapshotRef.current() });
  const chatSlots = useChatSlots({
    activeSlotIdRef,
    initialActiveSlotId: activeSlotIdRef.current,
    setAskThreadCollapsed: setCollapsed,
    setAskThreadDisplayQuestion: setDisplayQuestion,
    setExpandedTurnKey: setExpanded,
  });
  useEffect(() => {
    void chatSlots.refreshSummaries();
  }, [chatSlots.refreshSummaries]);
  sessionSnapshotRef.current = () => ({
    ...buildInitialSessionSnapshot(),
    currentTab: shell.currentTab,
    askThreadCollapsed: collapsed,
    askThreadDisplayQuestion: displayQuestion,
    expandedTurnKey: expanded,
    activeSlotId: chatSlots.activeSlotId,
  });
  /* What comes back from the note: the thread the screen showed when the box opened. */
  const restoreSessionSnapshot = useCallback((s: ReturnType<typeof buildInitialSessionSnapshot>) => {
    setCollapsed(s.askThreadCollapsed);
    setDisplayQuestion(s.askThreadDisplayQuestion);
    setExpanded(s.expandedTurnKey);
  }, []);
  useSessionRestoreAfterRemount({
    pluginDataClearSeenRef: useRef(0),
    pendingSessionRestoreFinalizeRef: useRef(false),
    activeSlotIdRef,
    chatSlots,
    setCurrentTab: shell.setCurrentTab,
    setUnifiedInput: noop,
    setNavigationMessage: noop,
    restoreScreenshotBrowserSnapshot: noop,
    restorePluginHelpDismissed: noop,
    setOllamaIp: noop,
    hydrateFromSettings: noop,
    restoreSessionSnapshot,
  } as never);
  return (
    <>
      <div data-testid="thread">{collapsed.map((t) => t.question).join(" | ")}</div>
      <MainTab
        {...baseMainTabProps()}
        chatSlotSummaries={chatSlots.summaries}
        activeChatSlotId={chatSlots.activeSlotId}
        askThreadCollapsed={collapsed}
        askThreadDisplayQuestion={displayQuestion}
        expandedTurnKey={expanded}
        onChatSlotCreate={chatSlots.createSlot}
        onChatSlotSelect={chatSlots.selectSlot}
        onChatSlotDelete={chatSlots.deleteSlot}
        onChatSlotRename={chatSlots.renameSlot}
        onBeforeNestedDeckyModal={shell.captureSessionBeforeModal}
        onCompleteNestedDeckyModalClose={shell.finalizeShowModalAndRestoreActiveTab}
      />
      <QuestionBoxStop />
    </>
  );
}

/**
 * The question box, as one stop Steam can transfer onto (Down from the name lands here on an empty chat). It
 * comes after the Main tab so that its registration is the one that stays: the fake text field cannot take a
 * transfer, and this is the one thing the harness stands in for.
 */
function QuestionBoxStop() {
  const navRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    const holder = navRef as NavRefHolder;
    registerNavFocus("unified-input", holder);
    return () => unregisterNavFocus("unified-input", holder);
  }, []);
  return (
    <SteamRingFocusable aria-label="Question box" navRef={navRef} focusable>
      question box
    </SteamRingFocusable>
  );
}

/** When Decky throws the plugin screen away and builds a fresh one. */
export type RebuildWhen = "as the box opens" | "as the box closes";

/** Decky: the title bar's tree, the plugin screen's tree, and `showModal`'s effect on the second. */
export class DeckyWorld {
  readonly modals: React.ReactElement[] = [];
  readonly title: HTMLElement;
  /** The plugin screen's page element; a fresh one for every build, as Decky puts a fresh copy back. */
  screen!: HTMLElement;
  readonly arrow: HTMLElement;
  /** How many fresh copies of the plugin screen have been built, the first included. */
  builds = 0;
  private unmountScreen: (() => void) | null = null;
  private titleUnmount: () => void;
  private open = 0;

  constructor(private readonly when: RebuildWhen) {
    setChatTitleTab("main");
    const t = render(
      <div data-testid="decky-title">
        <button className="DialogButton" aria-label="Back">
          &larr;
        </button>
        <ChatTitleView />
      </div>,
    );
    this.title = t.container;
    this.arrow = t.container.querySelector<HTMLElement>("button.DialogButton")!;
    this.titleUnmount = t.unmount;
    this.buildScreen();
  }

  private buildScreen(): void {
    this.builds += 1;
    this.screen = document.body.appendChild(document.createElement("div"));
    act(() => {
      const r = render(<PluginScreen />, { container: this.screen });
      this.unmountScreen = r.unmount;
    });
  }

  private throwScreenAway(): void {
    act(() => this.unmountScreen?.());
    this.unmountScreen = null;
    this.screen.remove();
  }

  /** `showModal`: the box is shown, and the screen is rebuilt now or on close, as `when` says. */
  showBox(el: React.ReactElement): { Close: () => void } {
    this.modals.push(el);
    this.open += 1;
    if (this.when === "as the box opens" && this.unmountScreen) this.throwScreenAway();
    let closed = false;
    return {
      Close: () => {
        if (closed) return;
        closed = true;
        this.open -= 1;
        if (this.open > 0) return;
        if (this.unmountScreen) this.throwScreenAway();
        this.buildScreen();
        /* Steam lands the ring itself as the box goes (on the arrow, as the Deck measured). */
        putSteamRingOn(this.arrow);
      },
    };
  }

  /** The newest box shown. */
  get box(): React.ReactElement {
    return this.modals[this.modals.length - 1]!;
  }

  q<T extends HTMLElement = HTMLElement>(sel: string): T {
    return this.title.querySelector<T>(sel) as T;
  }

  /** What a person would say the ring is on. */
  ringIs(): string {
    const ring = steamRingHolder();
    if (!ring) return "nothing";
    if (ring === this.arrow) return "Decky's back arrow";
    if (ring === this.q(".bonsai-chat-title__name")) return "the chat's name";
    if (ring === this.q(".bonsai-chat-title__icon--delete")) return "the delete icon";
    if (ring === this.q(".bonsai-chat-title__icon--new")) return "the + icon";
    return ring.getAttribute("aria-label") ?? "something else";
  }

  /** The chat's name as the name row says it, or null when the row is not drawn (Decky's plain "bonsAI"). */
  nameShown(): string | null {
    const el = this.q(".bonsai-chat-title__name");
    return el ? (el.getAttribute("aria-label") ?? "") : null;
  }

  threadShown(): string {
    return this.screen.querySelector('[data-testid="thread"]')?.textContent ?? "";
  }

  dispose(): void {
    if (this.unmountScreen) this.throwScreenAway();
    this.titleUnmount();
    this.screen.remove();
  }
}
