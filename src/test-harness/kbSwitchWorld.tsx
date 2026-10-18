/**
 * Title: The plugin screen around the library section, with a back end stand-in that has a disk
 *
 * Purpose: Draws what the Deck draws around the library section for the "Use local knowledge base" switch
 * tests: the real settings hook (the switch is read from it, not from the section), the real session note
 * the hook is refilled from when a Decky box rebuilds the screen (bonsaiSessionSurvival.ts), and a back end
 * stand-in whose settings, library folder and download state live in one "disk" object. A test mounts the
 * screen, opens a box, lets `rebuild()` throw the screen away and build a fresh one (as a box closing does),
 * and reads the switch off the page.
 *
 * Used for: KnowledgeBaseSection.removeSwitchHook.test.tsx and KnowledgeBaseSection.downloadSwitch.test.tsx.
 *
 * Solves: Two tests about the same switch needing the same stage; one copy keeps them from drifting apart.
 *
 * Does not: Mock @decky/ui (each test file does that, to catch the box it opens), or run the real back end.
 */
import React from "react";
import { act, render } from "@testing-library/react";

import { KnowledgeBaseSection } from "../features/knowledge-library/KnowledgeBaseSection";
import { usePluginSettings } from "../features/settings/usePluginSettings";
import { buildInitialSessionSnapshot } from "../features/plugin-shell/initialSessionSnapshot";
import {
  captureBonsaiSessionForModal,
  clearBonsaiSessionSurvival,
  consumeBonsaiSessionAfterRemount,
  finalizeSessionRestoreAfterRemount,
} from "../features/plugin-shell/bonsaiSessionSurvival";
import { ragCorpusStatusFixture, resetFakeDeckyRpc, setRpcHandler } from "./fakeDeckyRpc";
import { defaultSettingsFixture } from "./rpcFixtures";

const SWITCH = '[label="Use local knowledge base"]';

/** What the switch reads, off the page (the stub switch keeps `checked` as a property, not an attribute). */
export const switchIsOn = () =>
  Boolean((document.querySelector(SWITCH) as unknown as { checked?: boolean })?.checked);

export const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

type Disk = Record<string, unknown>;

/** The back end's state. `download` is what the status read reports while a download runs or has ended. */
export const world = {
  disk: {} as Disk,
  download: "idle" as "idle" | "running" | "done",
  finishDelete: () => {},
  finishDownload: () => {},
  closeBox: () => {},
  screens: [] as Array<{ unmount: () => void }>,
};

/** The plugin's screen as index.tsx builds it, down to what the library section touches. */
function PluginScreen() {
  // A rebuilt screen reads the note taken as the box opened (useSessionRestoreAfterRemount does this on the Deck).
  React.useRef(consumeBonsaiSessionAfterRemount());
  const settings = usePluginSettings();
  React.useEffect(() => finalizeSessionRestoreAfterRemount(), []);
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
        world.closeBox = close;
      }}
    />
  );
}

export function mountScreen(): void {
  world.screens.push(render(<PluginScreen />));
}

/** A box closing: the screen is thrown away and a fresh one built, then the box itself closes. */
export function rebuild(): void {
  world.screens.forEach((s) => s.unmount());
  world.screens = [];
  mountScreen();
  world.closeBox();
}

/** A fresh stand-in back end holding the library (or not), with the switch on (or off). */
export function setUpWorld(opts: { installed: boolean }): void {
  resetFakeDeckyRpc();
  clearBonsaiSessionSurvival();
  world.screens = [];
  world.download = "idle";
  world.disk = {
    ...defaultSettingsFixture(),
    use_local_knowledge_base: opts.installed,
    rag_corpus_path: opts.installed ? "/run/media/deck/card/.bonsai/rag" : "",
    rag_corpus_version: opts.installed ? "1.0.0" : "",
  };
  setRpcHandler("load_settings", () => ({ ...world.disk }));
  setRpcHandler("save_settings", (...args: unknown[]) => {
    world.disk = { ...world.disk, ...(args[0] as Disk) };
    return { ...world.disk };
  });
  setRpcHandler("get_rag_corpus_status", () =>
    world.download === "running"
      ? ragCorpusStatusFixture({ phase: "running", done: false, bytes_total: 100, bytes_downloaded: 50, progress_pct: 50 })
      : ragCorpusStatusFixture({
          installed: world.disk.rag_corpus_path !== "",
          corpus_version: String(world.disk.rag_corpus_version),
          use_local_knowledge_base: world.disk.use_local_knowledge_base === true,
          ...(world.download === "done" ? { phase: "done", done: true } : {}),
        }),
  );
  setRpcHandler(
    "remove_rag_corpus",
    () =>
      new Promise((resolve) => {
        world.finishDelete = () => {
          world.disk = { ...world.disk, use_local_knowledge_base: false, rag_corpus_path: "", rag_corpus_version: "" };
          resolve({ ok: true, removed: true });
        };
      }),
  );
  setRpcHandler("start_rag_corpus_download", () => {
    world.download = "running";
    world.finishDownload = () => {
      // The back end saves the settings first and flips the state to done after (rag_corpus_download_service.py).
      world.disk = {
        ...world.disk,
        use_local_knowledge_base: true,
        rag_corpus_path: "/run/media/deck/card/.bonsai/rag",
        rag_corpus_version: "1.0.0",
      };
      world.download = "done";
    };
    return { accepted: true };
  });
}
