/**
 * Title: Down from the tab bar on Main lands on the "N earlier" line whenever it is drawn (plan 79)
 * Purpose: Pin the merge of the day-lines feature with the Down-into-the-chat fix, on the route plan 84
 *          step 5 left: with the saved-chats row gone, Down from the tab bar enters the chat itself
 *          (index.tsx's `tabBarExitDown`, through the Main tab's own action in the chat title store).
 *          With two or more earlier questions the chat's first stop is the "N earlier" line, opened or
 *          closed, and Down must land on it -- never jump past it or a day line into a question, even
 *          when the first day is open and its first question is drawn. With no line (fewer than two
 *          earlier questions) the first question's text stays the target (MainTab.tabBarDownRetry).
 * Used for: MainTab.tsx, takeFirstChatStop.ts and chatTranscriptNavHelpers.ts together -- the real Main tab.
 * Solves: Presses D-pad Down on the real rendered page after opening the line and a day with A. A press
 *         a plugin handler claims runs that handler, as Steam does; the test also asks whether the tab
 *         bar's Down claimed the press, since an unclaimed one is Steam's guess, not the plugin's.
 * Does not: Walk the rows below; MainTabChatTranscript.earlierByDay.test.tsx does.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { MainTab } from "./MainTab";
import type { MainTabProps } from "./MainTab";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { TransparencySnapshot } from "../utils/inputTransparency";
import { resetUiDocument } from "../utils/uiDocument";
import { resetChatTitleStore, takeChatFirstStop } from "../features/chat-title/chatTitleStore";

type Dir = "Up" | "Down" | "Left" | "Right";
type NavHandlers = Partial<Record<`onMove${Dir}` | "onActivate", () => unknown>>;
type NavEl = HTMLElement & { __nav?: NavHandlers };

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  const Base = stubs.Focusable;
  /* Keeps the four move handlers on the element and gives `navRef` Steam's TakeFocus: the ring goes
     to the container's first live child (or the container itself when it is a stop). */
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
    function NavFocusable(props, ref) {
      const { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, onActivate, navRef, ...rest } = props as Record<string, unknown> &
        NavHandlers & { navRef?: { current: unknown } };
      const setRef = (el: HTMLDivElement | null) => {
        if (el) {
          (el as NavEl).__nav = { onMoveUp, onMoveDown, onMoveLeft, onMoveRight, onActivate };
          if (navRef) {
            navRef.current = {
              TakeFocus: () => {
                const first = el.querySelector<HTMLElement>("button:not([disabled]), [tabindex]");
                (first ?? el).focus();
                return true;
              },
            };
          }
        }
        if (typeof ref === "function") ref(el);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      };
      return <Base {...rest} ref={setRef} />;
    },
  );
  return { ...stubs, Focusable: NavFocusable };
});

const ANSWER = ["First paragraph of the answer.", "Second paragraph of the answer."].join("\n\n");
const QUESTION = "what is a good first upgrade in Hollow Knight";

function snapshot(): TransparencySnapshot {
  return {
    route: "ollama",
    raw_question: "q",
    sanitizer_action: "none",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "q",
    ollama_model: "llama3:8b",
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: ANSWER,
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 1.2,
    context_chips: [],
    ask_diagnostics: null,
  } as TransparencySnapshot;
}

const NOW = new Date(2026, 9, 2, 12, 0, 0);
const at = (month: number, day: number, hour: number) => new Date(2026, month, day, hour).getTime() / 1000;

function turn(id: string, question: string, createdAt?: number): AskThreadCollapsedTurn {
  return { id, question, answer: ANSWER, transparency: snapshot(), createdAt };
}

/** Three on Monday 28 Sep, two yesterday, then the newest today: five earlier questions. */
const TURNS = [
  turn("a1", "monday one", at(8, 28, 9)),
  turn("a2", "monday two", at(8, 28, 10)),
  turn("a3", "monday three", at(8, 28, 11)),
  turn("b1", "yesterday one", at(9, 1, 9)),
  turn("b2", "yesterday two", at(9, 1, 10)),
  turn("n1", QUESTION, at(9, 2, 9)),
];

function activate(el: HTMLElement): void {
  act(() => {
    (el as NavEl).__nav?.onActivate?.();
  });
  document.querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]').forEach((f) => f.setAttribute("tabindex", "0"));
}

function line(container: HTMLElement, text: string): HTMLElement {
  const found = Array.from(container.querySelectorAll<HTMLElement>(".bonsai-chat-earlier-pill-row")).find(
    (el) => el.querySelector(".bonsai-chat-earlier-pill")?.textContent === text,
  );
  if (!found) throw new Error(`no line reads "${text}"`);
  return found;
}

function renderMainTab(turns: AskThreadCollapsedTurn[], open: string) {
  const props = {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {},
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: turns,
    expandedTurnKey: open,
    askThreadDisplayQuestion: "",
    lastExchange: { question: "q", answer: ANSWER },
    transparencySnapshot: snapshot(),
    liveReplyFeedbackRating: "up",
    onReplyFeedback: () => {},
    onReplyMicroAction: () => {},
    onAskOllama: async () => {},
    onTurnActivate: () => {},
    onRetryLastResponse: () => {},
    chatSlotSummaries: [{ id: "s1", label: "Hollow Knight", created_at: 0, updated_at: 0 }],
    activeChatSlotId: "s1",
    onChatSlotCreate: async () => undefined,
    onChatSlotSelect: async () => undefined,
    onChatSlotRename: async () => true,
    onChatSlotDelete: async () => true,
    suggestedPrompts: [],
    filteredSettings: [],
    recentScreenshots: [],
  } as unknown as MainTabProps;
  const out = render(<MainTab {...props} />);
  /* Decky stamps tabindex="0" on the nodes Steam navigates. */
  out.container
    .querySelectorAll<HTMLElement>('[data-decky-ui="Focusable"]')
    .forEach((el) => el.setAttribute("tabindex", "0"));
  return out;
}

