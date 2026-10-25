/**
 * Title: The "Suggest as a tip" call to the back end
 * Purpose: Pin the call name, the argument order the back end reads (question, answer, app id, game name, kind) and what
 *          the screen gets back: the file name and the link when it works, the back end's own words when it refuses,
 *          and a readable line when the call fails or the answer is malformed.
 * Used for: suggestTipApi.ts (plan 100, lane J).
 * Does not: Talk to a real back end; the call is a stand-in.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { callDeckyWithTimeout } = vi.hoisted(() => ({ callDeckyWithTimeout: vi.fn() }));
vi.mock("../../shared/deckyCall", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../shared/deckyCall")>()),
  callDeckyWithTimeout,
}));

import { suggestRagCorpusTip } from "./suggestTipApi";

const REQ = { question: "How do I heal?", answer: "Rest at a bench.", appId: "367520", appName: "Hollow Knight", kind: "mechanic" };

describe("suggestRagCorpusTip", () => {
  beforeEach(() => callDeckyWithTimeout.mockReset());

  it("sends the five values in the order the back end reads them", async () => {
    callDeckyWithTimeout.mockResolvedValue({ ok: true, file: "a.json", issue_url: "https://x/issues/new?title=t", error: "" });
    await expect(suggestRagCorpusTip(REQ)).resolves.toEqual({ ok: true, file: "a.json", issueUrl: "https://x/issues/new?title=t" });
    expect(callDeckyWithTimeout).toHaveBeenCalledWith("suggest_rag_corpus_tip", [
      "How do I heal?", "Rest at a bench.", "367520", "Hollow Knight", "mechanic",
    ]);
  });

  it("passes the refusal's words through, which name the Permissions tab", async () => {
    const error = "Filesystem writes are disabled. Enable them in the Permissions tab.";
    callDeckyWithTimeout.mockResolvedValue({ ok: false, file: "", issue_url: "", error });
    await expect(suggestRagCorpusTip(REQ)).resolves.toEqual({ ok: false, error });
  });

  it("reads a malformed answer as not ok with a readable line", async () => {
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: true });
    await expect(suggestRagCorpusTip(REQ)).resolves.toEqual({ ok: false, error: "Could not save the tip." });
    callDeckyWithTimeout.mockResolvedValueOnce(null);
    await expect(suggestRagCorpusTip(REQ)).resolves.toEqual({ ok: false, error: "Could not save the tip." });
    callDeckyWithTimeout.mockResolvedValueOnce({ ok: false, error: "" });
    await expect(suggestRagCorpusTip(REQ)).resolves.toEqual({ ok: false, error: "Could not save the tip." });
  });

  it("turns a failed or timed-out call into a readable line instead of throwing", async () => {
    callDeckyWithTimeout.mockRejectedValueOnce(new Error("RPC timeout after 15000ms: suggest_rag_corpus_tip"));
    await expect(suggestRagCorpusTip(REQ)).resolves.toEqual({
      ok: false,
      error: "Could not save the tip: RPC timeout after 15000ms: suggest_rag_corpus_tip",
    });
  });
});
