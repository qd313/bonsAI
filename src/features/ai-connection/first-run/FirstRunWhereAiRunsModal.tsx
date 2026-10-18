/**
 * Title: The first-run popup "Where should the AI run?"
 *
 * Purpose: Right after a new player closes the Beta Notice, this popup asks where the AI should run: on
 * this Deck (the switch starts on) or on a PC on the home network. It is the Ollama tab's "Where the AI
 * runs" section drawn as a popup. With the switch on it offers the Start-with-the-Deck switch, the real
 * state of the local Ollama setup and Install Ollama (the same notice-then-run flow as the tab, shown
 * right here); with it off it offers the PC address, Test connection and, only with the Developer tab on,
 * Find LAN. "Not now" is the first button and holds the ring when the popup opens; it, and B, close the
 * popup and leave everything as it is.
 *
 * Used for: useDisclaimerAndLocalRuntimeGates.tsx, which opens it once after the Beta Notice.
 *
 * Solves: A new player was never asked where the AI runs: the plugin silently assumed this Deck, showed a
 * one-line warning and left the Ollama tab to be found. The warning (the game slows while the AI answers)
 * is now the help line under the first switch.
 *
 * Does not: Own the settings. Each change is applied to the plugin's screen, saved to the back end at once
 * (closing a Decky box rebuilds the screen and throws away a save still waiting on its timer) and carried
 * through that rebuild in the session note; see the host the gate hands in. Does not download anything by
 * itself: Install Ollama opens the download notice first. The tab keeps the same section for later; the
 * setup flow, the startup entry and Find LAN here are the tab's own hooks (useLocalOllamaSetupFlow,
 * useOllamaLocalAutostart, useMdnsOllamaDiscovery), the connection test the shared plain function.
 *
 * Focus: one column of stops (useFirstRunPopupNav.ts), every one answering all four directions; the foot
 * row is [Not now] [Install Ollama | Update AI & models | Test connection]. See docs/focus-graph.md,
 * "The first-run popup (plan 96 N1)".
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ModalRoot, TextField } from "@decky/ui";

import { BonsaiModalScope } from "../../../shared/BonsaiModalScope";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../../shared/deckyCall";
import { registerModalReturnFocusOwner } from "../../../shared/dpad/modalReturnFocusRegistry";
import { textPx } from "../../../styles/textPx";
import type { BonsaiSettings, BonsaiSettingsSnapshotInput } from "../../settings/bonsaiSettingsSchema";
import { useDeveloperTabShown } from "../../settings/developerTabSignal";
import {
  captureBonsaiSessionForModal,
  patchPendingSessionSettingsSnapshot,
  peekBonsaiSessionPendingRestore,
} from "../../plugin-shell/bonsaiSessionSurvival";
import type { SearchStopProps } from "../../search-tab/useSearchNav";
import { isHttpsOllamaAddress, OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "../ollamaAddress";
import { LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED } from "../OllamaWhereAiRunsSection.constants";
import type { ConnectionStatus, LocalOllamaSetupStatus, MdnsOllamaHost } from "../OllamaWhereAiRunsSection.types";
import { OLLAMA_ROW_HELP } from "../ollamaTabFolds";
import { OllamaSetupStatusLine } from "../OllamaSetupStatusLine";
import { useLocalOllamaSetupFlow } from "../useLocalOllamaSetupFlow";
import { useMdnsOllamaDiscovery } from "../useMdnsOllamaDiscovery";
import { useOllamaLocalAutostart } from "../useOllamaLocalAutostart";
import { FIRST_RUN_HELP_STYLE, PopupButton, PopupSwitch } from "./FirstRunPopupParts";
import { probeOllama, probeTarget } from "./ollamaConnectionProbe";
import { useFirstRunPopupNav } from "./useFirstRunPopupNav";

/** Every word the popup says, in one place, so the wording test and the screen read the same. */
export const FIRST_RUN_POPUP_WORDS = {
  title: "Where should the AI run?",
  lead:
    "bonsAI needs Ollama, a free program that runs the AI. It can run on this Deck or on a PC on your home network. " +
    "You can change this later on the Ollama tab.",
  runOnDeck: "Run AI on this Deck",
  runOnDeckHelp:
    "Works anywhere, no PC needed. The AI and your game share the Deck's chip, so both slow down while it answers.",
  autostart: "Start the AI with the Deck",
  autostartHelp: "Starts it each time the Deck turns on, so the first answer comes sooner.",
  installNote:
    "Install Ollama downloads it and the starter models, about 4.6 GB. You are asked before anything downloads.",
  pcAddress: "PC address",
  pcNeeds: "The PC needs Ollama with a model, and must accept connections from your network.",
  notNow: "Not now",
  close: "Close",
  install: "Install Ollama",
  update: "Update AI & models",
  test: "Test connection",
} as const;

