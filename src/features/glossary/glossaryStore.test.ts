import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addKbLibraryListener, announceKbLibraryChange, resetKbLibrarySignalForTests } from "../knowledge-library/kbLibrarySignal";
import { ensureGlossaryLoaded, resetGlossaryStore, useGlossaryTerms } from "./glossaryStore";
import { callDeckyWithTimeout } from "../../utils/deckyCall";

vi.mock("../../utils/deckyCall", () => ({ callDeckyWithTimeout: vi.fn() }));

const rpc = vi.mocked(callDeckyWithTimeout);

const WORDS_ANSWER = {
  ok: true,
  installed: true,
  game_title: "Deep Rock Galactic: Survivor",
  terms: [
    { id: "kiting", term: "kiting", alt_forms: ["kite"], peek: "Backing away.", full: "Kiting is backing away." },
  ],
  reason: "",
};

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  resetGlossaryStore();
  resetKbLibrarySignalForTests();
  rpc.mockReset();
});

afterEach(() => {
  resetGlossaryStore();
});

describe("glossaryStore", () => {
  it("asks the back end once per game however many answers draw", async () => {
    rpc.mockResolvedValue(WORDS_ANSWER);
    const { result } = renderHook(() => useGlossaryTerms("2321470"));
    ensureGlossaryLoaded("2321470");
    ensureGlossaryLoaded("2321470");
    ensureGlossaryLoaded(" 2321470 ");
    await settle();
    ensureGlossaryLoaded("2321470");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("get_rag_corpus_glossary", ["2321470"]);
    expect(result.current).toEqual([
      {
        id: "kiting",
        term: "kiting",
        altForms: ["kite"],
        peek: "Backing away.",
        full: "Kiting is backing away.",
        gameTitle: "Deep Rock Galactic: Survivor",
      },
    ]);
  });

  it("asks for nothing when there is no game", () => {
    ensureGlossaryLoaded("");
    ensureGlossaryLoaded(null);
    ensureGlossaryLoaded(undefined);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps an empty answer so a game with no words costs one call", async () => {
    rpc.mockResolvedValue({ ok: true, installed: true, game_title: "Hades", terms: [], reason: "" });
    renderHook(() => useGlossaryTerms("1145360"));
    ensureGlossaryLoaded("1145360");
    await settle();
    ensureGlossaryLoaded("1145360");
    ensureGlossaryLoaded("1145360");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("a library that is not installed gives no words and no error", async () => {
    rpc.mockResolvedValue({ ok: true, installed: false, game_title: "", terms: [], reason: "not installed" });
    const { result } = renderHook(() => useGlossaryTerms("2321470"));
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(result.current).toEqual([]);
  });

  it("a failed call gives no words and is asked again next time", async () => {
    rpc.mockRejectedValueOnce(new Error("RPC timeout"));
    const { result } = renderHook(() => useGlossaryTerms("2321470"));
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(result.current).toEqual([]);
    rpc.mockResolvedValueOnce({ ok: false, error: "bad", terms: [] });
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(result.current).toEqual([]);
    rpc.mockResolvedValueOnce(WORDS_ANSWER);
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(result.current).toHaveLength(1);
  });

  it("forgets everything when the library is removed or put in place", async () => {
    rpc.mockResolvedValueOnce(WORDS_ANSWER);
    const { result } = renderHook(() => useGlossaryTerms("2321470"));
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(result.current).toHaveLength(1);
    // The library goes: the next answer is empty, and the words on screen go with it.
    rpc.mockResolvedValueOnce({ ok: true, installed: false, game_title: "", terms: [], reason: "" });
    act(() => announceKbLibraryChange({ installed: false }));
    await settle();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual([]);
    // It comes back: the words are asked for again and arrive.
    rpc.mockResolvedValueOnce(WORDS_ANSWER);
    act(() => announceKbLibraryChange({ installed: true, path: "/x", version: "1" }));
    await settle();
    expect(result.current).toHaveLength(1);
  });

  it("asks again after a gap with nothing on screen, in case the library changed unheard", async () => {
    rpc.mockResolvedValueOnce({ ok: true, installed: false, game_title: "", terms: [], reason: "" });
    const first = renderHook(() => useGlossaryTerms("2321470"));
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(first.result.current).toEqual([]);
    first.unmount();
    // A question appears again later; the library may have changed while nothing was listening.
    rpc.mockResolvedValueOnce(WORDS_ANSWER);
    const second = renderHook(() => useGlossaryTerms("2321470"));
    ensureGlossaryLoaded("2321470");
    await settle();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(second.result.current).toHaveLength(1);
  });

  it("gives the same list object until it changes", async () => {
    rpc.mockResolvedValue(WORDS_ANSWER);
    const { result, rerender } = renderHook(() => useGlossaryTerms("2321470"));
    const empty = result.current;
    rerender();
    expect(result.current).toBe(empty);
    ensureGlossaryLoaded("2321470");
    await settle();
    const loaded = result.current;
    rerender();
    expect(result.current).toBe(loaded);
    // A fresh answer with the same words keeps the very same list.
    act(() => announceKbLibraryChange({ installed: true, path: "/x", version: "2" }));
    await settle();
    expect(result.current).toBe(loaded);
  });

  it("does not take a library change nobody on screen was waiting for", () => {
    renderHook(() => useGlossaryTerms("2321470")).unmount();
    // With nothing mounted the note is kept for the Ollama tab's own section to hear.
    announceKbLibraryChange({ installed: false });
    const heard: unknown[] = [];
    addKbLibraryListener((change) => heard.push(change))();
    expect(heard).toEqual([{ installed: false }]);
  });
});
