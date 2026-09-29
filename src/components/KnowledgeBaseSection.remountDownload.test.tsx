/**
 * Title: The library's status follows a download that starts after the screen was rebuilt
 *
 * Purpose: Pin plan 76 lane 2 round 3, bug 3 (roadmap: 'After reinstalling the library, its status
 * reads "Not installed" for about a minute, then shows a leftover "100% Downloading... Cancel" row';
 * docs/test-evidence/plan76-P76-KB-BOX-RING-RETURN.json). With internet downloads off, the download
 * notice first saves the permission and only then says yes -- and closing its box rebuilds the Ollama
 * tab before that. The download therefore started in the copy of the section that was already gone;
 * the new copy had read "Not installed" a moment earlier and had nothing telling it a download began,
 * so it neither showed "Downloading..." nor polled, until something unrelated made it read again. A
 * download that starts now tells every section on screen, and each one shows it and follows it to the
 * end (where "Installed" appears and the Downloading/Cancel row goes).
 *
 * Does not: run the real back end; the status reads are stood in for.
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  releaseNotice: null as null | ((go: boolean) => void),
  picker: null as null | { onPick: (p: string, s: string) => void },
}));

vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: () => new Promise<boolean>((resolve) => (hoisted.releaseNotice = resolve)),
}));
vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: { props: { onPick: (p: string, s: string) => void } }) => {
      hoisted.picker = el.props;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

const section = () => (
  <KnowledgeBaseSection
    useLocalKnowledgeBase={true}
    setUseLocalKnowledgeBase={() => {}}
    ragCorpusVersion=""
    ollamaIp="127.0.0.1"
    ollamaLocalOnDeck={true}
    onBeforeDeckyModal={() => {}}
    onCompleteDeckyModalClose={(close) => close()}
  />
);

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  hoisted.releaseNotice = null;
  hoisted.picker = null;
});

describe("a download that starts in a section that was already replaced", () => {
  it("shows Downloading in the section now on screen, then Installed with no Cancel row", async () => {
    let backend: "idle" | "running" | "done" = "idle";
    setRpcHandler("get_rag_corpus_status", () =>
      backend === "idle"
        ? ragCorpusStatusFixture()
        : backend === "running"
          ? ragCorpusStatusFixture({ phase: "running", done: false, bytes_total: 100, bytes_downloaded: 50, progress_pct: 50 })
          : ragCorpusStatusFixture({ installed: true, corpus_version: "2026.09.26", phase: "done", done: true }),
    );
    setRpcHandler("start_rag_corpus_download", () => {
      backend = "running";
      return { accepted: true };
    });

    // The first copy: Download, the location picker, a place chosen; the notice's box opens.
    const first = render(section());
    fireEvent.click(await screen.findByText("Download knowledge base"));
    await waitFor(() => expect(hoisted.picker).not.toBeNull());
    act(() => hoisted.picker!.onPick("~/.bonsai/rag", "internal"));
    await waitFor(() => expect(hoisted.releaseNotice).not.toBeNull());

    // The box closing rebuilds the tab: a new copy reads "Not installed" while the notice still waits.
    first.unmount();
    render(section());
    expect(await screen.findByText("Download knowledge base")).toBeTruthy();

    // The notice says yes; the download starts (in the old copy's own code).
    await act(async () => hoisted.releaseNotice!(true));
    await waitFor(() => expect(screen.getByText("Downloading…")).toBeTruthy());
    expect(screen.getByText("Cancel")).toBeTruthy();

    backend = "done";
    await waitFor(() => expect(screen.getByText("Update knowledge base")).toBeTruthy(), { timeout: 5000 });
    expect(screen.queryByText("Cancel")).toBeNull();
    expect(screen.queryByText("Downloading…")).toBeNull();
    expect(screen.getByText(/Installed/)).toBeTruthy();
  });
});
