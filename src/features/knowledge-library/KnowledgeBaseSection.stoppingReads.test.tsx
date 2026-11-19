/**
 * Title: Cancel on the library download: the card shows the result within a second, on the tab and on the bar
 *
 * Purpose: Pin, at the level the Deck check reads, that a Cancel on the knowledge library's download is followed by
 * fast reads of its status. The back end is faked as "running" until the Cancel and "cancelled" straight after; the
 * card leaves "Stopping the download" within 400 ms of the press (not the 1.5 seconds of the routine read) and the
 * Update button is back. Once with the section on screen (its own poll reads fast) and once with the tab away (the
 * bar's Cancel; the follower reads fast).
 *
 * Does not: move the ring (KnowledgeBaseSection.cardRing.test.tsx pins where it goes when the card ends).
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { JobBar } from "../downloads/JobBar";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const MIB = 1024 * 1024;
const CANCEL = "Cancel the library download";
const BAR_CANCEL = "Cancel: Updating the library";
const BAR = "[data-bonsai-job-bar]";
let backend: "idle" | "running" | "cancelled" = "idle";

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
function Panel({ onTab }: { onTab: boolean }) {
  return (
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={onTab ? "ollama" : "settings"}>
      {onTab ? section() : <div>another tab</div>}
      <JobBar />
    </div>
  );
}

const statusReads = () => getRpcCallLog().filter((c) => c.method === "get_rag_corpus_status").length;
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** Moves the clock until the status has just been read, so the next routine read is a full 1.5 seconds away. */
async function justAfterARead() {
  const before = statusReads();
  while (statusReads() === before) await advance(50);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  backend = "idle";
  setRpcHandler("get_rag_corpus_status", () => {
    if (backend === "running") {
      return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "running", done: false, stage: "download", bytes_downloaded: 62 * MIB, bytes_total: 210 * MIB });
    }
    if (backend === "cancelled") return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "cancelled", done: true, error: "Cancelled." });
    return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26" });
  });
  setRpcHandler("update_rag_corpus", () => {
    backend = "running";
    return { ok: true, updated: true, outcome: "download_started", version: "2026.09.30", accepted: true };
  });
  // The back end stops the download at once: the next status read says so.
  setRpcHandler("cancel_rag_corpus_download", () => {
    backend = "cancelled";
    return { cancel_requested: true };
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function startUpdate(view: ReturnType<typeof render>) {
  fireEvent.click(await screen.findByText("Update knowledge base"));
  await screen.findByLabelText(CANCEL);
  await advance(600);
  return view;
}

describe("Cancel on the library download shows its result within a second", () => {
  it("on the tab: the card leaves Stopping within 400 ms and Update is back", async () => {
    await startUpdate(render(<Panel onTab />));
    await justAfterARead();
    fireEvent.click(screen.getByLabelText(CANCEL));
    expect(screen.getByText("Stopping the download")).toBeTruthy();
    await advance(400);
    expect(screen.queryByText("Stopping the download")).toBeNull();
    expect(screen.queryByLabelText(CANCEL)).toBeNull();
    expect(screen.getByText("Update knowledge base")).toBeTruthy();
  });

  it("away from the tab: the bar leaves Stopping within 400 ms and says it was cancelled", async () => {
    const view = await startUpdate(render(<Panel onTab />));
    view.rerender(<Panel onTab={false} />);
    await advance(600);
    expect(document.querySelector(BAR)).not.toBeNull();
    await justAfterARead();
    fireEvent.click(screen.getByLabelText(BAR_CANCEL));
    expect(document.querySelector(BAR)!.textContent).toContain("Stopping the download");
    await advance(400);
    expect(document.querySelector(BAR)!.textContent).not.toContain("Stopping");
    expect(document.querySelector(BAR)!.textContent).toContain("Library download cancelled");
  });
});
