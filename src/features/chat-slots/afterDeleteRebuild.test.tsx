/**
 * Title: After a Delete chat box, the right chat is open (plan 87, the Deck's 2026-10-10 night)
 * Purpose: Pin what the Deck check looks at, with the plugin screen thrown away and rebuilt between the box
 *          opening and closing, as Decky does (afterBoxHarness.tsx). Both "as the box opens" and "as the box
 *          closes" are run, since the Deck has not said which it is. Without the fix, test 1 fails only
 *          "as the box opens", with the Deck's own symptom (the old screen is already gone when Delete is
 *          pressed); tests 2 and 3 fail both ways:
 *          1. At ten chats, New chat, a pick, then Delete: the picked chat is gone and the NEW empty chat is
 *             the one open ("not saved yet", nothing in the thread), the ring on the chat's name, and Down
 *             from the name reaches the question box. Before the fix the screen came back on the chat that
 *             was open before (the Deck showed "test three" again).
 *          2. The delete icon on the OPEN chat, then Delete: the name row is drawn with a chat that exists
 *             (the next one, the one the code chooses), the deleted chat's words are not on screen, the
 *             ring is on the chat's name and Down reaches the question box. Before the fix the panel came
 *             back with no name row, the deleted chat's words on screen and the ring on the tab bar.
 *          3. The same for the chats menu's own Delete chat on the open chat.
 * Used for: useChatSlotDeleteConfirm.tsx, useStartNewChat.tsx, useChatSlots.ts, bonsaiSessionSurvival.ts.
 * Does not: Prove when Steam itself lands the ring as the box closes (the harness lands it on Decky's back
 *           arrow, the worst case the Deck measured); only the Deck shows that.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({ world: null as null | { showBox: (el: React.ReactElement) => { Close: () => void } } }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  return { ...stubs, Focusable: SteamRingFocusable, showModal: (el: React.ReactElement) => hoisted.world!.showBox(el) };
});
/* The harness's session note carries no settings; the restore only passes them along. */
vi.mock("../../utils/settingsPayload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/settingsPayload")>()),
  toBonsaiSettingsPayload: () => ({}),
}));
vi.mock("../../utils/chatSlotsApi", async () => (await import("./fakeChatSlotsStore")).fakeChatSlotsApi);

import { DeckyWorld, type RebuildWhen } from "./afterBoxHarness";
import { fakeChatIds, seedFakeChats } from "./fakeChatSlotsStore";
import { ChatSlotDeleteModal } from "./ChatSlotDeleteModal";
import { ChatSlotPickerModal } from "./ChatSlotPickerModal";
import { resetChatTitleStore, takeChatFirstStop } from "../chat-title/chatTitleStore";
import { resetChatNameNav } from "../chat-title/chatNameNav";
import { resetChatRowIconNav } from "../chat-title/chatRowIconNav";
import { resetChatRowActions } from "../chat-title/chatRowActions";
import { resetDeckyTitleParts } from "../chat-title/deckyTitleParts";
import { resetNavFocusRegistry } from "../../utils/navFocusRegistry";
import { clearBonsaiSessionSurvival } from "../../utils/bonsaiSessionSurvival";
import { clearModalReturnFocus, resetModalReturnFocusRegistry } from "../plugin-shell/modalReturnFocusRegistry";
import { saveActiveChatSlotId } from "../plugin-shell/pluginStorage";
import { putSteamRingOn, type SteamEl } from "../../test-harness/steamRing";

let world: DeckyWorld | null = null;

/* In small steps, each its own act: React only draws what a step set once that step's act ends, and the
   next step's timers are set by the draw (a list comes back, the screen is built, the list is asked for). */
const advance = async (ms: number) => {
  for (let done = 0; done < ms; done += 10) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  }
};

function press(el: SteamEl, key: "onOKButton") {
  let result: unknown;
  act(() => {
    result = el.__nav![key]?.();
  });
  return result;
}

/* Down on the name, as the Deck's layout (the tab bar in Steam's strip) answers it: the Main tab's own first stop. */
const downFromName = () => {
  let moved = false;
  act(() => {
    moved = takeChatFirstStop();
  });
  return moved;
};

