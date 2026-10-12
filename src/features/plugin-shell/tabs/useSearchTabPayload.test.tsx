/**
 * Title: What the plugin root hands the Search tab: opening a chat, and the tab switch
 * Purpose: Pin the two things the root does for the Search tab (plan 92, lane N3b): A on a chat match opens that
 *          chat first and shows the Main tab after (so the Main tab is drawn with the chat already loaded), and
 *          the shell's tab switch is what the Search tab's memory switches tabs with (the Back line, B and Y).
 * Used for: useSearchTabPayload.tsx, searchJumpStore.ts.
 * Does not: Draw the tab (the Search tab's own tests do).
 */
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ props: null as null | { onOpenChat?: (slotId: string) => Promise<unknown> | void } }));
vi.mock("../../search-tab/SearchTab", () => ({
  SearchTab: (props: { onOpenChat?: (slotId: string) => Promise<unknown> | void }) => {
    seen.props = props;
    return null;
  },
}));

import { backToSearch, resetSearchJump, startSearchJump } from "../../search-tab/searchJumpStore";
import { useSearchTabPayload, type UseSearchTabPayloadArgs } from "./useSearchTabPayload";

const NO_PACKS = { aliasSynonym: [], expansion: [] };

function Harness(args: UseSearchTabPayloadArgs): React.ReactElement {
  return useSearchTabPayload(args);
}

function mount(calls: string[], over: Partial<UseSearchTabPayloadArgs> = {}) {
  const args: UseSearchTabPayloadArgs = {
    active: false,
    isAsking: false,
    intentPackIndex: NO_PACKS,
    onSettingClick: vi.fn(),
    currentTab: "main",
    selectTab: (tab) => calls.push(`tab:${tab}`),
    selectSlot: async (slotId) => {
      calls.push(`slot:${slotId}`);
    },
    ...over,
  };
  return render(<Harness {...args} />);
}

beforeEach(() => {
  resetSearchJump();
  seen.props = null;
});
afterEach(cleanup);

describe("opening a chat from a match", () => {
  it("loads the chat first and shows the Main tab after, never the other way round", async () => {
    const calls: string[] = [];
    let finishLoad: () => void = () => {};
    mount(calls, {
      selectSlot: (slotId) =>
        new Promise<void>((resolve) => {
          calls.push(`slot:${slotId}`);
          finishLoad = resolve;
        }),
    });
    const done = seen.props!.onOpenChat!("hk");
    expect(calls).toEqual(["slot:hk"]);
    await act(async () => {
      finishLoad();
      await done;
    });
    expect(calls).toEqual(["slot:hk", "tab:main"]);
  });
});

describe("the shell's tab switch reaches the Search tab's memory", () => {
  it("is what the Back line switches tabs with", () => {
    const calls: string[] = [];
    mount(calls);
    startSearchJump({ slotId: "hk", turnId: "hk2", matchKey: "k", word: "mantis", game: null });
    expect(backToSearch()).toBe(true);
    expect(calls).toEqual(["tab:search"]);
  });

  it("is let go when the Search tab's hook goes away", () => {
    const calls: string[] = [];
    const view = mount(calls);
    view.unmount();
    startSearchJump({ slotId: "hk", turnId: "hk2", matchKey: "k", word: "mantis", game: null });
    expect(backToSearch()).toBe(false);
    expect(calls).toEqual([]);
  });
});
