/**
 * Title: Saving an older chat to the Desktop
 *
 * Purpose: Pin plan 72 job E. The chat row's save icon showed only on a chat with an answer from
 * this session; an older saved chat (the Deck's "Hades" chat, every answer from earlier sessions)
 * showed none, so Left from its name went nowhere. What there is to save is now this session's
 * answer, else the newest loaded turn that has an answer -- the same one question and answer a
 * fresh chat saves. (The row went in plan 84 step 5; the chats menu's Save to Desktop note follows
 * the same rule, pinned in src/features/chat-title/ChatsMenu.test.tsx.)
 *
 * Does not: Write a file. The save call is recorded, and the popup's own confirm is called directly.
 */
import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AskThreadCollapsedTurn } from "../../types/bonsaiUi";

const hoisted = vi.hoisted(() => ({
  modals: [] as React.ReactElement[],
  calls: [] as Array<{ method: string; args: unknown[] }>,
}));

vi.mock("@decky/ui", async () => {
  const fake = await import("../../test-harness/fakeDeckyUi");
  return {
    ...fake,
    showModal: (el: React.ReactElement) => {
      hoisted.modals.push(el);
      return { Close: () => undefined };
    },
  };
});
vi.mock("@decky/api", () => ({ toaster: { toast: () => undefined } }));
vi.mock("../../utils/deckyCall", () => ({
  callDeckyWithTimeout: async (method: string, args: unknown[]) => {
    hoisted.calls.push({ method, args });
    return { success: true, path: "Desktop/bonsAI_logs/x.md" };
  },
  formatDeckyRpcError: (e: unknown) => String(e),
}));

import { desktopNoteExchangeFor, useDesktopNoteSaveModal } from "./useDesktopNoteSaveModal";

/* An older chat as loaded from its file: oldest first, newest last, nothing asked this session. */
const HADES: AskThreadCollapsedTurn[] = [
  { id: "t1", question: "How do I get the Stygian Blade's aspects?", answer: "Unlock them with Titan Blood at the Mirror." },
  { id: "t2", question: "Which aspect is best against Theseus?", answer: "Aspect of Nemesis, for the crits after a dash-strike." },
];

function openSaveFor(lastExchange: { question: string; answer: string } | null, loadedTurns: AskThreadCollapsedTurn[]) {
  const { result } = renderHook(() =>
    useDesktopNoteSaveModal({
      filesystemWrite: true,
      lastExchange,
      loadedTurns,
      jumpToPermission: vi.fn(),
      currentTab: "main",
      finalizeShowModalAndRestoreActiveTab: (close) => close(),
      returnTabRef: { current: "main" },
    }),
  );
  result.current();
}

beforeEach(() => {
  hoisted.modals = [];
  hoisted.calls = [];
});
afterEach(() => {
  document.body.innerHTML = "";
});

describe("what an older chat has to save", () => {
  it("is its newest loaded question and answer when nothing was asked this session", () => {
    expect(desktopNoteExchangeFor(null, HADES)).toEqual({
      question: HADES[1]!.question,
      answer: HADES[1]!.answer,
    });
  });

  it("skips a newest turn with no answer (a stopped or pending one) for the newest that has one", () => {
    const turns = [...HADES, { id: "t3", question: "And Asterius?", answer: "  " }];
    expect(desktopNoteExchangeFor(null, turns)?.question).toBe(HADES[1]!.question);
  });

  it("is this session's answer whenever there is one, as before", () => {
    const fresh = { question: "Where is the Fated List?", answer: "In your room, left of the bed." };
    expect(desktopNoteExchangeFor(fresh, HADES)).toEqual(fresh);
  });

  it("is nothing for an empty chat", () => {
    expect(desktopNoteExchangeFor(null, [])).toBeNull();
  });
});

describe("the save window for an older chat", () => {
  it("writes that chat's newest loaded question and answer, word for word", async () => {
    openSaveFor(null, HADES);
    expect(hoisted.modals.length).toBe(1);
    const onConfirm = (hoisted.modals[0]!.props as { onConfirm: unknown }).onConfirm as (stem: string) => Promise<void>;
    await act(async () => {
      await onConfirm("hades");
    });
    expect(hoisted.calls).toEqual([
      {
        method: "append_desktop_debug_note",
        args: [{ stem: "hades", question: HADES[1]!.question, response: HADES[1]!.answer }],
      },
    ]);
  });

  it("does not open for an empty chat", () => {
    openSaveFor(null, []);
    expect(hoisted.modals.length).toBe(0);
  });
});
