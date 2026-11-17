/**
 * Title: The first-time setup popup: one first screen with a checklist, the Internet downloads switch, then OK
 *
 * Purpose: The one box a new player sees the first time bonsAI opens (plan 105, lane D3; board 5, tab 4, round 4 B,
 * as picked on 2026-11-16). Top to bottom: "Welcome to bonsAI. Where should the AI run?"; the checklist of the five
 * downloads with their sizes and sites and tick boxes (firstRunChecklist.tsx; Ollama and the answer model locked
 * on); the real Internet downloads switch in the Permissions tab's words, saved the moment it is switched
 * (FirstRunDownloadsSwitch.tsx); one row of three buttons, "OK, install on this Deck", "Use the AI on my PC" and
 * "Not now"; and one short beta line. OK is grey until the switch is on, and a press on grey OK moves the ring to
 * the switch and does nothing else. OK starts every ticked download (the starter set, with what was unticked left
 * out) and closes the box. "Use the AI on my PC" opens the second screen (FirstRunPcScreen.tsx). "Not now", and B,
 * close the box and change nothing: nothing downloads, and the switch stays as the person left it.
 *
 * Used for: useDisclaimerAndLocalRuntimeGates.tsx, which opens it once on a first open (it replaced the Beta Notice
 * box and the old "Where should the AI run?" popup, whose PC half is the second screen now).
 *
 * Solves: First-time setup took six presses and three boxes (the Beta Notice, the popup, the download box), and
 * pressing Install while the popup still said "Checking…" started a setup with no AI model. There is no check on
 * this screen any more: OK always starts the starter set, which skips whatever is already on the Deck.
 *
 * Does not: Own the settings. The switch saves through the download notice's permission save (plan 104's path:
 * a failed save puts it back with a message); the PC screen's changes are applied to the plugin's screen, saved to
 * the back end at once and carried through the rebuild in the session note (see the host the gate hands in). Does
 * not draw the run's progress: OK hands the run to the Main tab's card (main-tab/FirstRunSetupCard.tsx, through
 * firstRunSetupStore.ts), which shows it with Stop once the box closes.
 *
 * Focus: one column of stops per screen (useFirstRunPopupNav.ts), every stop answering all four directions, the
 * ring starting on the safe button (Not now; Back on the PC screen), Down from the switch landing on OK once it can
 * be pressed and on Not now before. See docs/focus-graph.md, "The first-time setup popup (plan 105 D3)".
 */
import React, { useEffect, useRef, useState } from "react";
import { ModalRoot } from "@decky/ui";

import { BonsaiModalScope } from "../../../shared/BonsaiModalScope";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../../shared/deckyCall";
import { textPx } from "../../../styles/textPx";
import type { BonsaiSettings, BonsaiSettingsSnapshotInput } from "../../settings/bonsaiSettingsSchema";
import {
  captureBonsaiSessionForModal,
  patchPendingSessionSettingsSnapshot,
  peekBonsaiSessionPendingRestore,
} from "../../plugin-shell/bonsaiSessionSurvival";
import { internetDownloadsSwitchState, setInternetDownloadsFromSwitch } from "../../downloads/downloadNotice";
import { beginFirstRunSetup } from "../../main-tab/firstRunSetupStore";
import { rememberStarterLeftOut, type StarterLeftOut } from "../../models/starterSetLeftOut";
import type { ConnectionStatus, MdnsOllamaHost } from "../OllamaWhereAiRunsSection.types";
import { useMdnsOllamaDiscovery } from "../useMdnsOllamaDiscovery";
import { FIRST_RUN_BOX } from "./firstRunBoxLayout";
import { FirstRunChecklist, leftOutFromTicks, type ChecklistTicks } from "./firstRunChecklist";
import { FirstRunDownloadsSwitch } from "./FirstRunDownloadsSwitch";
import { FirstRunPcScreen } from "./FirstRunPcScreen";
import { PopupButton } from "./FirstRunPopupParts";
import { probeOllama, probeTarget } from "./ollamaConnectionProbe";
import {
  FIRST_SCREEN_ROWS,
  FOOT_NOT_NOW,
  FOOT_OK,
  FOOT_PC,
  PC_FOOT_BACK,
  PC_SCREEN_ROWS,
  useFirstRunPopupNav,
} from "./useFirstRunPopupNav";

/** Every word of the first screen that is not in the checklist or the switch, in one place for the tests. */
export const FIRST_RUN_POPUP_WORDS = {
  title: "Welcome to bonsAI. Where should the AI run?",
  ok: "OK, install on this Deck",
  pc: "Use the AI on my PC",
  notNow: "Not now",
  beta: "Beta: the AI can be wrong, and heavy AI can crash a game. Use at your own risk. Not now changes nothing.",
} as const;

