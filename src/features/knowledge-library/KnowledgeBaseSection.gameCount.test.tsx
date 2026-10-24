/**
 * Title: The installed library line says how many games it holds
 * Purpose: Pin P96-F15: on the Deck the line read "Installed - version 2026.10.17" with no count, though the
 *          file holds 38 games. The line now ends with ", 38 games" when the back end reports one, and is
 *          unchanged when it does not.
 * Used for: KnowledgeBaseSection.tsx (the line under the use-local switch).
 * Does not: Test the counting itself (tests/test_rag_corpus_status.py).
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";

function renderWith(extra: Record<string, unknown>) {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ installed: true, corpus_version: "2026.10.17", ...extra }),
  );
  return render(
    <KnowledgeBaseSection
      useLocalKnowledgeBase={true}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion="2026.10.17"
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />,
  );
}

describe("the installed library line", () => {
  beforeEach(() => {
    resetFakeDeckyRpc();
    resetKbDownloadInFlightForTests();
  });

  it("shows the game count after the version", async () => {
    renderWith({ game_count: 38, section_count: 414 });
    expect(await screen.findByText(/version 2026\.10\.17, 38 games/)).toBeTruthy();
  });

  it("says '1 game' for one", async () => {
    renderWith({ game_count: 1 });
    expect(await screen.findByText(/version 2026\.10\.17, 1 game$/)).toBeTruthy();
  });

  it("still shows just the version when the back end sends no count", async () => {
    renderWith({});
    const line = await screen.findByText(/version 2026\.10\.17/);
    expect(line.textContent).not.toMatch(/games?/);
  });
});
