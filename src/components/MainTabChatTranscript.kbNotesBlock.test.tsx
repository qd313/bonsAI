/**
 * Title: The "From the notes" block
 * Purpose: Pin the block plan 58 phase 1 adds under a reply that used a note or a shared tip:
 *          closed by default, the header naming the note and where it came from in the three
 *          wordings the plan sets, the note's own words kept as lines when opened, and the block
 *          staying off a reply with nothing attached or one still hidden behind its own spoiler.
 * Used for: MainTabChatTranscript.tsx.
 * Does not: Prove any of it on the device, or prove the live-before-completion wiring end to
 *           end — that still needs one line in main.py outside this lane's file list (see
 *           MainTabChatTranscriptProps.liveKbAttachedNotes's own doc comment). This file proves
 *           the screen side is ready for it: given the same shape a poll would carry, the block
 *           renders before the reply is done.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import {
  MainTabChatTranscript,
  focusKbNotesBlock,
  focusUpPastLiveKbNotesBlock,
} from "./MainTabChatTranscript";
import type { MainTabChatTranscriptProps } from "./MainTabChatTranscript";
import { resetSpoilerFenceOpenCountForTests } from "./MainTabBonsaiAiMarkdownChunk";
import type { AskThreadCollapsedTurn } from "../types/bonsaiUi";
import type { KbAttachedNote } from "../utils/inputTransparency";

vi.mock("@decky/ui", async () => import("../test-harness/fakeDeckyUi"));

function note(overrides: Partial<KbAttachedNote> = {}): KbAttachedNote {
  return {
    name: "Starting out in Pikmin 2",
    kind: "mechanic",
    card: "There is no day limit this time.",
    trust_tier: "wiki_verified",
    source_host: "www.pikminwiki.com",
    source_license: "CC-BY-SA-4.0",
    domain: "strategy",
    game_title: "Pikmin 2",
    ...overrides,
  };
}

function baseProps(overrides: Partial<MainTabChatTranscriptProps> = {}): MainTabChatTranscriptProps {
  return {
    fullBleedRowStyle: {},
    isAsking: false,
    selectedAttachment: null,
    ollamaContext: {} as MainTabChatTranscriptProps["ollamaContext"],
    unifiedInput: "",
    showSlowWarning: false,
    latencyWarningSeconds: 30,
    ollamaResponse: "",
    elapsedSeconds: null,
    lastApplied: null,
    canSaveDesktopNote: false,
    onOpenDesktopNoteSave: () => {},
    askMode: "strategy",
    askThreadCollapsed: [],
    expandedTurnKey: null,
    askThreadDisplayQuestion: "",
    lastExchange: null,
    ...overrides,
  };
}

function archivedTurnProps(
  turn: AskThreadCollapsedTurn,
  overrides: Partial<MainTabChatTranscriptProps> = {}
): MainTabChatTranscriptProps {
  return baseProps({
    askThreadCollapsed: [turn],
    expandedTurnKey: turn.id,
    ...overrides,
  });
}

function block(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".bonsai-kb-notes-block");
}

describe("the block on an archived reply", () => {
  it("shows one line closed by default, naming the note and a wiki by everyday name", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "is there a day limit in pikmin 2",
      answer: "Yes, Pikmin 2 keeps the day limit from the first game.",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note()],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    const el = block(container);
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain("Starting out in Pikmin 2");
    expect(el?.textContent).toContain("From the Pikmin wiki");
    // Closed: the note's own words are not on screen yet.
    expect(el?.textContent).not.toContain("There is no day limit");
  });

  it("opens on a press, showing the note's own words, and closes again on a second press", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "is there a day limit in pikmin 2",
      answer: "Yes, Pikmin 2 keeps the day limit from the first game.",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note()],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    fireEvent.click(block(container) as HTMLElement);
    expect(block(container)?.textContent).toContain("There is no day limit this time.");

    fireEvent.click(block(container) as HTMLElement);
    expect(block(container)?.textContent).not.toContain("There is no day limit");
  });

  it("does not render at all when nothing was attached", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: false, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    expect(block(container)).toBeNull();
  });

  it("does not render on a turn saved before this field existed", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    expect(block(container)).toBeNull();
  });
});

describe("the header's three source wordings", () => {
  function withNote(n: Partial<KbAttachedNote>) {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note(n)],
      },
    };
    return render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
  }

  it("names a known wiki host by its everyday name", () => {
    const { container } = withNote({ source_host: "hollowknight.wiki", name: "Broken Vessel" });
    expect(block(container)?.textContent).toContain("From the Hollow Knight wiki");
  });

  it("still credits an unlisted host by its address", () => {
    const { container } = withNote({ source_host: "example.fandom.com" });
    expect(block(container)?.textContent).toContain("From example.fandom.com");
  });

  it("says there is no source when the note has none", () => {
    const { container } = withNote({ source_host: "", name: "Exploder", domain: "strategy" });
    expect(block(container)?.textContent).toContain("From bonsAI's own note");
  });

  it("names a shared tip separately from a strategy note, even with no source_host", () => {
    const { container } = withNote({ source_host: "", domain: "compat", name: "proton" });
    expect(block(container)?.textContent).toContain("From the shared Deck tips");
    expect(block(container)?.textContent).not.toContain("no source");
  });
});

describe("labelled lines", () => {
  it("keeps Summary / Weak points / Tips as separate lines, labels bolded", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [
          note({
            name: "Exploder",
            domain: "strategy",
            source_host: "",
            card:
              "Summary: Large orange glyphids that walk into you and detonate in a wide blast.\n" +
              "Weak points: Fragile, and the blasts chain, so one popped early clears the group behind it.\n" +
              "Tips: Weapons fire themselves, so it dies where you stand - keep distance.",
          }),
        ],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    fireEvent.click(block(container) as HTMLElement);
    const bolds = Array.from(block(container)?.querySelectorAll("b") ?? []).map((b) => b.textContent);
    expect(bolds).toContain("Summary:");
    expect(bolds).toContain("Weak points:");
    expect(bolds).toContain("Tips:");
    expect(block(container)?.textContent).toContain(
      "Fragile, and the blasts chain, so one popped early clears the group behind it."
    );
  });
});

describe("several notes attached to one reply", () => {
  it("names the first in the closed header, with a count of the rest, and lists each name when open", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [
          note({ name: "False Knight", card: "The armoured maggot." }),
          note({ name: "Hornet in Greenpath", card: "The fight for the dash." }),
        ],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    expect(block(container)?.textContent).toContain("False Knight");
    expect(block(container)?.textContent).toContain("(+1 more)");
    fireEvent.click(block(container) as HTMLElement);
    expect(block(container)?.textContent).toContain("Hornet in Greenpath");
    expect(block(container)?.textContent).toContain("The fight for the dash.");
  });
});

describe("a fenced reply", () => {
  beforeEach(() => {
    resetSpoilerFenceOpenCountForTests();
  });

  it("does not render the block while the reply's own spoiler cover has not been opened", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "what should i know about the boss that looks like me",
      answer: "```bonsai-spoiler\nThat's Broken Vessel.\n```",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note({ name: "Broken Vessel", source_host: "hollowknight.wiki" })],
      },
    };
    const { container } = render(
      <MainTabChatTranscript {...archivedTurnProps(turn, { strategySpoilerMaskingEnabled: true })} />
    );
    expect(block(container)).toBeNull();
  });

  it("renders normally once masking is off, even with the same fence text", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "```bonsai-spoiler\nThat's Broken Vessel.\n```",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note({ name: "Broken Vessel", source_host: "hollowknight.wiki" })],
      },
    };
    const { container } = render(
      <MainTabChatTranscript {...archivedTurnProps(turn, { strategySpoilerMaskingEnabled: false })} />
    );
    expect(block(container)).not.toBeNull();
  });

  it("shows the block, still closed itself, once the person opens the spoiler cover", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "what should i know about the boss that looks like me",
      answer: "```bonsai-spoiler\nThat's Broken Vessel.\n```",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note({ name: "Broken Vessel", source_host: "hollowknight.wiki", card: "The infected husk shaped like you." })],
      },
    };
    const { container } = render(
      <MainTabChatTranscript {...archivedTurnProps(turn, { strategySpoilerMaskingEnabled: true })} />
    );
    expect(block(container)).toBeNull();

    const revealButton = container.querySelector(".bonsai-spoiler-reveal-target button");
    expect(revealButton).not.toBeNull();
    fireEvent.click(revealButton as HTMLElement);

    // The block itself is closed by default (KB_NOTES_BLOCK_OPEN_BY_DEFAULT), same as any
    // unfenced reply — only its *availability* depended on the cover.
    expect(block(container)).not.toBeNull();
    expect(block(container)?.textContent).toContain("Broken Vessel");
    expect(block(container)?.textContent).not.toContain("The infected husk shaped like you.");
  });

  it("hides the block again if the person closes the spoiler cover back up", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "```bonsai-spoiler\nThat's Broken Vessel.\n```",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note({ name: "Broken Vessel", source_host: "hollowknight.wiki" })],
      },
    };
    const { container } = render(
      <MainTabChatTranscript {...archivedTurnProps(turn, { strategySpoilerMaskingEnabled: true })} />
    );
    fireEvent.click(container.querySelector(".bonsai-spoiler-reveal-target button") as HTMLElement);
    expect(block(container)).not.toBeNull();

    const hideButton = container.querySelector(".bonsai-spoiler-expanded button");
    expect(hideButton).not.toBeNull();
    fireEvent.click(hideButton as HTMLElement);
    expect(block(container)).toBeNull();
  });
});

describe("the live turn, before the reply is done", () => {
  it("shows the block from liveKbAttachedNotes while still asking, before transparencySnapshot exists", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          isAsking: true,
          expandedTurnKey: "live",
          askThreadDisplayQuestion: "is there a day limit in pikmin 2",
          ollamaResponse: "Yes, Pikmin 2 keeps the day limit from the first game.",
          liveKbAttachedNotes: [note()],
          transparencySnapshot: null,
        })}
      />
    );
    expect(block(container)).not.toBeNull();
    expect(block(container)?.textContent).toContain("Starting out in Pikmin 2");
  });

  it("shows nothing live while asking with no notes yet published", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          isAsking: true,
          expandedTurnKey: "live",
          askThreadDisplayQuestion: "is there a day limit in pikmin 2",
          ollamaResponse: "Yes, Pikmin 2 keeps the day limit from the first game.",
          liveKbAttachedNotes: null,
        })}
      />
    );
    expect(block(container)).toBeNull();
  });

  it("switches to the finished transparency snapshot once the reply completes", () => {
    const { container, rerender } = render(
      <MainTabChatTranscript
        {...baseProps({
          isAsking: true,
          expandedTurnKey: "live",
          askThreadDisplayQuestion: "is there a day limit in pikmin 2",
          ollamaResponse: "Yes, Pikmin 2 keeps the day limit from the first game.",
          liveKbAttachedNotes: [note()],
        })}
      />
    );
    expect(block(container)).not.toBeNull();

    rerender(
      <MainTabChatTranscript
        {...baseProps({
          isAsking: false,
          expandedTurnKey: "live",
          askThreadDisplayQuestion: "is there a day limit in pikmin 2",
          ollamaResponse: "Yes, Pikmin 2 keeps the day limit from the first game.",
          lastExchange: {
            question: "is there a day limit in pikmin 2",
            answer: "Yes, Pikmin 2 keeps the day limit from the first game.",
          },
          liveKbAttachedNotes: [note()],
          transparencySnapshot: {
            route: "ollama",
            raw_question: "",
            sanitizer_action: "",
            sanitizer_reason_codes: [],
            text_after_sanitizer: "",
            ollama_model: null,
            system_prompt: null,
            user_text_for_model: null,
            user_image_count: 0,
            attachment_paths: [],
            assistant_raw: null,
            assistant_after_attachment_format: null,
            final_response: "",
            applied: null,
            success: true,
            app_id: "",
            app_name: "",
            pc_ip: "",
            error_message: "",
            elapsed_seconds: 0,
            kb_attached_notes: [note({ name: "Finished note" })],
          },
        })}
      />
    );
    expect(block(container)?.textContent).toContain("Finished note");
  });
});

function fullTransparencySnapshot(notes: KbAttachedNote[]): MainTabChatTranscriptProps["transparencySnapshot"] {
  return {
    route: "ollama",
    raw_question: "",
    sanitizer_action: "",
    sanitizer_reason_codes: [],
    text_after_sanitizer: "",
    ollama_model: null,
    system_prompt: null,
    user_text_for_model: null,
    user_image_count: 0,
    attachment_paths: [],
    assistant_raw: null,
    assistant_after_attachment_format: null,
    final_response: "",
    applied: null,
    success: true,
    app_id: "",
    app_name: "",
    pc_ip: "",
    error_message: "",
    elapsed_seconds: 0,
    kb_attached_notes: notes,
  };
}

describe("the block is reachable as a real D-pad stop from both directions", () => {
  it("Down: focusing the block by its registered turn key actually lands the DOM focus on it", () => {
    const turn: AskThreadCollapsedTurn = {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: [note()],
      },
    };
    const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
    expect(focusKbNotesBlock("t1")).toBe(true);
    expect(document.activeElement).toBe(block(container));
  });

  it("Up: the session context strip's own Up (and the rows below it) land on the live turn's block", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...baseProps({
          isAsking: false,
          expandedTurnKey: "live",
          askThreadDisplayQuestion: "is there a day limit in pikmin 2",
          ollamaResponse: "Yes, Pikmin 2 keeps the day limit from the first game.",
          lastExchange: {
            question: "is there a day limit in pikmin 2",
            answer: "Yes, Pikmin 2 keeps the day limit from the first game.",
          },
          transparencySnapshot: fullTransparencySnapshot([note()]),
        })}
      />
    );
    expect(focusUpPastLiveKbNotesBlock()).toBe(true);
    expect(document.activeElement).toBe(block(container));
  });

  it("Up: falls through cleanly (no throw, reports unhandled) when the live turn has no block", () => {
    render(
      <MainTabChatTranscript
        {...baseProps({
          isAsking: false,
          expandedTurnKey: "live",
          askThreadDisplayQuestion: "q",
          ollamaResponse: "a",
          lastExchange: { question: "q", answer: "a" },
          transparencySnapshot: fullTransparencySnapshot([]),
        })}
      />
    );
    expect(() => focusUpPastLiveKbNotesBlock()).not.toThrow();
  });
});

describe("the header's name, count and source never share one truncating span", () => {
  /*
   * First Deck rows (NOTES-BLOCK-01/05): on the real 412px column the count or the source's own
   * tail could be the part an ellipsis ate, because both used to live in one shared span. These
   * tests pin the DOM *structure* the fix relies on -- jsdom does no layout, so there is no
   * ellipsis to observe directly, but a count that is not textContent of the same element as the
   * source can never be cut by that element's own overflow rule.
   */
  function turnWith(notes: KbAttachedNote[]): AskThreadCollapsedTurn {
    return {
      id: "t1",
      question: "q",
      answer: "a",
      transparency: {
        route: "ollama",
        success: true,
        context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
        overflow_skips: [],
        kb_attached_notes: notes,
      },
    };
  }

  it("keeps the count out of the source line's own element", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...archivedTurnProps(turnWith([note(), note({ name: "Other note" })]))}
      />
    );
    const el = block(container) as HTMLElement;
    // The count sits beside the name, not inside the line that carries the source phrase.
    const sourceLine = Array.from(el.querySelectorAll("div")).find((d) =>
      (d.textContent || "").startsWith("From ")
    );
    expect(sourceLine?.textContent).not.toContain("more)");
    expect(el.textContent).toContain("(+1 more)");
  });

  it("reads name, then count, then source, in that order in the closed header's own text", () => {
    const { container } = render(
      <MainTabChatTranscript {...archivedTurnProps(turnWith([note(), note()]))} />
    );
    const text = block(container)?.textContent || "";
    const nameAt = text.indexOf("Starting out in Pikmin 2");
    const countAt = text.indexOf("(+1 more)");
    const sourceAt = text.indexOf("From the Pikmin wiki");
    expect(nameAt).toBeGreaterThanOrEqual(0);
    expect(nameAt).toBeLessThan(countAt);
    expect(countAt).toBeLessThan(sourceAt);
  });

  it("capitalizes a shared tip's own topic word instead of showing it lowercase", () => {
    const { container } = render(
      <MainTabChatTranscript
        {...archivedTurnProps(turnWith([note({ domain: "compat", name: "proton", source_host: "" })]))}
      />
    );
    expect(block(container)?.textContent).toContain("Proton");
    expect(block(container)?.textContent).not.toContain("proton");
  });
});