/** What the gate hands the popup: the settings as they are now, and how to change and save them. */
export type FirstRunWhereAiRunsHost = {
  ollamaLocalOnDeck: boolean;
  /** Kept for the gate's host; the first screen no longer shows the Start-with-the-Deck switch (the Ollama tab does). */
  ollamaLocalAutostart: boolean;
  ollamaIp: string;
  /** The plugin screen's own setters, so the screen agrees with the popup if it is still mounted. */
  setOllamaLocalOnDeck: (v: boolean) => void;
  setOllamaLocalAutostart: (v: boolean) => void;
  setOllamaIp: (ip: string) => void;
  /** Writes the address to the device's storage (the tab does this only after a test that connected). */
  persistOllamaIp: (ip: string) => void;
  /** Saves a patch to the back end right now, before the popup can close and rebuild the screen; settles when tried. */
  saveSettingsNow: (patch: Partial<BonsaiSettings>) => void | Promise<void>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
};

export type FirstRunWhereAiRunsModalProps = {
  host: FirstRunWhereAiRunsHost;
  /** Not now, B on the first screen, OK after it starts the setup, and Ask your first question: close the popup. */
  onClose: () => void;
};

/** The typed address, kept in the session note too: the screen that comes back after the popup reads it from there first. */
function rememberAddressThroughRebuild(ip: string): void {
  const pending = peekBonsaiSessionPendingRestore();
  if (pending) captureBonsaiSessionForModal({ ...pending, ollamaIp: ip });
}

/** The ring onto a screen's safe button, two frames after it is drawn (Steam finishes its own first focus pass first). */
function useRingOnOpen(land: () => void, key: string): void {
  const landRef = useRef(land);
  landRef.current = land;
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => landRef.current());
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [key]);
}

const TITLE_STYLE = { fontSize: textPx(FIRST_RUN_BOX.titlePx), fontWeight: 700, color: "#ffffff", lineHeight: FIRST_RUN_BOX.titleLineHeight };
const BETA_STYLE = { fontSize: textPx(FIRST_RUN_BOX.betaPx), lineHeight: FIRST_RUN_BOX.betaLineHeight, color: "#8fa0b4", userSelect: "none" as const };

/**
 * The popup. In: the settings as they are now with the ways to change and save them (the host), and the one close.
 * Out: the box. What can go wrong: a failed switch save puts the switch back with a message and OK stays grey; a
 * refused setup start shows its message; a failed test shows on its line.
 */
