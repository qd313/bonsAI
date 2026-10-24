/**
 * Title: The AI models screen settles once its list has loaded, instead of drawing itself forever
 *
 * Purpose: Pins a loop found while building plan 91's filters column (plan 92, lane M1): the screen
 * handed the Browse box a brand-new "switch the licence to Tier 2" function every time it drew itself.
 * The box's queued-pull handler is rebuilt whenever that function changes, and the box reports its
 * footer (Done or Pull selected) up to the screen whenever the handler changes, which made the screen
 * draw itself again, with yet another new function: a loop that never stopped while the screen was open.
 * Earlier tests never saw it because they all drew the screen with a stand-in Browse box.
 *
 * Covers: with the real Browse box inside, the screen draws itself only a handful of times once the list
 * has loaded and nothing is pressed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, configure, render, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 10000 });

const hoisted = vi.hoisted(() => ({ draws: 0 }));
/** More draws than any open-and-load needs: past it the screen is looping, and the test stops it rather than hanging. */
const RUNAWAY = 200;

vi.mock("@decky/ui", async () => {
  const stubs = await import("../../test-harness/fakeDeckyUi");
  const RealConfirm = stubs.ConfirmModal;
  const CountingConfirm = (props: Record<string, unknown>) => {
    hoisted.draws += 1;
    if (hoisted.draws > RUNAWAY) throw new Error(`the AI models screen drew itself more than ${RUNAWAY} times`);
    return <RealConfirm {...props} />;
  };
  return { ...stubs, ConfirmModal: CountingConfirm, showModal: () => ({ Close: () => {}, Update: () => {} }) };
});

import { OllamaModelsHubModal } from "./OllamaModelsHubModal";
import { resetFakeDeckyRpc, setRpcHandler } from "../../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../../test-harness/rpcFixtures";

beforeEach(() => {
  resetFakeDeckyRpc();
  hoisted.draws = 0;
  setRpcHandler("load_settings", () => defaultSettingsFixture());
  setRpcHandler("test_ollama_connection", () => ({ reachable: true, version: "0.5.0", models: ["gemma4:e2b-it-qat"] }));
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the AI models screen with the real Browse box inside", () => {
  it("stops drawing itself once the list has loaded and nothing is pressed", async () => {
    let view: ReturnType<typeof render> | null = null;
    // A runaway loop never lets React's own flush finish, so the counting stand-in throws past RUNAWAY draws.
    await act(async () => {
      view = render(
        <OllamaModelsHubModal
          activeRoutingTag={null}
          modelPolicyTier="open_source_only"
          modelPolicyNonFossUnlocked={false}
          modelAllowHighVramFallbacks={false}
          onCommitOllamaModelsHub={vi.fn()}
          onReadModelPolicy={vi.fn()}
          onClose={vi.fn()}
        />
      );
      await new Promise((r) => setTimeout(r, 300));
    });
    await waitFor(() => expect(view!.container.textContent).toContain("Installed 1 ·"));
    const settled = hoisted.draws;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(hoisted.draws - settled, "draws with nothing pressed, after loading").toBeLessThanOrEqual(2);
    expect(settled, "draws while opening and loading").toBeLessThan(40);
  });
});
