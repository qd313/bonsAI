/**
 * Title: The library's job card and Steam's ring: on Cancel at the press, on Update when it ends
 *
 * Purpose: Pin plan 106 lane F3's row P105-JOB-CARD-ELSEWHERE-01 at the level the Deck check reads, Steam's own ring
 * (the `gpfocus` marker the stand-in moves only on Steam's transfer): A on "Update knowledge base" swaps the buttons
 * for the job card and the ring is on the card's Cancel on the same press; Down from "Use local knowledge base" lands
 * on Cancel while the card is up (it is the row's only stop); when the download ends with the ring on Cancel the card
 * goes and the ring is on Update, never on nothing; a ring somewhere else stays where it is.
 *
 * Does not: know Steam's real timing; the Deck row reads the ring after each change.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const { SteamRingFocusable } = await import("../../test-harness/steamRing");
  const ToggleField = (p: Record<string, unknown>) => {
    const { label, checked: _c, onChange: _o, description: _d, disabled: _x, ...rest } = p;
    return <SteamRingFocusable {...rest} focusable aria-label={stubs.wordsOf(label)} data-decky-ui="ToggleField" />;
  };
  return { ...stubs, Focusable: SteamRingFocusable, ToggleField };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { resetModalReturnFocusRegistry } from "../../shared/dpad/modalReturnFocusRegistry";
import { resetNavFocusRegistry } from "../../shared/dpad/navFocusRegistry";
import { putSteamRingOn, steamRingHolder, type SteamEl } from "../../test-harness/steamRing";

const CANCEL = "Cancel the library download";
const MIB = 1024 * 1024;
let backend: "idle" | "running" | "done" = "idle";

const section = () => (
  <KnowledgeBaseSection
    useLocalKnowledgeBase={true}
    setUseLocalKnowledgeBase={() => {}}
    ragCorpusVersion="2026.09.26"
    ollamaIp="127.0.0.1"
    ollamaLocalOnDeck={true}
    onBeforeDeckyModal={() => {}}
    onCompleteDeckyModalClose={(close) => close()}
  />
);

const ringName = () => steamRingHolder()?.getAttribute("aria-label") ?? steamRingHolder()?.textContent ?? "(no ring)";
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const updateButton = () => screen.getByText("Update knowledge base").closest("button") as HTMLElement;

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  resetModalReturnFocusRegistry();
  resetNavFocusRegistry();
  backend = "idle";
  setRpcHandler("get_rag_corpus_status", () =>
    backend === "running"
      ? ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "running", done: false, stage: "download", bytes_downloaded: 62 * MIB, bytes_total: 210 * MIB })
      : backend === "done"
        ? ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.30", phase: "done", done: true })
        : ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26" }),
  );
  setRpcHandler("update_rag_corpus", () => {
    backend = "running";
    return { ok: true, updated: true, outcome: "download_started", version: "2026.09.30", accepted: true };
  });
});
afterEach(() => cleanup());

describe("the library's card and the ring", () => {
  it("on the same press the buttons give way to the card and Steam's ring is on its Cancel", async () => {
    render(section());
    await screen.findByText("Update knowledge base");
    act(() => putSteamRingOn(updateButton()));
    await act(async () => void fireEvent.click(updateButton()));
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    expect(screen.queryByText("Update knowledge base")).toBeNull();
  });

  it("a ring somewhere else stays where it is when the card comes", async () => {
    render(section());
    await screen.findByText("Update knowledge base");
    const toggle = byLabel("Use local knowledge base")!;
    act(() => putSteamRingOn(toggle));
    await act(async () => void fireEvent.click(updateButton()));
    await screen.findByLabelText(CANCEL);
    expect(ringName()).toBe("Use local knowledge base");
  });

  it("Down from the switch lands on Cancel while the card is up, as Steam's own transfer", async () => {
    render(section());
    await screen.findByText("Update knowledge base");
    await act(async () => void fireEvent.click(updateButton()));
    await screen.findByLabelText(CANCEL);
    const toggleHost = byLabel("Use local knowledge base")!.closest<SteamEl>("[data-decky-ui]") as SteamEl;
    const handlers = (byLabel("Use local knowledge base") as SteamEl).__nav ?? toggleHost.__nav;
    act(() => putSteamRingOn(byLabel("Use local knowledge base")));
    act(() => void handlers?.onMoveDown?.());
    expect(ringName()).toBe(CANCEL);
  });

  it("the download ends with the ring on Cancel: the card goes and the ring is on Update, never on nothing", async () => {
    render(section());
    await screen.findByText("Update knowledge base");
    act(() => putSteamRingOn(updateButton()));
    await act(async () => void fireEvent.click(updateButton()));
    await waitFor(() => expect(ringName()).toBe(CANCEL));
    backend = "done";
    await waitFor(() => expect(byLabel(CANCEL)).toBeNull(), { timeout: 4000 });
    await waitFor(() => expect(ringName()).toMatch(/Update knowledge base/));
  });
});
