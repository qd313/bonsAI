/**
 * Title: Opening another saved chat never shows the old chat's words under the new chat's name
 * Purpose: Pin what the Deck check looks at. The real chats menu, the real chat list hook and the real Main
 *          tab are built as index.tsx builds them (test-harness/afterBoxHarness.tsx), with a chat store whose
 *          read of one chat can be held back or made to fail:
 *          1. At the pick, before the new chat has been read, none of the old chat's words are on screen
 *             while the name already says the new chat; when the read answers, the new chat's words are.
 *          2. When the read fails (nothing came back, or the call threw), the old chat's name and words are
 *             back and a toast says "Could not open that chat".
 *          3. A plugin rebuilt after a box closes still comes back on the remembered chat with its words.
 * Used for: useChatSlots.ts, ChatsMenu.tsx.
 * Does not: Prove where Steam puts the ring after the pick (it goes where it went before this change; only
 *           the Deck shows that).
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { toaster } from "@decky/api";

const hoisted = vi.hoisted(() => ({
  world: null as null | { showBox: (el: React.ReactElement) => { Close: () => void } },
  /** What the next read of this chat does: "hold" waits for `release`, "null" answers nothing, "throw" rejects. */
  gate: { id: "", mode: "pass" as "pass" | "hold" | "null" | "throw", release: () => {} },
}));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable, showModal: (el: React.ReactElement) => hoisted.world!.showBox(el) };
});
vi.mock("../../settings/settingsPayload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../settings/settingsPayload")>()),
  toBonsaiSettingsPayload: () => ({}),
}));
vi.mock("./chatSlotsApi", async () => {
  const { fakeChatSlotsApi } = await import("../../../test-harness/fakeChatSlotsStore");
  return {
    ...fakeChatSlotsApi,
    getChatSlot: async (id: string) => {
      const g = hoisted.gate;
      if (id === g.id && g.mode === "hold") {
        await new Promise<void>((resolve) => {
          g.release = resolve;
        });
      }
      if (id === g.id && g.mode === "null") return null;
      if (id === g.id && g.mode === "throw") throw new Error("RPC timeout after 15000ms: get_chat_slot");
      return fakeChatSlotsApi.getChatSlot(id);
    },
  };
});

import { DeckyWorld } from "../../../test-harness/afterBoxHarness";
import { seedFakeChats } from "../../../test-harness/fakeChatSlotsStore";
import { resetChatTitleStore } from "../title/chatTitleStore";
import { resetChatNameNav } from "../title/chatNameNav";
import { resetChatRowIconNav } from "../title/chatRowIconNav";
import { resetChatRowActions } from "../title/chatRowActions";
import { resetDeckyTitleParts } from "../title/deckyTitleParts";
import { resetNavFocusRegistry } from "../../../shared/dpad/navFocusRegistry";
import { clearBonsaiSessionSurvival } from "../../plugin-shell/bonsaiSessionSurvival";
import { clearModalReturnFocus, resetModalReturnFocusRegistry } from "../../../shared/dpad/modalReturnFocusRegistry";
import { saveActiveChatSlotId } from "../../plugin-shell/pluginStorage";
import { putSteamRingOn, type SteamEl } from "../../../test-harness/steamRing";

let world: DeckyWorld | null = null;

const advance = async (ms: number) => {
  for (let done = 0; done < ms; done += 10) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  }
};

const idOf = (label: string) => `chat-${label.replace(/\W+/g, "-").toLowerCase()}`;

async function openWorld(labels: string[], open: string): Promise<DeckyWorld> {
  seedFakeChats(labels);
  saveActiveChatSlotId(idOf(open));
  world = new DeckyWorld("as the box closes");
  hoisted.world = world;
  await advance(300);
  return world;
}

/** The chats menu from the name row, then A on the chat with this name. */
async function pickFromMenu(w: DeckyWorld, label: string): Promise<void> {
  const name = w.q(".bonsai-chat-title__name") as SteamEl;
  putSteamRingOn(name);
  act(() => {
    name.__nav!.onOKButton?.();
  });
  await advance(50);
  const stops = Array.from(w.screen.ownerDocument.querySelectorAll<HTMLElement>(".bonsai-chats-menu__chat"));
  const stop = stops.find((s) => (s.getAttribute("aria-label") ?? "").split(",")[0] === label) as SteamEl | undefined;
  expect(stop, `a chats menu row for ${label}`).toBeTruthy();
  act(() => {
    stop!.__nav!.onOKButton?.();
  });
}

/** Everything the screen says, the transcript's rows included. */
const screenText = (w: DeckyWorld) => w.screen.textContent ?? "";

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  hoisted.gate.mode = "pass";
  hoisted.gate.id = "";
  vi.mocked(toaster.toast).mockClear();
  resetChatTitleStore();
  resetChatNameNav();
  resetChatRowIconNav();
  resetChatRowActions();
  resetDeckyTitleParts();
  resetNavFocusRegistry();
  resetModalReturnFocusRegistry();
  clearModalReturnFocus();
  clearBonsaiSessionSurvival();
});
afterEach(() => {
  world?.dispose();
  world = null;
  hoisted.world = null;
  vi.useRealTimers();
});

describe("picking another saved chat in the chats menu", () => {
  it("shows none of the old chat's words at the press, then the new chat's words when they arrive", async () => {
    const w = await openWorld(["one", "two", "three"], "one");
    expect(w.nameShown()).toContain("one, chat 1 of 3");
    expect(screenText(w)).toContain("Question in one");
    expect(screenText(w)).toContain("Answer in one");

    hoisted.gate.id = idOf("two");
    hoisted.gate.mode = "hold";
    await pickFromMenu(w, "two");
    await advance(50);

    expect(w.nameShown()).toContain("two, chat 2 of 3");
    expect(w.threadShown()).toBe("");
    expect(screenText(w)).not.toContain("Question in one");
    expect(screenText(w)).not.toContain("Answer in one");

    await act(async () => {
      hoisted.gate.release();
    });
    await advance(50);
    expect(w.threadShown()).toBe("Question in two");
    expect(screenText(w)).toContain("Answer in two");
    expect(screenText(w)).not.toContain("Question in one");
  });

  it("when the new chat cannot be read, puts the old chat's name and words back and says so", async () => {
    for (const mode of ["null", "throw"] as const) {
      const w = await openWorld(["one", "two", "three"], "one");
      hoisted.gate.id = idOf("two");
      hoisted.gate.mode = mode;
      vi.mocked(toaster.toast).mockClear();
      await pickFromMenu(w, "two");
      await advance(100);

      expect(w.nameShown()).toContain("one, chat 1 of 3");
      expect(screenText(w)).toContain("Question in one");
      expect(screenText(w)).toContain("Answer in one");
      expect(screenText(w)).not.toContain("Question in two");
      const toasts = vi.mocked(toaster.toast).mock.calls.map((c) => (c[0] as { title: string }).title);
      expect(toasts).toContain("Could not open that chat");
      world?.dispose();
      world = null;
    }
  });
});

describe("a plugin rebuilt behind a box", () => {
  it("comes back on the remembered chat with its words", async () => {
    const w = await openWorld(["one", "two", "three"], "two");
    expect(w.nameShown()).toContain("two, chat 2 of 3");
    expect(w.threadShown()).toBe("Question in two");
    expect(screenText(w)).toContain("Answer in two");
  });
});