/** The controls the ring can sit on: the stops Steam walks, not the containers around them. */
const STOP_SELECTOR = [
  "button:not([disabled])",
  ".bonsai-chat-earlier-pill-row",
  ".bonsai-chat-turn-row-header:not(.bonsai-chat-turn-row-header--with-retry)",
  ".bonsai-chat-turn-row-body",
  ".bonsai-answer-stop",
  ".bonsai-chat-reasoning-fold",
].join(", ");

function isRetry(el: Element | null): boolean {
  return Boolean(el?.matches?.('[aria-label="Retry same prompt"]'));
}

function nameOf(el: Element | null): string {
  if (!el) return "nothing";
  const h = el as HTMLElement;
  if (isRetry(h)) return "RETRY";
  if (h.classList.contains("bonsai-chat-earlier-pill-row")) return `line:${h.querySelector(".bonsai-chat-earlier-pill")?.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-body")) return `question:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-turn-row-header")) return `header:${h.textContent}`;
  if (h.classList.contains("bonsai-chat-reasoning-fold")) return "reasoning-line";
  if (h.classList.contains("bonsai-answer-stop")) return `answer:${h.textContent?.slice(0, 12)}`;
  return h.getAttribute("aria-label") ?? h.textContent?.trim() ?? h.className;
}

/** The row Steam never steps sideways inside on a vertical press. */
function rowOf(el: Element | null): Element | null {
  return el?.closest?.(".bonsai-chat-turn-row-header--with-retry") ?? null;
}

/**
 * One press: the focused element's move handler first, then each containing Focusable's, until one
 * claims it. An unclaimed Up/Down is Steam's own move, modelled as above (a row is entered on its
 * first control from above, its last from below). An unclaimed Left/Right does nothing.
 */
function press(container: HTMLElement, dir: Dir): boolean {
  const key = `onMove${dir}` as const;
  let el = document.activeElement as NavEl | null;
  const start = document.activeElement;
  let claimed = false;
  act(() => {
    while (el) {
      const h = el.__nav?.[key];
      if (h && h() === true) {
        claimed = true;
        return;
      }
      el = el.parentElement as NavEl | null;
    }
  });
  if (claimed) return true;
  if (dir === "Left" || dir === "Right") return false;
  const all = Array.from(container.querySelectorAll<HTMLElement>(STOP_SELECTOR));
  const here = all.indexOf(start as HTMLElement);
  if (here < 0) return false;
  const from = rowOf(start);
  const rest = dir === "Down" ? all.slice(here + 1) : all.slice(0, here).reverse();
  const candidates = rest.filter((c) => !from || rowOf(c) !== from);
  if (!candidates.length) return false;
  let target = candidates[0]!;
  const entered = rowOf(target);
  if (entered && dir === "Up") {
    const inRow = candidates.filter((c) => rowOf(c) === entered);
    target = inRow[inRow.length - 1]!;
  }
  act(() => target.focus());
  return true;
}

/** Up to `cap` presses of `dir`, returning every landing in order (stops when nothing moves). */
function walk(container: HTMLElement, dir: "Up" | "Down", cap: number): string[] {
  const seen: string[] = [nameOf(document.activeElement)];
  for (let i = 0; i < cap; i += 1) {
    const before = document.activeElement;
    if (!press(container, dir) || document.activeElement === before) break;
    seen.push(nameOf(document.activeElement));
  }
  return seen;
}

describe("Down from the tab bar lands on the 'N earlier' line (plan 79, plan 84 step 5)", () => {
  beforeEach(() => {
    resetUiDocument();
    resetChatTitleStore();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /** The tab bar's Down on Main (what `tabBarExitDown` calls): true only when the plugin placed the ring. */
  function tabBarClaimsDown(): boolean {
    let claimed = false;
    act(() => {
      claimed = takeChatFirstStop();
    });
    return claimed;
  }

  it("closed: Down from the tab bar takes the line itself", () => {
    renderMainTab(TURNS, "n1");
    expect(tabBarClaimsDown()).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:5 earlier");
  });

  it("opened with the first day open and its first question drawn: still the line, not that question", () => {
    const { container } = renderMainTab(TURNS, "n1");
    activate(line(container, "5 earlier"));
    activate(line(container, "Mon 28 Sep · 3"));
    expect(container.textContent).toContain("monday one");
    expect(tabBarClaimsDown()).toBe(true);
    expect(nameOf(document.activeElement)).toBe("line:5 earlier");
  });

  it("walks Down from the tab bar over the line and the day lines, never onto Retry or a question out of order", () => {
    const { container } = renderMainTab(TURNS, "n1");
    activate(line(container, "5 earlier"));
    expect(tabBarClaimsDown()).toBe(true);
    const down = ["tab-bar", ...walk(container, "Down", 8)];
    expect(down.slice(0, 5)).toEqual([
      "tab-bar",
      "line:5 earlier",
      "line:Mon 28 Sep · 3",
      "line:Yesterday · 2",
      `question:${QUESTION}`,
    ]);
    expect(down).not.toContain("RETRY");
  });

  it("with fewer than two earlier questions there is no line and the first question's text is the target", () => {
    const { container } = renderMainTab([turn("t1", QUESTION, at(9, 2, 9))], "t1");
    expect(container.querySelector(".bonsai-chat-earlier-pill-row")).toBeNull();
    expect(tabBarClaimsDown()).toBe(true);
    expect(nameOf(document.activeElement)).toBe(`question:${QUESTION}`);
  });
});