/** What the gate hands the popup: the settings as they are now, and how to change and save them. */
export type FirstRunWhereAiRunsHost = {
  ollamaLocalOnDeck: boolean;
  ollamaLocalAutostart: boolean;
  ollamaIp: string;
  /** The plugin screen's own setters, so the screen agrees with the popup if it is still mounted. */
  setOllamaLocalOnDeck: (v: boolean) => void;
  setOllamaLocalAutostart: (v: boolean) => void;
  setOllamaIp: (ip: string) => void;
  /** Writes the address to the device's storage (the tab does this only after a test that connected). */
  persistOllamaIp: (ip: string) => void;
  /** Saves a patch to the back end right now, before the popup can close and rebuild the screen. */
  saveSettingsNow: (patch: Partial<BonsaiSettings>) => void;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

export type FirstRunWhereAiRunsModalProps = {
  host: FirstRunWhereAiRunsHost;
  /** Not now, B, and the Close that takes its place once a setup has run: closes the popup. */
  onClose: () => void;
};

/** The typed address, kept in the session note too: the screen that comes back after the popup reads it from there first. */
function rememberAddressThroughRebuild(ip: string): void {
  const pending = peekBonsaiSessionPendingRestore();
  if (pending) captureBonsaiSessionForModal({ ...pending, ollamaIp: ip });
}

const noop = () => {};

/**
 * The popup. In: the settings as they are now with the ways to change and save them (the host), and the
 * one close. Out: the box. What can go wrong: a failed save or test is shown or logged, never left as a
 * button that stays busy; a download refused for any reason shows on the setup line.
 */
export function FirstRunWhereAiRunsModal({ host, onClose }: FirstRunWhereAiRunsModalProps): React.ReactElement {
  const [onDeck, setOnDeck] = useState(host.ollamaLocalOnDeck);
  const [autostart, setAutostart] = useState(host.ollamaLocalAutostart);
  const [ip, setIp] = useState(host.ollamaIp);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [deckIp, setDeckIp] = useState("...");
  const [setupStatus, setSetupStatus] = useState<LocalOllamaSetupStatus | null>(null);
  const [autostartBusy, setAutostartBusy] = useState(false);
  const [mdnsDiscovering, setMdnsDiscovering] = useState(false);
  const [mdnsHosts, setMdnsHosts] = useState<MdnsOllamaHost[]>([]);
  const [mdnsMessage, setMdnsMessage] = useState<string | null>(null);
  const findLanShown = useDeveloperTabShown() && !onDeck;
  const setupBusy = setupStatus?.phase === "running";
  const nav = useFirstRunPopupNav();
  const probeSeq = useRef(0);
  const setupAutoTestRanRef = useRef(false);
  const onTestRef = useRef<(opts?: { quiet?: boolean }) => Promise<void>>(async () => {});
  // After the download box over the popup closes, the ring comes back to the action button through the
  // popup's own Steam transfer, not a plain focus (the advisor's one note before landing, plan 96 N1).
  const setReturnOwner = useCallback(
    (el: HTMLElement | null) => registerModalReturnFocusOwner("ollama-local-setup", el, () => nav.focusStop("foot", 1)),
    [nav],
  );

  /** The test, for whichever place the AI is set to run. A newer test's answer is the only one kept. */
  const runTest = async (opts?: { quiet?: boolean }) => {
    const target = probeTarget(onDeck, ip);
    if (!target) return;
    const seq = ++probeSeq.current;
    if (!opts?.quiet) {
      setTesting(true);
      setConnection(null);
    }
    const result = await probeOllama(target);
    if (!opts?.quiet) setTesting(false);
    if (seq !== probeSeq.current || !result) return;
    setConnection(result);
    // As on the tab: an address that answered is the one to remember; the Deck's own never replaces it.
    if (result.reachable && !onDeck) host.persistOllamaIp(target);
  };
  onTestRef.current = runTest;

  // With the AI on this Deck, look once (and again when the switch comes back on) so the setup line is true.
  useEffect(() => {
    if (!onDeck) return;
    void onTestRef.current({ quiet: true });
  }, [onDeck]);

  useEffect(() => {
    callDeckyWithTimeout<[], string>("get_deck_ip", [], DECKY_RPC_TIMEOUT_MS)
      .then((deck) => setDeckIp(deck ?? "unknown"))
      .catch(() => setDeckIp("unknown"));
  }, []);

  const commit = (patch: Partial<BonsaiSettings>, snapshot: Partial<BonsaiSettingsSnapshotInput>) => {
    host.saveSettingsNow(patch);
    patchPendingSessionSettingsSnapshot(snapshot);
  };

  const changeOnDeck = (next: boolean) => {
    setOnDeck(next);
    setConnection(null);
    host.setOllamaLocalOnDeck(next);
    commit({ ollama_local_on_deck: next }, { ollamaLocalOnDeck: next });
  };

  const { handleToggleAutostart } = useOllamaLocalAutostart({
    setAutostartStatus: noop,
    setAutostartBusy,
    setOllamaLocalAutostart: (next) => {
      setAutostart(next);
      host.setOllamaLocalAutostart(next);
      commit({ ollama_local_autostart: next }, { ollamaLocalAutostart: next });
    },
  });

  const changeIp = (next: string) => {
    setIp(next);
    host.setOllamaIp(next);
    rememberAddressThroughRebuild(next);
  };

  const { openMdnsDiscoveryConfirm } = useMdnsOllamaDiscovery({
    mdnsDiscovering,
    setMdnsDiscovering,
    setMdnsHosts,
    setMdnsDiscoveryMessage: setMdnsMessage,
    ollamaLocalOnDeck: onDeck,
    localSetupBusy: setupBusy,
    onBeforeDeckyModal: host.onBeforeDeckyModal,
    onCompleteDeckyModalClose: host.onCompleteDeckyModalClose,
  });
  // Find LAN (Developer tab only): the first PC it finds has its address filled in.
  useEffect(() => {
    const first = mdnsHosts[0];
    if (first) changeIp(first.host);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a new result only
  }, [mdnsHosts]);

  const { formatLocalSetupStageLine, runLocalSetupInPlace } = useLocalOllamaSetupFlow({
    ollamaLocalOnDeck: onDeck,
    localSetupStatus: setupStatus,
    setLocalSetupStatus: setSetupStatus,
    localSetupBusy: setupBusy,
    setupAutoTestRanRef,
    onBeforeDeckyModal: host.onBeforeDeckyModal,
    onCompleteDeckyModalClose: host.onCompleteDeckyModalClose,
    onTestConnectionRef: onTestRef,
  });

  // The ring starts on Not now. Two frames: the popup mounts, then Steam finishes its own first focus pass.
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => nav.focusStop("foot", 0));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
    // Mount only: running again would pull the ring back from wherever the person moved it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = Boolean(connection?.reachable);
  const modelCount = connection?.models?.length ?? 0;
  const setupRan = setupStatus != null && setupStatus.phase !== "idle";
  const setupWord = setupBusy
    ? formatLocalSetupStageLine(setupStatus)
    : ready
      ? `Installed${modelCount > 0 ? ` (${modelCount} model${modelCount === 1 ? "" : "s"})` : ""}`
      : connection === null
        ? "Checking…"
        : "Not installed";
  const pressPrimary = () => {
    if (!onDeck) {
      void runTest();
      return;
    }
    // Known to be empty (the engine is not up, or is up with no models): the box asks about the starter models.
    const noModels = connection != null && !modelCount;
    runLocalSetupInPlace(LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED, "ollama-local-setup", { offerStarterModels: noModels });
  };
  const primaryLabel = onDeck
    ? setupBusy
      ? ready
        ? "Updating…"
        : "Installing…"
      : ready
        ? FIRST_RUN_POPUP_WORDS.update
        : FIRST_RUN_POPUP_WORDS.install
    : testing
      ? "Testing…"
      : FIRST_RUN_POPUP_WORDS.test;

  return (
    <ModalRoot onCancel={onClose}>
      <BonsaiModalScope>
        <div
          className="bonsai-prose"
          data-bonsai-first-run-popup=""
          style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", fontSize: textPx(12), lineHeight: 1.4, color: "#cdd9e6" }}
        >
          <div style={{ fontSize: textPx(16), fontWeight: 700, color: "#ffffff" }}>{FIRST_RUN_POPUP_WORDS.title}</div>
          <div>{FIRST_RUN_POPUP_WORDS.lead}</div>
          <PopupSwitch
            stop={nav.stop("run", 0)}
            label={FIRST_RUN_POPUP_WORDS.runOnDeck}
            help={FIRST_RUN_POPUP_WORDS.runOnDeckHelp}
            checked={onDeck}
            onChange={changeOnDeck}
          />
          {onDeck ? (
            <>
              <PopupSwitch
                stop={nav.stop("start", 0)}
                label={FIRST_RUN_POPUP_WORDS.autostart}
                help={FIRST_RUN_POPUP_WORDS.autostartHelp}
                checked={autostart}
                disabled={autostartBusy}
                onChange={handleToggleAutostart}
              />
              <div style={{ fontSize: textPx(11), fontWeight: 600, color: "#b8c6d6" }} aria-live="polite">
                Local Ollama setup: <span style={{ fontWeight: 400, color: "#9fb7d5" }}>{setupWord}</span>
              </div>
              {setupRan ? (
                <OllamaSetupStatusLine status={setupStatus} stageLine={formatLocalSetupStageLine(setupStatus)} busy={setupBusy} />
              ) : null}
              <div style={FIRST_RUN_HELP_STYLE}>{FIRST_RUN_POPUP_WORDS.installNote}</div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div style={{ fontVariant: "small-caps", letterSpacing: "0.06em", fontSize: textPx(11), fontWeight: 600, color: "#b8c6d6", marginBottom: 2 }}>
                    {FIRST_RUN_POPUP_WORDS.pcAddress}
                  </div>
                  <AddressField stop={nav.stop("address", 0)} value={ip} onChange={changeIp} />
                </div>
                {findLanShown ? (
                  <PopupButton
                    stop={nav.stop("address", 1)}
                    label={mdnsDiscovering ? "…" : "Find LAN"}
                    ariaLabel="Find Ollama on LAN via mDNS"
                    fill={false}
                    greyed={mdnsDiscovering || testing}
                    onPress={openMdnsDiscoveryConfirm}
                  />
                ) : null}
              </div>
              <div style={FIRST_RUN_HELP_STYLE}>{OLLAMA_ROW_HELP.pcAddress}</div>
              {isHttpsOllamaAddress(ip) ? (
                <div style={{ fontSize: textPx(11), color: "tomato" }}>{OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE}</div>
              ) : null}
              <div style={FIRST_RUN_HELP_STYLE}>
                {"This Deck's IP: "}
                <span style={{ color: "#b8c6d6", fontVariantNumeric: "tabular-nums" }}>{deckIp}</span>
                {". "}
                {FIRST_RUN_POPUP_WORDS.pcNeeds}
              </div>
              {findLanShown && mdnsMessage ? <div style={FIRST_RUN_HELP_STYLE}>{mdnsMessage}</div> : null}
              <TestResultLine
                status={connection}
                hidden={connection?.error === OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE && isHttpsOllamaAddress(ip)}
              />
            </>
          )}
          <div style={{ display: "flex", flexDirection: "row", gap: 8, marginTop: 4 }}>
            <PopupButton
              stop={nav.stop("foot", 0)}
              label={setupRan ? FIRST_RUN_POPUP_WORDS.close : FIRST_RUN_POPUP_WORDS.notNow}
              ariaLabel={setupRan ? "Close this window" : "Not now: set up the AI later on the Ollama tab"}
              onPress={onClose}
            />
            <PopupButton
              stop={nav.stop("foot", 1)}
              label={primaryLabel}
              ariaLabel={onDeck ? "Install Ollama on this Deck" : "Test the connection to the PC"}
              primary
              greyed={onDeck ? setupBusy : testing || !ip.trim()}
              onPress={pressPrimary}
              buttonRef={setReturnOwner}
            />
          </div>
        </div>
      </BonsaiModalScope>
    </ModalRoot>
  );
}

