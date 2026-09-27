/**
 * Behavior tests for "Update knowledge base" saying what it did.
 *
 * On the Deck (docs/test-evidence/plan70-R5.json) pressing Update twice showed nothing on
 * screen, so there was no way to tell whether it had checked at all. These pin the fix: the
 * row's own status text says "Checking…" while it checks, then the outcome — already up to
 * date with the version, a newer version downloading, or a plain error — with no new button.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { getRpcCallLog, ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function renderInstalled() {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", corpus_path: "/home/deck/.bonsai/rag" }),
  );
  return render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion="2026.09.26"
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
}

const updateCalls = () => getRpcCallLog().filter((c) => c.method === "update_rag_corpus");

async function pressUpdate() {
  fireEvent.click(await screen.findByText("Update knowledge base"));
}

describe("KnowledgeBaseSection Update reports its outcome", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Checking… through a slow check and ends on the real outcome, not a timeout", async () => {
    // The back end tries two mirrors with up to 60 s each; the screen used to give up
    // after 15 s and say "Update failed" while the back end was still checking.
    let finish: (v: unknown) => void = () => {};
    setRpcHandler("update_rag_corpus", () => new Promise((resolve) => (finish = resolve)));
    renderInstalled();
    await screen.findByText("Update knowledge base");
    vi.useFakeTimers();
    fireEvent.click(screen.getByText("Update knowledge base"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(110_000);
    });
    expect(screen.getByText("Checking for a newer version…")).toBeTruthy();
    expect(screen.queryByText(/Update failed/)).toBeNull();

    await act(async () => {
      finish({ ok: true, updated: false, outcome: "up_to_date", version: "2026.09.26" });
    });
    expect(screen.getByText("Already up to date (version 2026.09.26).")).toBeTruthy();
  });

  it("never says Update failed when the screen's own deadline passes", async () => {
    setRpcHandler("update_rag_corpus", () => new Promise(() => {}));
    renderInstalled();
    await screen.findByText("Update knowledge base");
    vi.useFakeTimers();
    fireEvent.click(screen.getByText("Update knowledge base"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(screen.queryByText(/Update failed/)).toBeNull();
    expect(screen.getByText(/still checking/i)).toBeTruthy();
  });

  it("says Checking… while the check runs, and a second press does not start another", async () => {
    let finish: (v: unknown) => void = () => {};
    setRpcHandler("update_rag_corpus", () => new Promise((resolve) => (finish = resolve)));
    renderInstalled();
    await pressUpdate();

    expect(await screen.findByText("Checking for a newer version…")).toBeTruthy();
    await pressUpdate();
    expect(updateCalls()).toHaveLength(1);

    await act(async () => {
      finish({ ok: true, updated: false, outcome: "up_to_date", version: "2026.09.26" });
    });
    expect(screen.queryByText("Checking for a newer version…")).toBeNull();
  });

  it("says already up to date, with the version", async () => {
    setRpcHandler("update_rag_corpus", () => ({
      ok: true,
      updated: false,
      outcome: "up_to_date",
      version: "2026.09.26",
    }));
    renderInstalled();
    await pressUpdate();
    expect(await screen.findByText("Already up to date (version 2026.09.26).")).toBeTruthy();
  });

  it("says a newer version was found and shows the download running", async () => {
    setRpcHandler("update_rag_corpus", () => ({
      ok: true,
      updated: true,
      outcome: "download_started",
      version: "2026.09.30",
      accepted: true,
    }));
    renderInstalled();
    await pressUpdate();
    expect(await screen.findByText("Newer version 2026.09.30 found — downloading…")).toBeTruthy();
    expect(screen.getByText("Downloading…")).toBeTruthy();

    // Once the download ends the note goes; the Installed line carries the new version.
    setRpcHandler("get_rag_corpus_status", () =>
      ragCorpusStatusFixture({ phase: "done", done: true, installed: true, corpus_version: "2026.09.30" }),
    );
    await waitFor(() => expect(screen.queryByText("Downloading…")).toBeNull(), { timeout: 4000 });
    expect(screen.queryByText("Newer version 2026.09.30 found — downloading…")).toBeNull();
    expect(screen.getByText(/version 2026\.09\.30/)).toBeTruthy();
  });

  it("says plainly when the check could not reach the library's site", async () => {
    setRpcHandler("update_rag_corpus", () => ({
      ok: false,
      outcome: "check_failed",
      error: "Could not fetch the knowledge base manifest.",
    }));
    renderInstalled();
    await pressUpdate();
    expect(
      await screen.findByText("Could not check for updates: Could not fetch the knowledge base manifest."),
    ).toBeTruthy();
  });

  it("says plainly when a newer version was found but its download would not start", async () => {
    setRpcHandler("update_rag_corpus", () => ({
      ok: false,
      updated: true,
      outcome: "download_not_started",
      version: "2026.09.30",
      accepted: false,
      reason: "Knowledge base download already running.",
      error: "Knowledge base download already running.",
    }));
    renderInstalled();
    await pressUpdate();
    expect(
      await screen.findByText("Update failed: Knowledge base download already running."),
    ).toBeTruthy();
    expect(screen.getByText("Update knowledge base")).toBeTruthy();
  });

  it("says plainly when the call itself fails", async () => {
    setRpcHandler("update_rag_corpus", () => {
      throw new Error("timed out");
    });
    renderInstalled();
    await pressUpdate();
    expect(await screen.findByText(/^Update failed: .*timed out/)).toBeTruthy();
  });
});
