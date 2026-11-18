/**
 * Title: The library download follows you: the bar while the card is out of sight, and gone when you are back
 *
 * Purpose: Pin plan 106 lane F3's row P105-JOB-CARD-ELSEWHERE-01 for the knowledge library (board 5, tab 2, round 2
 * "Elsewhere"): a download is pressed and the card shows; leave the tab (the section goes away) and the bar at the
 * bottom of the panel shows the download with its Cancel; come back and the bar goes; Cancel from the bar stops the
 * download; a download that ends while you are away is read by the job itself (no section is on screen to read it),
 * the bar says how it ended and the section, when it is back, says the library is installed.
 *
 * Does not: walk the tab with the D-pad (OllamaTab.kbJobWalk.test.tsx does).
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { JobBar } from "../downloads/JobBar";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

const MIB = 1024 * 1024;
const BAR = "[data-bonsai-job-bar]";
const BAR_CANCEL = "Cancel: Updating the library";
let backend: "idle" | "running" | "done" | "cancelled" = "idle";

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

/** The tabs box as index.tsx draws it: the Ollama tab's body (or nothing, on another tab) and the bar after it. */
function Panel({ onOllama }: { onOllama: boolean }) {
  return (
    <div className="bonsai-decky-tabs-root" data-bonsai-active-tab={onOllama ? "ollama" : "settings"}>
      {onOllama ? section() : <div>another tab</div>}
      <JobBar />
    </div>
  );
}

const bar = () => document.querySelector<HTMLElement>(BAR);
const cancelCalls = () => getRpcCallLog().filter((c) => c.method === "cancel_rag_corpus_download");
const wait = (ms: number) => act(async () => new Promise<void>((r) => setTimeout(r, ms)));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  backend = "idle";
  setRpcHandler("get_rag_corpus_status", () => {
    if (backend === "running") {
      return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "running", done: false, stage: "download", bytes_downloaded: 62 * MIB, bytes_total: 210 * MIB });
    }
    if (backend === "done") return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.30", phase: "done", done: true, use_local_knowledge_base: true, corpus_path: "/x" });
    if (backend === "cancelled") return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "cancelled", done: true, error: "Cancelled." });
    return ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26" });
  });
  setRpcHandler("update_rag_corpus", () => {
    backend = "running";
    return { ok: true, updated: true, outcome: "download_started", version: "2026.09.30", accepted: true };
  });
});
afterEach(() => cleanup());

async function pressUpdate() {
  fireEvent.click(await screen.findByText("Update knowledge base"));
  await screen.findByLabelText("Cancel the library download");
}

describe("the library download on the card and the bar", () => {
  it("shows the card while you are on the tab, and no bar", async () => {
    render(<Panel onOllama />);
    await pressUpdate();
    expect(screen.getByText("Updating the library")).toBeTruthy();
    expect(bar()).toBeNull();
  });

  it("leaving the tab brings the bar with the download and its Cancel; coming back takes it away", async () => {
    const view = render(<Panel onOllama />);
    await pressUpdate();
    view.rerender(<Panel onOllama={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    expect(bar()!.textContent).toContain("Updating the library");
    // The drawing's one line: how far, then how much.
    expect(bar()!.textContent).toContain("30% · 62 of 210 MB");
    expect(screen.getByLabelText(BAR_CANCEL)).toBeTruthy();
    view.rerender(<Panel onOllama />);
    await waitFor(() => expect(bar()).toBeNull());
    expect(screen.getByText("Updating the library")).toBeTruthy();
  });

  it("Cancel from the bar stops the download, and the bar reads stopping", async () => {
    const view = render(<Panel onOllama />);
    await pressUpdate();
    view.rerender(<Panel onOllama={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    await wait(520);
    fireEvent.click(screen.getByLabelText(BAR_CANCEL));
    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
    expect(bar()!.textContent).toContain("Stopping the download");
  });

  it("a download that ends while you are away is seen by the job itself: the bar says how it ended, and the tab is right when you return", async () => {
    const view = render(<Panel onOllama />);
    await pressUpdate();
    view.rerender(<Panel onOllama={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    backend = "done";
    await waitFor(() => expect(bar()?.textContent).toContain("Library download finished"), { timeout: 4000 });
    expect(bar()!.textContent).toContain("Library updated.");
    expect(screen.queryByLabelText(BAR_CANCEL)).toBeNull();
    view.rerender(<Panel onOllama />);
    expect(await screen.findByText(/version 2026\.09\.30/)).toBeTruthy();
    expect(screen.queryByLabelText("Cancel the library download")).toBeNull();
    expect(screen.getByText("Update knowledge base")).toBeTruthy();
  });

  it("a cancelled download that ends while you are away says so on the bar, without the red failure look", async () => {
    const view = render(<Panel onOllama />);
    await pressUpdate();
    view.rerender(<Panel onOllama={false} />);
    await waitFor(() => expect(bar()).not.toBeNull());
    backend = "cancelled";
    await waitFor(() => expect(bar()?.textContent).toContain("Library download cancelled"), { timeout: 4000 });
    expect(bar()!.dataset.tone).toBe("quiet");
    expect(bar()!.textContent).toContain("Nothing was installed");
  });
});
