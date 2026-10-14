/**
 * Title: After Remove, the switch reads off when its value comes from the plugin's settings hook
 *
 * Purpose: Pin plan 93 block C part 2, round 2 (docs/test-evidence/plan93-P93-K1-KB-SWITCH.json). The first
 * fix told the section on screen, and the Deck still showed the switch ON for 30 s and after leaving the tab,
 * while settings.json said off. The switch does not live in the section: it is read from the settings hook
 * above the tab, and a box rebuilds that hook too. The hook that comes back is filled from the note taken as
 * the box opened (bonsaiSessionSurvival.ts), and that note still says "on". So these tests use the real hook,
 * the real note, and a back end stand-in with a "disk", and read the switch the section draws.
 *
 * Does not: run the real back end or Decky; the box and its rebuild are stood in for (as afterBoxHarness does).
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ box: null as unknown }));

vi.mock("@decky/ui", async () => {
  const stubs = await import("../test-harness/fakeDeckyUi");
  return {
    ...stubs,
    showModal: (el: unknown) => {
      hoisted.box = el;
      return { Close: () => {}, Update: () => {} };
    },
  };
});

import { KnowledgeBaseSection, resetKbDownloadInFlightForTests } from "./KnowledgeBaseSection";
import { usePluginSettings } from "../hooks/usePluginSettings";
import { buildInitialSessionSnapshot } from "../features/plugin-shell/initialSessionSnapshot";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  finalizeSessionRestoreAfterRemount,
} from "../utils/bonsaiSessionSurvival";
import { drawConfirmBox } from "../test-harness/confirmBoxProbe";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "../test-harness/fakeDeckyRpc";
import { defaultSettingsFixture } from "../test-harness/rpcFixtures";

const SWITCH = '[label="Use local knowledge base"]';
const switchIsOn = () => Boolean((document.querySelector(SWITCH) as unknown as { checked?: boolean })?.checked);
const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

type Disk = Record<string, unknown>;
let disk: Disk;
let finishDelete: () => void;
let closeBox: () => void;
let rebuild: () => void;
let screens: Array<{ unmount: () => void }>;

/** The plugin's screen as index.tsx builds it, down to what Remove touches: the hook, the note, the section. */
function PluginScreen() {
  // A rebuilt screen reads the note taken as the box opened (useSessionRestoreAfterRemount does this on the Deck).
  const restored = React.useRef(consumeBonsaiSessionAfterRemount());
  const settings = usePluginSettings();
  React.useEffect(() => finalizeSessionRestoreAfterRemount(), []);
  void restored;
  return (
    <KnowledgeBaseSection
      useLocalKnowledgeBase={settings.useLocalKnowledgeBase}
      setUseLocalKnowledgeBase={settings.setUseLocalKnowledgeBase}
      ragCorpusVersion={settings.ragCorpusVersion}
      ollamaIp="127.0.0.1"
      ollamaLocalOnDeck={true}
      onBeforeDeckyModal={() =>
        captureBonsaiSessionForModal({ ...buildInitialSessionSnapshot(), settingsSnapshot: settings.settingsSnapshot })
      }
      onCompleteDeckyModalClose={(close) => {
        closeBox = close;
      }}
    />
  );
}

function mountScreen() {
  screens.push(render(<PluginScreen />));
}

async function pressRemove() {
  fireEvent.click(await screen.findByText("Remove"));
  await waitFor(() => expect(hoisted.box).not.toBeNull());
  drawConfirmBox(hoisted.box).pressAction();
  await settle();
}

async function finishRemoval() {
  finishDelete();
  await settle();
  await settle();
}

beforeEach(() => {
  resetFakeDeckyRpc();
  resetKbDownloadInFlightForTests();
  clearBonsaiSessionSurvival();
  hoisted.box = null;
  screens = [];
  disk = {
    ...defaultSettingsFixture(),
    use_local_knowledge_base: true,
    rag_corpus_path: "/run/media/deck/card/.bonsai/rag",
    rag_corpus_version: "1.0.0",
  };
  setRpcHandler("load_settings", () => ({ ...disk }));
  setRpcHandler("save_settings", (...args: unknown[]) => {
    disk = { ...disk, ...(args[0] as Disk) };
    return { ...disk };
  });
  setRpcHandler("get_rag_corpus_status", () =>
    ragCorpusStatusFixture({ installed: disk.rag_corpus_path !== "", corpus_version: String(disk.rag_corpus_version) }),
  );
  setRpcHandler(
    "remove_rag_corpus",
    () =>
      new Promise((resolve) => {
        finishDelete = () => {
          disk = { ...disk, use_local_knowledge_base: false, rag_corpus_path: "", rag_corpus_version: "" };
          resolve({ ok: true, removed: true });
        };
      }),
  );
  rebuild = () => {
    screens.forEach((s) => s.unmount());
    screens = [];
    mountScreen();
    closeBox();
  };
});

describe("after Remove, with the switch read from the settings hook and the box rebuilding the screen", () => {
  it("reads off when the delete finishes first and the screen is rebuilt from the note afterwards", async () => {
    mountScreen();
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await pressRemove();
    await finishRemoval();
    act(() => rebuild());
    await settle();
    await waitFor(() => expect(switchIsOn()).toBe(false));
    await act(() => new Promise<void>((r) => setTimeout(r, 600)));
    expect(switchIsOn()).toBe(false);
    expect(disk.use_local_knowledge_base).toBe(false);
  });

  it("reads off when the screen is rebuilt first and the delete finishes afterwards", async () => {
    mountScreen();
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await pressRemove();
    act(() => rebuild());
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await finishRemoval();
    await waitFor(() => expect(switchIsOn()).toBe(false));
    await act(() => new Promise<void>((r) => setTimeout(r, 600)));
    expect(switchIsOn()).toBe(false);
    expect(disk.use_local_knowledge_base).toBe(false);
  });

  it("reads off when the delete finishes while the rebuilt screen is still loading its settings", async () => {
    mountScreen();
    await waitFor(() => expect(switchIsOn()).toBe(true));
    await pressRemove();
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    setRpcHandler("load_settings", async () => {
      await held;
      return { ...disk };
    });
    act(() => rebuild());
    await finishRemoval();
    await act(async () => {
      release();
    });
    await settle();
    await waitFor(() => expect(switchIsOn()).toBe(false));
    expect(disk.use_local_knowledge_base).toBe(false);
  });
});