export function FirstRunWhereAiRunsModal({ host, onClose }: FirstRunWhereAiRunsModalProps): React.ReactElement {
  const [screen, setScreen] = useState<"first" | "pc">("first");
  const [ticks, setTicks] = useState<ChecklistTicks>({ note_search: true, voice: true });
  const [initialSwitch] = useState(internetDownloadsSwitchState);
  /** What the switch shows (at once on a press), and what has been saved (OK and Down follow this one). */
  const [shownOn, setShownOn] = useState(initialSwitch.on);
  const [savedOn, setSavedOn] = useState(initialSwitch.on);
  const [switchBusy, setSwitchBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [onDeck, setOnDeck] = useState(host.ollamaLocalOnDeck);
  const [ip, setIp] = useState(host.ollamaIp);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [deckIp, setDeckIp] = useState("...");
  const [mdnsDiscovering, setMdnsDiscovering] = useState(false);
  const [mdnsHosts, setMdnsHosts] = useState<MdnsOllamaHost[]>([]);
  const [mdnsMessage, setMdnsMessage] = useState<string | null>(null);
  const probeSeq = useRef(0);
  const savedOnRef = useRef(savedOn);
  savedOnRef.current = savedOn;

  const firstNav = useFirstRunPopupNav(FIRST_SCREEN_ROWS, (_from, to) => (to === "foot" ? (savedOnRef.current ? FOOT_OK : FOOT_NOT_NOW) : null));
  const pcNav = useFirstRunPopupNav(PC_SCREEN_ROWS, (_from, to) => (to === "foot" ? PC_FOOT_BACK : to === "address" ? 0 : null));
  useRingOnOpen(() => (screen === "pc" ? pcNav.focusStop("foot", PC_FOOT_BACK) : firstNav.focusStop("foot", FOOT_NOT_NOW)), screen);

  useEffect(() => {
    callDeckyWithTimeout<[], string>("get_deck_ip", [], DECKY_RPC_TIMEOUT_MS)
      .then((deck) => setDeckIp(deck ?? "unknown"))
      .catch(() => setDeckIp("unknown"));
  }, []);

  const commit = (patch: Partial<BonsaiSettings>, snapshot: Partial<BonsaiSettingsSnapshotInput>) => {
    patchPendingSessionSettingsSnapshot(snapshot);
    return host.saveSettingsNow(patch);
  };
  const setAiOnDeck = (next: boolean) => {
    setOnDeck(next);
    host.setOllamaLocalOnDeck(next);
    return commit({ ollama_local_on_deck: next }, { ollamaLocalOnDeck: next });
  };

  /* ---- the first screen ---- */
  const toggleTick = (tick: StarterLeftOut) => setTicks((prev) => ({ ...prev, [tick]: !prev[tick] }));

  const pressSwitch = () => {
    if (switchBusy) return;
    const want = !shownOn;
    if (!initialSwitch.kidsLock) setShownOn(want);
    setSwitchBusy(true);
    void setInternetDownloadsFromSwitch(want).then((now) => {
      setShownOn(now);
      setSavedOn(now);
      setSwitchBusy(false);
    });
  };

  const pressOk = () => {
    if (starting) return;
    setStarting(true);
    void (async () => {
      const leaveOut = leftOutFromTicks(ticks);
      rememberStarterLeftOut(leaveOut);
      // The back end checks its own file before it starts: the AI on this Deck must be on disk first.
      if (!onDeck) await setAiOnDeck(true);
      beginFirstRunSetup(leaveOut);
      onClose();
    })();
  };

  /* ---- the PC screen ---- */
  const runTest = async () => {
    const target = probeTarget(false, ip);
    if (!target) return;
    const seq = ++probeSeq.current;
    setTesting(true);
    setConnection(null);
    const result = await probeOllama(target);
    setTesting(false);
    if (seq !== probeSeq.current || !result) return;
    setConnection(result);
    // As on the tab: an address that answered is the one to remember, and the AI now runs on that PC.
    if (result.reachable) {
      host.persistOllamaIp(target);
      void setAiOnDeck(false);
    }
  };

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
    ollamaLocalOnDeck: false,
    localSetupBusy: false,
    onBeforeDeckyModal: host.onBeforeDeckyModal,
    onCompleteDeckyModalClose: host.onCompleteDeckyModalClose,
  });
  // Find LAN: the first PC it finds has its address filled in.
  useEffect(() => {
    const first = mdnsHosts[0];
    if (first) changeIp(first.host);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a new result only
  }, [mdnsHosts]);

  const back = () => setScreen("first");

  return (
    <ModalRoot onCancel={screen === "pc" ? back : onClose}>
      <BonsaiModalScope>
        {screen === "pc" ? (
          <div className="bonsai-prose" data-bonsai-first-run-popup="pc" style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", fontSize: textPx(12), lineHeight: 1.4, color: "#cdd9e6" }}>
            <FirstRunPcScreen
              nav={pcNav}
              ip={ip}
              onIpChange={changeIp}
              deckIp={deckIp}
              connection={connection}
              testing={testing}
              mdnsDiscovering={mdnsDiscovering}
              mdnsMessage={mdnsMessage}
              onFindLan={openMdnsDiscoveryConfirm}
              onTest={() => void runTest()}
              onDone={onClose}
              onBack={back}
            />
          </div>
        ) : (
          <div
            className="bonsai-prose"
            data-bonsai-first-run-popup="first"
            style={{ display: "flex", flexDirection: "column", gap: FIRST_RUN_BOX.gapPx, textAlign: "left", fontSize: textPx(12), lineHeight: 1.4, color: "#cdd9e6" }}
          >
            <div data-bonsai-first-run-part="title" style={TITLE_STYLE}>
              {FIRST_RUN_POPUP_WORDS.title}
            </div>
            <FirstRunChecklist ticks={ticks} onToggle={toggleTick} stop={firstNav.stop} />
            <FirstRunDownloadsSwitch on={shownOn} kidsLock={initialSwitch.kidsLock} stop={firstNav.stop("allow", 0)} onPress={pressSwitch} />
            <div data-bonsai-first-run-part="foot" style={{ display: "flex", flexDirection: "row", gap: 8, marginTop: FIRST_RUN_BOX.footMarginTopPx, height: FIRST_RUN_BOX.footHeightPx }}>
              <PopupButton
                stop={firstNav.stop("foot", FOOT_OK)}
                label={FIRST_RUN_POPUP_WORDS.ok}
                ariaLabel={FIRST_RUN_POPUP_WORDS.ok}
                look="primary"
                greyed={!savedOn || starting}
                onPress={pressOk}
                onGreyPress={() => {
                  if (!savedOn) firstNav.focusStop("allow", 0);
                }}
              />
              <PopupButton stop={firstNav.stop("foot", FOOT_PC)} label={FIRST_RUN_POPUP_WORDS.pc} ariaLabel={FIRST_RUN_POPUP_WORDS.pc} look="plain" onPress={() => setScreen("pc")} />
              <PopupButton stop={firstNav.stop("foot", FOOT_NOT_NOW)} label={FIRST_RUN_POPUP_WORDS.notNow} ariaLabel={FIRST_RUN_POPUP_WORDS.notNow} look="plain" onPress={onClose} />
            </div>
            <div data-bonsai-first-run-part="beta" style={BETA_STYLE}>
              {FIRST_RUN_POPUP_WORDS.beta}
            </div>
          </div>
        )}
      </BonsaiModalScope>
    </ModalRoot>
  );
}
