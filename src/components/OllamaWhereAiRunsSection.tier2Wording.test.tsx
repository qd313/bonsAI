/**
 * Title: The Tier 2 multimodal install box does not talk about a reply
 *
 * Purpose: Pin plan 76 lane 2 follow-up, bug 3. The "Install Gemma 4 (all-in-one model)" box ended
 * with the Ask-answer footnote ("This reply used an 'open model'..."), though no reply is involved in
 * an install. It now uses the same plain sentence as the two "Enable Tier 2" pull boxes.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ body: null as ReactNode | null }));
vi.mock("../features/downloads/downloadNotice", () => ({
  confirmDownload: async (_n: unknown, opts?: { body?: ReactNode }) => {
    hoisted.body = opts?.body ?? null;
    return false;
  },
}));

import { OllamaWhereAiRunsSection } from "./OllamaWhereAiRunsSection";
import { TIER2_PULL_NOTE } from "../hooks/usePullModelTier2Confirm";
import { resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { markSettingsLoaded, resetSettingsLoadedSignalForTests } from "../features/plugin-shell/settingsLoadedSignal";

beforeEach(() => {
  hoisted.body = null;
  resetFakeDeckyRpc();
  resetSettingsLoadedSignalForTests();
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.12.0", models: [] }));
  markSettingsLoaded();
});

describe("Install Gemma 4 (all-in-one model) box", () => {
  it("ends with the plain Tier 2 sentence, not the reply footnote", async () => {
    render(
      <OllamaWhereAiRunsSection
        ollamaIp="127.0.0.1"
        onOllamaIpChange={() => {}}
        onPersistOllamaIp={() => {}}
        ollamaLocalOnDeck={true}
        setOllamaLocalOnDeck={() => {}}
        ollamaLocalAutostart={false}
        setOllamaLocalAutostart={() => {}}
        namedOllamaHosts={[]}
        setNamedOllamaHosts={() => {}}
        onBeforeDeckyModal={() => {}}
        onCompleteDeckyModalClose={(close) => close()}
        onOpenOllamaModelsHub={() => {}}
      />
    );
    await act(async () => {
      fireEvent.click((await screen.findByText("Install options…")).closest("button")!);
    });
    await act(async () => {
      fireEvent.click((await screen.findByText("Install Gemma 4 (all-in-one model)")).closest("button")!);
    });

    expect(hoisted.body).not.toBeNull();
    const { container } = render(<div>{hoisted.body}</div>);
    const text = container.textContent ?? "";
    expect(text).toContain(TIER2_PULL_NOTE);
    expect(text).not.toContain("This reply used");
  });
});