/** The PC address box: Steam's text field, whose stop is the input inside it (a ref on the field holds the component). */
function AddressField({
  stop,
  value,
  onChange,
}: {
  stop: SearchStopProps;
  value: string;
  onChange: (next: string) => void;
}): React.ReactElement {
  const { ref, ...rest } = stop;
  return (
    // focus-patterns-allow: element-scoped query on this component's own wrapper, to hand the walk the input, as the Search tab's find box does.
    <div ref={(box) => ref(box ? (box.querySelector("input") ?? box) : null)}>
      <TextField
        label=""
        value={value}
        spellCheck={false}
        {...(rest as Record<string, unknown>)}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </div>
  );
}

/** The one line a test leaves under the address: connected (green) or the reason it did not (red). */
function TestResultLine({ status, hidden }: { status: ConnectionStatus | null; hidden: boolean }): React.ReactElement | null {
  if (!status || hidden) return null;
  if (status.reachable) {
    const n = status.models?.length ?? 0;
    return (
      <div style={{ fontSize: textPx(12), color: "#81c784" }} aria-live="polite">
        Connected · Ollama v{status.version}
        {n > 0 ? ` · ${n} model${n === 1 ? "" : "s"}` : ""}
      </div>
    );
  }
  return (
    <div style={{ fontSize: textPx(12), color: "tomato" }} aria-live="polite">
      Unreachable — {status.error}
    </div>
  );
}
