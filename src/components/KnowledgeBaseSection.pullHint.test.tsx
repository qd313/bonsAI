/**
 * Title: The ring is handed on when the meaning-search "Pull" button goes away
 *
 * Purpose: Pin plan 76 lane 2, bug 5 (roadmap: "Nothing holds the ring when the Pull button
 * disappears"; roadmap-details "Flow L10 findings"). The "Pull nomic-embed-text" hint's button is
 * removed the moment the model is on this Deck (or the knowledge base is switched off). When Steam's
 * ring was on that button, nothing held the ring afterwards and the next press started from nowhere.
 * Once the button is gone, and only if the ring was on it and nothing else has picked the ring up,
 * the ring goes to the button below it, the library's Download/Update button, through Steam's own
 * transfer (the action row's nav node), then the button's own focus as the check-and-fallback.
 *
 * Does not: prove the ring moves on the device (jsdom has no Steam ring); that is the Deck row's job.
 */
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ takeFocus: null as unknown as ReturnType<typeof vi.fn> }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  hoisted.takeFocus = vi.fn();
  const RealFocusable = stubs.Focusable;
  // The real Focusable fills a `navRef` holder with Steam's nav node; the stub drops the prop.
  const NavFocusable = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function NavFocusable(props, ref) {
    const holder = props.navRef as { current: unknown } | undefined;
    if (holder) holder.current = { TakeFocus: hoisted.takeFocus };
    return <RealFocusable {...props} ref={ref} />;
  });
  return { ...stubs, Focusable: NavFocusable };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";

function section(useLocalKnowledgeBase: boolean) {
  return (
    <KnowledgeBaseSection
      useLocalKnowledgeBase={useLocalKnowledgeBase}
      setUseLocalKnowledgeBase={() => {}}
      ragCorpusVersion="1.0.0"
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() => {}}
      onCompleteDeckyModalClose={(close) => close()}
    />
  );
}

/** Installed library, vectors baked in, meaning-search model missing: the hint and its button show. */
async function drawWithHint() {
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({
      installed: true,
      corpus_version: "1.0.0",
      embeddings_populated: true,
      embed_model_available: false,
    }),
  );
  const view = render(section(true));
  const pull = (await screen.findByText(/^Pull nomic-embed-text/)).closest("button") as HTMLButtonElement;
  const update = screen.getByText("Update knowledge base").closest("button") as HTMLButtonElement;
  return { view, pull, update };
}

const later = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))));

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  hoisted.takeFocus.mockReset();
  (document.activeElement as HTMLElement | null)?.blur();
});

describe("the meaning-search Pull button goes away", () => {
  it("with the ring on it: hands the ring to Steam's transfer into the action row, then checks it landed", async () => {
    const { view, pull, update } = await drawWithHint();
    pull.focus();
    expect(document.activeElement).toBe(pull);

    view.rerender(section(false)); // the hint, and its button, are gone
    expect(screen.queryByText(/^Pull nomic-embed-text/)).toBeNull();
    await later(30);

    expect(hoisted.takeFocus).toHaveBeenCalledWith(true);
    // Steam's transfer does not exist in jsdom; the in-row focus is what the check falls back to.
    expect(document.activeElement).toBe(update);
  });

  it("with the ring somewhere else: leaves the ring alone", async () => {
    const { view, pull, update } = await drawWithHint();
    update.focus();

    view.rerender(section(false));
    await later(30);

    expect(pull.isConnected).toBe(false);
    expect(hoisted.takeFocus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(update);
  });

  it("with the whole section leaving (a tab switch): does nothing", async () => {
    const { view, pull } = await drawWithHint();
    pull.focus();

    view.unmount();
    await later(30);

    expect(hoisted.takeFocus).not.toHaveBeenCalled();
  });
});