const idOf = (label: string) => `chat-${label.replace(/\W+/g, "-").toLowerCase()}`;
const props = <T,>(el: React.ReactElement) => el.props as T;

/** The chats, newest first, with `open` made the open chat; the screen is built and has loaded. */
async function openWorld(when: RebuildWhen, labels: string[], open: string): Promise<DeckyWorld> {
  seedFakeChats(labels);
  saveActiveChatSlotId(idOf(open));
  world = new DeckyWorld(when);
  hoisted.world = world;
  await advance(300);
  return world;
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
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

const TEN = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

describe.each<RebuildWhen>(["as the box opens", "as the box closes"])(
  "the plugin screen is rebuilt %s",
  (when) => {
    it("at ten chats, New chat then a pick then Delete: the new empty chat is open and the ring is on the name", async () => {
      const w = await openWorld(when, TEN, "two");
      expect(w.nameShown()).toContain("two, chat 2 of 10");
      expect(w.threadShown()).toBe("Question in two");

      /* + on the name row: at ten it opens the picker. */
      putSteamRingOn(w.q(".bonsai-chat-title__name"));
      press(w.q(".bonsai-chat-title__icon--new") as SteamEl, "onOKButton");
      await advance(50);
      expect(w.box.type).toBe(ChatSlotPickerModal);
      /* A pick of another chat opens the usual box. */
      act(() => props<{ onPick: (id: string, label: string) => void }>(w.box).onPick(idOf("five"), "five"));
      await advance(50);
      expect(w.box.type).toBe(ChatSlotDeleteModal);
      /* Delete. */
      act(() => props<{ onDelete: () => void }>(w.box).onDelete());
      await advance(2000);

      expect(fakeChatIds()).not.toContain(idOf("five"));
      expect(fakeChatIds()).toHaveLength(10);
      expect(fakeChatIds()[0]).toBe("chat-new-1");
      expect(w.nameShown()).toContain("New chat, not saved yet");
      expect(w.threadShown()).toBe("");
      expect(w.ringIs()).toBe("the chat's name");
      expect(downFromName()).toBe(true);
      expect(w.ringIs()).toBe("Question box");
    });

    it("the delete icon on the open chat, then Delete: the next chat is open, the name row is drawn, the ring is on the name", async () => {
      const w = await openWorld(when, ["Empty first", "second", "third", "fourth"], "second");
      expect(w.nameShown()).toContain("second, chat 2 of 4");

      putSteamRingOn(w.q(".bonsai-chat-title__name"));
      press(w.q(".bonsai-chat-title__icon--delete") as SteamEl, "onOKButton");
      await advance(50);
      expect(w.box.type).toBe(ChatSlotDeleteModal);
      act(() => props<{ onDelete: () => void }>(w.box).onDelete());
      await advance(2000);

      expect(fakeChatIds()).not.toContain(idOf("second"));
      expect(w.nameShown()).not.toBeNull();
      expect(w.nameShown()).toContain("Empty first, chat 1 of 3");
      expect(w.threadShown()).toBe("");
      expect(w.ringIs()).toBe("the chat's name");
      expect(downFromName()).toBe(true);
      expect(w.ringIs()).toBe("Question box");
    });

    it("the chats menu's Delete chat on the open chat does the same", async () => {
      const w = await openWorld(when, ["Empty first", "second", "third", "fourth"], "second");
      const name = w.q(".bonsai-chat-title__name") as SteamEl;
      putSteamRingOn(name);
      press(name, "onOKButton");
      await advance(50);
      const del = w.screen.ownerDocument.querySelector<HTMLElement>(".bonsai-chats-menu__action--delete") as SteamEl;
      press(del, "onOKButton");
      await advance(50);
      expect(w.box.type).toBe(ChatSlotDeleteModal);
      act(() => props<{ onDelete: () => void }>(w.box).onDelete());
      await advance(2000);

      expect(fakeChatIds()).not.toContain(idOf("second"));
      expect(w.nameShown()).toContain("Empty first, chat 1 of 3");
      expect(w.threadShown()).toBe("");
      expect(w.ringIs()).toBe("the chat's name");
    });
  },
);