describe("opening a tall block keeps the view at its header", () => {
  it("scrolls the header into view, not the whole block, on open", async () => {
    const scrollIntoView = vi.fn();
    const realScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      const turn: AskThreadCollapsedTurn = {
        id: "t1",
        question: "q",
        answer: "a",
        transparency: {
          route: "ollama",
          success: true,
          context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
          overflow_skips: [],
          kb_attached_notes: [note(), note({ name: "Second" }), note({ name: "Third" })],
        },
      };
      const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
      fireEvent.click(block(container) as HTMLElement);

      // The scroll is scheduled with requestAnimationFrame so it runs after the open body has
      // actually been laid out; let one frame pass the same way the component does.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      /*
       * Other features in this same file (useStreamScrollPin, useDockClearanceOnFocus,
       * SessionContextStrip) call the real scrollIntoView too, each with its own arguments —
       * patching the prototype globally catches all of them, so this test picks out only the
       * call shape this fix makes: exactly `{ block: "start" }`, nothing else uses that shape.
       */
      const ownCalls = scrollIntoView.mock.calls
        .map((args, i) => ({ args, target: scrollIntoView.mock.instances[i] as unknown as HTMLElement }))
        .filter(({ args }) => args.length === 1 && args[0]?.block === "start" && !("behavior" in (args[0] as object)));
      expect(ownCalls).toHaveLength(1);
      // Called on the header row, not on the block's own outer element (which also contains the
      // now-tall open body).
      expect(ownCalls[0].target).not.toBe(block(container));
      expect(ownCalls[0].target.textContent).toContain("Starting out in Pikmin 2");
    } finally {
      HTMLElement.prototype.scrollIntoView = realScrollIntoView;
    }
  });

  it("does not scroll again when the block is only closed back up", async () => {
    const scrollIntoView = vi.fn();
    const realScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      const turn: AskThreadCollapsedTurn = {
        id: "t1",
        question: "q",
        answer: "a",
        transparency: {
          route: "ollama",
          success: true,
          context_chips: [{ id: "kb", rank: 1, label: "KB", attached: true, tier_class: "", body: { title: "t", paths: [], bullets: [] } }],
          overflow_skips: [],
          kb_attached_notes: [note()],
        },
      };
      const { container } = render(<MainTabChatTranscript {...archivedTurnProps(turn)} />);
      fireEvent.click(block(container) as HTMLElement);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      scrollIntoView.mockClear();

      fireEvent.click(block(container) as HTMLElement);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const ownCalls = scrollIntoView.mock.calls.filter(
        (args) => args.length === 1 && args[0]?.block === "start" && !("behavior" in (args[0] as object))
      );
      expect(ownCalls).toHaveLength(0);
    } finally {
      HTMLElement.prototype.scrollIntoView = realScrollIntoView;
    }
  });
});
