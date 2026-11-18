/**
 * Behavior tests for the knowledge-base Cancel path (execution-order step 9; moved onto the shared job card in plan
 * 106, lane F3).
 *
 * The corpus download is ~5 GB and the backend has always had a cancel event;
 * nothing in the UI set it, so a download could only be escaped by closing the
 * plugin. These assert what a user can do, not how the row is built: while a
 * download runs the job card stands in for the buttons and its Cancel is the one
 * stop the row has, a press stops the download once, a Cancel that does not land
 * puts the button back, and the card says how far the download is and where it
 * comes from.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import {
  getRpcCallLog,
  ragCorpusStatusFixture,
  resetFakeDeckyRpc,
  setRpcHandler,
} from "../../test-harness/fakeDeckyRpc";

function renderSection() {
  return render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={false}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion=""
      ollamaIp="192.168.1.100"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
}

/**
 * Drives the component into its downloading state through the same path a user
 * takes: with a corpus installed the primary button runs an update, and an
 * accepted update is what starts the progress polling. The alternative entry —
 * a first download — goes through a storage-picker modal, which is more setup
 * for the same state.
 */
const MIB = 1024 * 1024;
const CANCEL = "Cancel the library download";
/** What the back end says once the update's download has started. */
let running = false;

async function startDownloadViaUpdate() {
  running = false;
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "1.0.0",
      ...(running ? { phase: "running", done: false, stage: "download", bytes_downloaded: 62 * MIB, bytes_total: 210 * MIB } : {}),
    }),
  );
  setRpcHandler("update_rag_corpus", () => {
    running = true;
    return { ok: true, updated: true, outcome: "download_started", version: "2026.09.30", accepted: true };
  });
  const view = renderSection();
  const primary = await screen.findByText("Update knowledge base");
  fireEvent.click(primary);
  await screen.findByLabelText(CANCEL);
  return view;
}

const cancelCalls = () => getRpcCallLog().filter((c) => c.method === "cancel_rag_corpus_download");
/** A Cancel in the first half second after the start is ignored (a double press cannot start and stop at once). */
const pastTheGuard = () => act(async () => new Promise<void>((r) => setTimeout(r, 520)));

describe("KnowledgeBaseSection cancel", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  it("shows the job card with Cancel while a download is running, and no buttons beside it", async () => {
    await startDownloadViaUpdate();

    expect(screen.getByLabelText(CANCEL)).toBeTruthy();
    // The card stands in for the whole row: no Update, no Remove, no disabled "Downloading…".
    expect(screen.getByText("Updating the library")).toBeTruthy();
    expect(screen.queryByText("Update knowledge base")).toBeNull();
    expect(screen.queryByText("Remove")).toBeNull();
    expect(screen.queryByText("Downloading…")).toBeNull();
  });

  it("says what it is doing, how far, and where the download comes from", async () => {
    await startDownloadViaUpdate();

    await screen.findByText("Downloading the knowledge library");
    expect(screen.getByText("62 of 210 MB")).toBeTruthy();
    expect(screen.getByText("From huggingface.co (github.com if it does not answer)")).toBeTruthy();
    expect(document.querySelector<HTMLElement>(".bonsai-job-progress__fill")!.style.width).toBe("29.5%");
  });

  it("asks the backend to stop the download when Cancel is pressed, and the card says it is stopping", async () => {
    await startDownloadViaUpdate();
    await pastTheGuard();

    fireEvent.click(screen.getByLabelText(CANCEL));

    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
    expect(screen.getByText("Stopping the download")).toBeTruthy();
  });

  it("does not stop a download in the first half second, so a double press cannot start and stop it", async () => {
    await startDownloadViaUpdate();

    fireEvent.click(screen.getByLabelText(CANCEL));

    expect(cancelCalls()).toHaveLength(0);
  });

  it("does not fire a second cancel while the first is still pending", async () => {
    await startDownloadViaUpdate();
    await pastTheGuard();

    fireEvent.click(screen.getByLabelText(CANCEL));
    fireEvent.click(screen.getByLabelText(CANCEL));

    await waitFor(() => expect(cancelCalls()).toHaveLength(1));
    expect(cancelCalls()).toHaveLength(1);
  });

  it("puts Cancel back and says so when the stop request is refused", async () => {
    await startDownloadViaUpdate();
    setRpcHandler("cancel_rag_corpus_download", () => {
      throw new Error("could not reach the back end");
    });
    await pastTheGuard();

    fireEvent.click(screen.getByLabelText(CANCEL));

    expect(await screen.findByText("Could not stop. Try again.")).toBeTruthy();
    expect(screen.getByLabelText(CANCEL).textContent).toContain("Cancel");
  });

  it("shows Remove rather than Cancel when no download is running", async () => {
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({ installed: true, corpus_version: "1.0.0" }),
    );
    renderSection();

    await screen.findByText("Remove");
    expect(screen.queryByLabelText(CANCEL)).toBeNull();
  });

  it("reads a cancelled download as cancelled, not as a failure", async () => {
    // The backend records the unwinding exception in `error` even when the user
    // asked for the stop, so the raw text must not surface as a red failure.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        phase: "cancelled",
        done: true,
        error: "Cancelled.",
        installed: false,
      }),
    );
    renderSection();

    await screen.findByText(/Download cancelled/);
    expect(screen.queryByText("Cancelled.")).toBeNull();
  });

  it("still surfaces a real download failure", async () => {
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({
        phase: "failed",
        done: true,
        error: "Manifest unreachable.",
        installed: false,
      }),
    );
    renderSection();

    await screen.findByText("Manifest unreachable.");
    expect(screen.queryByText(/Download cancelled/)).toBeNull();
  });
});

/*
 * Closing the storage picker is a Decky modal close, which remounts the tab's content. The download
 * ran on, but the remounted section had forgotten it: no poll, one status read taken before the
 * install finished, and "Not installed" for 37 s and more on the Deck
 * (workshop:test-evidence/plan64-TWO-TAPS-DOWNLOAD-try2.json). A remount is simulated here by unmounting
 * the section and rendering a fresh one while the download is still "running".
 */
describe("KnowledgeBaseSection after the tab is rebuilt mid-download", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  function statusThatFinishesOnRead(n: number, before: Record<string, unknown>) {
    let reads = 0;
    return () => {
      reads += 1;
      return reads < n
        ? ragCorpusStatusFixture(before)
        : ragCorpusStatusFixture({ installed: true, done: true, phase: "done", corpus_version: "2026.09.18" });
    };
  }

  it("keeps checking a download started before the rebuild, and shows Installed when it lands", async () => {
    const first = await startDownloadViaUpdate();
    first.unmount();

    // The rebuilt section's first read comes before the install finished, as on the Deck.
    setRpcHandler("get_rag_corpus_status", statusThatFinishesOnRead(2, { installed: false, done: false, phase: "idle" }));
    renderSection();

    await screen.findByText(/Installed/, undefined, { timeout: 4000 });
    expect(screen.queryByText(/Not installed/)).toBeNull();
  });

  it("picks up a download the back end reports as running, with no marker left from before", async () => {
    setRpcHandler("get_rag_corpus_status", statusThatFinishesOnRead(2, { installed: false, done: false, phase: "running" }));
    renderSection();

    await screen.findByText(/Installed/, undefined, { timeout: 4000 });
  });
});
