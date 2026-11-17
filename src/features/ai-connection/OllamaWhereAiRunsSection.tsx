/**
 * Title: Where AI runs section
 *
 * Purpose: The "Where AI runs" panel at the top of the Ollama tab, where
 * you choose whether the AI runs on this Deck itself or on a PC somewhere
 * on your home network — and everything involved in setting that up:
 * installing or updating Ollama on the Deck, picking a starting model
 * set of models to start with, finding a PC's Ollama on the network automatically, and
 * testing the connection either way.
 *
 * Used for: OllamaTab, the first section drawn.
 *
 * Solves: One place that owns both halves of "which machine answers" — the
 * Deck-local install-and-setup flow, and the LAN-host find-and-connect
 * flow — since only one of the two ever shows at a time, depending on the
 * toggle.
 *
 * Does not: Pull, browse, or manage individual models one at a time, or
 * decide the try-order between them — that is PullModelsModal and the
 * model routing panels. This section only installs or updates Ollama and,
 * on a Deck with no models, offers the starter models in the same box flow.
 *
 * How it works:
 *
 *     ┌─ Where AI runs ──────────────────────────────────┐
 *     │ [ Run AI on this Deck ]         toggle              │
 *     │ [ Start the AI with the Deck ]  toggle (autostart)  │
 *     │  — if Run-on-Deck is ON — (OllamaLocalSetupBlock)    │
 *     │ [ Install Ollama / Update AI & models ]              │
 *     │ [ Browse models  › ]                                 │
 *     │   while a setup runs, both give way to one job card  │
 *     │   with Cancel at its top right (JobCard)             │
 *     │ last result / sites line                             │
 *     │  — if Run-on-Deck is OFF —                            │
 *     │ Saved Ollama hosts (LAN)  <- quick-pick buttons      │
 *     │ Save current PC address as quick host                │
 *     │ PC address [______]  [Test connection] [Find LAN]    │   (Find LAN: everyone)
 *     │ This Deck's IP: …                                    │
 *     │ Found on LAN (mDNS)  <- Use / Save per host          │
 *     │ Connected · Ollama vX · N models  /  Unreachable     │
 *     └────────────────────────────────────────────────────────┘
 *
 * 1. onTestConnection() probes whichever host is currently selected — this
 *    Deck's own loopback address, or the typed PC address — and records
 *    the result; it auto-runs once, quietly, on mount, so the
 *    Install/Update button already knows whether Ollama is reachable
 *    before anyone presses Test.
 * 2. openLocalSetupConfirm() asks first, then starts the install/update run.
 *    With no models installed it then asks a second question, whether to add
 *    the starter models; yes runs the engine-then-models setup, no installs
 *    the engine only.
 * 3. While a local setup runs, a poll every 1.5 seconds reads its status
 *    and the job card shows it in plain words (ollamaSetupJob.ts); once it
 *    reports done with no error, a separate effect runs the connection test
 *    again automatically and, if this was an update, refreshes the model catalog.
 * 4. runMdnsDiscovery() searches the local network for other Ollama
 *    services advertised over mDNS/Bonjour — offered to everyone, but only
 *    when Ask is not already pointed at this Deck.
 * 5. Any host found this way, or a manually typed PC address, can be saved
 *    as one of a short list of named quick-pick buttons (namedOllamaHosts)
 *    so an address used before never needs retyping.
 *
 * Gotchas:
 * - The Deck-local setup buttons form one fixed vertical chain — toggle →
 *   Start-at-boot toggle → Install/Update → Browse → Test connection — and
 *   Up/Down on every one of them is wired by hand to match it, because
 *   Steam's own automatic layout guess does not follow it correctly here.
 *   While a setup runs, the job card's Cancel stands in for Install/Update
 *   and Browse, and the chain is Start-at-boot toggle → Cancel → Test connection.
 * - The "Browse models" button on this panel registers itself as the
 *   return-focus target for the models hub modal. A second, less-used
 *   entry point to the same hub exists on the main Ollama tab but is not
 *   wired the same way — only this one needs to be, since it is the one
 *   people actually press, and its absence here was invisible until it
 *   was checked on the Deck.
 * - A connection test against this Deck's own loopback address gets a much
 *   longer timeout than a LAN test, because probing it can itself start
 *   the Ollama service if it was not already running.
 *
 * The result shapes and the props type live in OllamaWhereAiRunsSection.types.ts; the fixed
 * numbers and canned modal copy live in OllamaWhereAiRunsSection.constants.tsx.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  TextField,
  Button,
  Focusable,
} from "@decky/ui";
import { toaster } from "@decky/api";
import { OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP, MAX_NAMED_OLLAMA_HOSTS } from "../settings/bonsaiSettingsSchema";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../../shared/deckyCall";
import {
  consumeOllamaTabLocalPending,
  peekOllamaTabLocalPending,
  registerOllamaTabLocalGetter,
  unregisterOllamaTabLocalGetter,
} from "./ollamaTabLocalSurvival";
import { tryMoveUpWithPanelScroll } from "../../shared/dpad/settingsPanelScroll";
import { registerModalReturnFocusOwner } from "../../shared/dpad/modalReturnFocusRegistry";
import { OllamaSavedHostsRows } from "./OllamaSavedHostsRows";
import { OllamaLocalSetupBlock, type LocalSetupEntry } from "./OllamaLocalSetupBlock";
import { lastRunningOllamaSetupStatus, noteOllamaSetupStatus, useOllamaSetupStatusReader } from "./ollamaSetupJob";
import { useOllamaLocalAutostart } from "./useOllamaLocalAutostart";
import { useMdnsOllamaDiscovery } from "./useMdnsOllamaDiscovery";
import { tabMdnsDiscovery } from "./mdnsDiscoveryStore";
import { useLocalOllamaSetupFlow } from "./useLocalOllamaSetupFlow";
import { useSettingsLoadedFlag } from "../settings/useSettingsLoadedFlag";
import { isHttpsOllamaAddress, OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE } from "./ollamaAddress";
import type {
  MdnsOllamaHost,
  LocalOllamaSetupStatus,
  OllamaLocalAutostartStatus,
  ConnectionStatus,
} from "./OllamaWhereAiRunsSection.types";
import type { OllamaWhereAiRunsSectionProps } from "./OllamaWhereAiRunsSection.types";
import {
  TEST_CONNECTION_TIMEOUT_SECONDS,
  LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS,
  LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED,
} from "./OllamaWhereAiRunsSection.constants";
import { FOCUS_RING_BTN_CLASS, SETTINGS_GLASS_BTN } from "../../styles/settingsGlassButton";
import { elementHasGamepadFocus } from "../../shared/dpad/uiDocument";
import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import { textPx } from "../../styles/textPx";
import { DenseSwitchRow } from "../folded-tabs/DenseRow";
import { OLLAMA_ROW_HELP } from "./ollamaTabFolds";

export type { OllamaWhereAiRunsSectionProps } from "./OllamaWhereAiRunsSection.types";

/** Steam calls a Focusable's move handlers (never a Decky Button's); the typings do not list them, hence the cast. */
function focusableMoves(onMoveUp: () => boolean, onMoveDown: (() => void) | (() => boolean) | undefined): Record<string, unknown> {
  return { onMoveUp, onMoveDown };
}

/** The object Steam puts in a Focusable's `navRef` once its node is mounted. */
type SteamNode = { TakeFocus?: (gamepad?: boolean) => unknown } | null;

/**
 * The ring onto `target`: Steam's own transfer onto the node of the row around it first, then the target's own
 * focus if that did not land it (a sibling inside one container, where a plain focus is safe). False with no target.
 */
function takeRowThenFocus(node: { current: SteamNode }, target: HTMLElement | null | undefined): boolean {
  if (!target) return false;
  try {
    node.current?.TakeFocus?.(true);
  } catch {
    /* the check below decides */
  }
  if (!elementHasGamepadFocus(target)) focusInTabBody(target);
  return true;
}

const STOP_QUERY = "[tabindex], button, input";

/** The innermost stop inside `host` (a switch inside the wrapper that holds its moves), never the wrapper itself. */
function innermostStop(host: HTMLElement | null): HTMLElement | null {
  // focus-patterns-allow: element-scoped query on this component's own row ref, never the page.
  const all = host ? Array.from(host.querySelectorAll<HTMLElement>(STOP_QUERY)) : [];
  // focus-patterns-allow: element-scoped query inside the same row, to skip a wrapper that holds a stop.
  return all.find((el) => !el.querySelector(STOP_QUERY)) ?? null;
}

/**
 * The whole panel. See "How it works" above for the layout and flow.
 *
 * In: the current host settings (local-on-Deck, autostart, the typed PC
 * address, saved LAN hosts), callbacks to change and persist each of them,
 * a callback reporting the last connection test result up to the parent,
 * callbacks for opening the models hub and nested-modal focus handoff, and
 * a couple of optional refs/callbacks so the section above or below can
 * hand the D-pad in and out cleanly.
 * Out: the panel section described above.
 *
 * What can go wrong: every backend call here (connection test, local
 * setup, mDNS discovery, autostart toggle) is wrapped so a failure shows a
 * toast or a status line rather than leaving a button stuck in a busy
 * state forever.
 */
export const OllamaWhereAiRunsSection: React.FC<OllamaWhereAiRunsSectionProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  ollamaLocalAutostart,
  setOllamaLocalAutostart,
  onLastConnectionStatus,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
  onMoveUpFromFirst,
  onMoveDownFromConnectionRow,
  connectionTestBtnRef,
}) => {
  // Not a prop -- see settingsLoadedSignal.ts for why the automatic connection check below
  // needs this without index.tsx threading a value down through the tab's own payload hook.
  const settingsLoaded = useSettingsLoadedFlag();
  // Find LAN, its found-hosts list and its message: for everyone whenever the AI runs on a PC (plan 96,
  // the maintainer 2026-10-18; plan 72 had held it back to the Developer tab for 0.6.0).
  const findLanShown = !ollamaLocalOnDeck;
  const [deckIp, setDeckIp] = useState<string>("...");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(
    () => peekOllamaTabLocalPending()?.connectionStatus ?? null
  );
  /*
   * The newest status, also kept outside React's state, so a press that waited for a check reads its answer at once
   * (the state's new value only arrives with the next render). Written by `recordStatus` with the state, always.
   */
  const latestStatusRef = useRef<ConnectionStatus | null>(connectionStatus);
  const recordStatus = (st: ConnectionStatus | null) => {
    latestStatusRef.current = st;
    setConnectionStatus(st);
  };
  /** The check running now, so an Install press made before it answered can wait for it. */
  const probeInFlightRef = useRef<Promise<void> | null>(null);
  /** True while an Install / Update press waits for that check; the button reads "Checking…" and a second press does nothing. */
  const [checkingBeforeStart, setCheckingBeforeStart] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [mdnsDiscovering, setMdnsDiscovering] = useState(false);
  const [mdnsHosts, setMdnsHosts] = useState<MdnsOllamaHost[]>(
    () => peekOllamaTabLocalPending()?.mdnsHosts ?? []
  );
  const [mdnsDiscoveryMessage, setMdnsDiscoveryMessage] = useState<string | null>(
    () => peekOllamaTabLocalPending()?.mdnsDiscoveryMessage ?? null
  );
  /*
   * The setup run's status. A tab rebuilt mid-run (a Decky box closing, the section opened again) starts from the run
   * it was showing, so the job card is there at once; every status also goes to the job card's memory
   * (ollamaSetupJob.ts), which keeps reading it while this tab is not on screen.
   */
  const [localSetupStatus, setLocalSetupStatusState] = useState<LocalOllamaSetupStatus | null>(lastRunningOllamaSetupStatus);
  /* Whether Ollama answered the last check: undefined before any answer (a run seen then is called an update). */
  const engineReadyRef = useRef<boolean | undefined>(undefined);
  const setLocalSetupStatus = useCallback((st: LocalOllamaSetupStatus | null) => {
    noteOllamaSetupStatus(st, engineReadyRef.current);
    setLocalSetupStatusState(st);
  }, []);
  useOllamaSetupStatusReader();
  const localSetupBusy = localSetupStatus?.phase === "running";
  const setupAutoTestRanRef = useRef(false);
  const onTestConnectionRef = useRef<(opts?: { quiet?: boolean }) => Promise<void>>(async () => {});
  const onSetupDoneRef = useRef<() => void>(() => {});
  /*
   * Which mode -- Ollama on this Deck (true) or on the network (false) -- the automatic probe last
   * ran for; null before the first. Keyed on the mode rather than "ran once" because after a plugin
   * reload this tab can mount before settings arrive, while `ollamaLocalOnDeck` still reads its
   * default false: the one probe then went to the saved network address (or the "192.168.1."
   * placeholder), failed, and the tab showed "Could not reach Ollama" and offered Install Ollama
   * with Ollama answering on this Deck the whole time (plugin log 2026-09-23 21:44:45, "Name or
   * service not known"). When settings land and the mode flips, the probe runs again for it.
   */
  const autoProbeModeRef = useRef<boolean | null>(
    peekOllamaTabLocalPending()?.connectionStatus != null ? ollamaLocalOnDeck : null
  );
  /** Only the newest probe may set the status: an older one finishing late must not overwrite it. */
  const probeSeqRef = useRef(0);
  const [autostartStatus, setAutostartStatus] = useState<OllamaLocalAutostartStatus | null>(null);
  const [autostartBusy, setAutostartBusy] = useState(false);

  const ollamaIpConnectionNavRef = useRef<HTMLDivElement>(null);
  const ollamaLocalToggleNavRef = useRef<HTMLDivElement>(null);
  const ollamaAutostartToggleNavRef = useRef<HTMLDivElement>(null);
  /* The "Local Ollama setup" block's way in: Update (or the job card's Cancel) from above, Browse (or Cancel) from below. */
  const localSetupEntryRef = useRef<LocalSetupEntry>(null);

  /*
   * The two switches' Steam nodes: the Focusable each switch's moves sit on (DenseSwitchRow's `navOnWrapper`). Steam
   * does not honour a ToggleField's own move handler: its own move runs after it, which on the Deck (block D1,
   * plan105-P105-D1-SWEEP.json) took Down from "Start the AI with the Deck" past Update onto Browse. A move onto a
   * switch is Steam's transfer onto its wrapper, then a plain focus on the switch itself if that did not land it.
   */
  const runSwitchNavRef = useRef<SteamNode>(null);
  const bootSwitchNavRef = useRef<SteamNode>(null);
  const focusLocalToggle = useCallback(
    (): boolean => takeRowThenFocus(runSwitchNavRef, innermostStop(ollamaLocalToggleNavRef.current)),
    [],
  );
  const focusAutostartToggle = useCallback(
    (): boolean => takeRowThenFocus(bootSwitchNavRef, innermostStop(ollamaAutostartToggleNavRef.current)),
    [],
  );

  /*
   * Put the ring on a button of the chain, unless the plugin itself has it greyed. A greyed Decky
   * button is not a disabled control: it keeps its place in Steam's graph and takes the ring
   * (measured 2026-09-16, 2026-10-12), so asking the button whether it is `disabled` never skips
   * one -- that is how Down from Update landed on greyed Browse and Cancel could not be reached.
   * `greyed` is the plugin's own state for that button.
   */
  const focusChainBtn = useCallback((ref: { current: HTMLButtonElement | null }, greyed: boolean): boolean => {
    const el = ref.current;
    if (!el || greyed) return false;
    focusInTabBody(el);
    return true;
  }, []);

  /* Test connection is greyed exactly when its own `disabled` prop below says so. */
  const testConnectionGreyed = connectionTesting || localSetupBusy || (!ollamaLocalOnDeck && !ollamaIp.trim());

  /* Find LAN's own Steam node: after its box closes the ring comes back through Steam's transfer, then a plain focus if that did not land it. */
  const findLanNavRef = useRef<SteamNode>(null);
  const findLanBtnRef = useRef<HTMLButtonElement | null>(null);
  const takeFindLan = useCallback((): boolean => takeRowThenFocus(findLanNavRef, findLanBtnRef.current), []);
  /*
   * Up from the connection row (Find LAN, Test connection) with the AI on a PC: the PC address box, else the Save
   * row, never past them. Steam's own move skipped both and the old fall-back went to the second switch 5 of 5
   * times (Deck 2026-10-22, plan97-A-FINDLAN-UP.json); with the tab scrolled, the panel scroll took the press and
   * the ring stayed put. Both moves go through the stop's own Steam node (the box's `navRef`, the shape the
   * Search tab's find box uses). The address box is a sibling of the buttons inside the row, so a plain focus is
   * a safe second try there; the Save row is another row, so only Steam's transfer moves the ring onto it.
   */
  const addressNavRef = useRef<SteamNode>(null);
  /* The input inside Steam's text field: a `ref` on the field itself would hold Steam's component, not an element. */
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const saveRowNavRef = useRef<SteamNode>(null);
  const takeAddress = useCallback((): boolean => takeRowThenFocus(addressNavRef, addressInputRef.current), []);
  const takeSaveRow = useCallback((): boolean => {
    const node = saveRowNavRef.current;
    if (!node || typeof node.TakeFocus !== "function") return false;
    try {
      return node.TakeFocus(true) !== false;
    } catch {
      return false;
    }
  }, []);
  /* The connection row's Steam nodes, so a move onto Test connection (Down from the address, Left from Find LAN) is a transfer. */
  const testRowNavRef = useRef<SteamNode>(null);
  const takeTestConnection = useCallback(
    (): boolean => takeRowThenFocus(testRowNavRef, connectionTestBtnRef?.current),
    [connectionTestBtnRef],
  );

  const focusConnectionTestBtn = useCallback(
    (): boolean => focusChainBtn(connectionTestBtnRef ?? { current: null }, testConnectionGreyed),
    [connectionTestBtnRef, focusChainBtn, testConnectionGreyed],
  );

  /** Down from the last button of the chain: Test connection, or (it is disabled while a setup runs) on to the next section. */
  const moveDownToTestOrOn = useCallback((): boolean => {
    if (focusConnectionTestBtn()) return true;
    onMoveDownFromConnectionRow?.();
    return true;
  }, [focusConnectionTestBtn, onMoveDownFromConnectionRow]);

  /**
   * Down from the PC address box: Test connection (the first stop of the row), else Find LAN when Test is
   * greyed, else on to the next section. Steam's own geometry skipped both (Deck 2026-10-18, plan 96).
   */
  const handleMoveDownFromAddress = useCallback((): boolean => {
    if (!testConnectionGreyed && takeTestConnection()) return true;
    if (findLanShown && takeFindLan()) return true;
    onMoveDownFromConnectionRow?.();
    return true;
  }, [findLanShown, onMoveDownFromConnectionRow, takeFindLan, takeTestConnection, testConnectionGreyed]);

  /** Right from Test connection: Find LAN. Left from Find LAN: Test connection. */
  const handleMoveRightFromTest = useCallback((): boolean => (findLanShown ? takeFindLan() : false), [findLanShown, takeFindLan]);
  const handleMoveLeftFromFindLan = useCallback(
    (): boolean => (testConnectionGreyed ? false : takeTestConnection()),
    [takeTestConnection, testConnectionGreyed],
  );

  /**
   * Local Deck setup vertical chain: toggle → Start-at-boot toggle → Install/Update → Browse → Test.
   * While a setup runs the job card's Cancel stands in for Install/Update and Browse (OllamaLocalSetupBlock.tsx).
   * The startup-entry toggle sits right under "Run AI on this Deck" in both branches (local install
   * UI shown or not), so both the "on" fallback and the "off" plain fallback land on it rather than
   * back on the first toggle.
   */
  const handleMoveUpFromConnection = useCallback((): boolean => {
    if (ollamaLocalOnDeck && localSetupEntryRef.current?.enterFromBottom()) return true;
    if (!ollamaLocalOnDeck && (takeAddress() || takeSaveRow())) return true;
    return tryMoveUpWithPanelScroll(ollamaIpConnectionNavRef.current, focusAutostartToggle);
  }, [focusAutostartToggle, ollamaLocalOnDeck, takeAddress, takeSaveRow]);

  /* Folded (plan 91): Up from the first switch goes to the section's own line, which the tab hands in. */
  const handleMoveUpFromLocalToggle = useCallback((): boolean => {
    return onMoveUpFromFirst?.() || tryMoveUpWithPanelScroll(ollamaLocalToggleNavRef.current);
  }, [onMoveUpFromFirst]);

  const handleMoveDownFromLocalToggle = useCallback((): boolean => {
    return focusAutostartToggle();
  }, [focusAutostartToggle]);

  const handleMoveUpFromAutostartToggle = useCallback((): boolean => {
    return focusLocalToggle();
  }, [focusLocalToggle]);

  const handleMoveDownFromAutostartToggle = useCallback((): boolean => {
    if (ollamaLocalOnDeck && localSetupEntryRef.current?.enterFromTop()) return true;
    return moveDownToTestOrOn();
  }, [moveDownToTestOrOn, ollamaLocalOnDeck]);

  useLayoutEffect(() => {
    const local = consumeOllamaTabLocalPending();
    if (!local) return;
    recordStatus(local.connectionStatus);
    setMdnsHosts(local.mdnsHosts);
    setMdnsDiscoveryMessage(local.mdnsDiscoveryMessage);
    if (local.connectionStatus != null) {
      autoProbeModeRef.current = ollamaLocalOnDeck;
    }
  }, []);

  useEffect(() => {
    registerOllamaTabLocalGetter(() => ({
      connectionStatus,
      mdnsHosts,
      mdnsDiscoveryMessage,
      // The Install options menu is gone; the snapshot's field stays for its shape.
      localInstallMenuOpen: false,
    }));
    return () => unregisterOllamaTabLocalGetter();
  }, [connectionStatus, mdnsHosts, mdnsDiscoveryMessage]);

  useEffect(() => {
    callDeckyWithTimeout<[], string>("get_deck_ip", [], DECKY_RPC_TIMEOUT_MS)
      .then((ip) => {
        setDeckIp(ip ?? "unknown");
      })
      .catch(() => {
        setDeckIp("unknown");
      });
  }, []);

  const onTestConnection = async (opts?: { quiet?: boolean }) => {
    const quiet = opts?.quiet === true;
    const target = ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim();
    if (!target) return;
    if (isHttpsOllamaAddress(target)) {
      // Refused, not tried: bonsAI only speaks plain http to Ollama, and an https address must
      // never be sent as http behind the person's back. The back end refuses it the same way.
      ++probeSeqRef.current;
      const refused = { reachable: false, error: OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE };
      recordStatus(refused);
      onLastConnectionStatus?.(refused);
      return;
    }
    const loopbackLikelyProbe =
      ollamaLocalOnDeck ||
      /^\s*127\.0\.0\.1\s*(:\s*\d+)?\s*$/i.test(target) ||
      /^\s*localhost\s*(:\s*\d+)?\s*$/i.test(target);
    const rpcDeadlineMs =
      TEST_CONNECTION_TIMEOUT_SECONDS * 1000 +
      (loopbackLikelyProbe ? LOCAL_LOOPBACK_CONNECTION_TEST_RPC_EXTRA_MS : 3000);

    const seq = ++probeSeqRef.current;
    if (!quiet) {
      setConnectionTesting(true);
      recordStatus(null);
    }
    let finish: () => void = () => {};
    const running = new Promise<void>((r) => (finish = r));
    probeInFlightRef.current = running;
    try {
      const result = await callDeckyWithTimeout<[string, number], ConnectionStatus>(
        "test_ollama_connection",
        [target, TEST_CONNECTION_TIMEOUT_SECONDS],
        rpcDeadlineMs
      );
      if (seq !== probeSeqRef.current) return;
      recordStatus(result);
      onLastConnectionStatus?.(result);
      if (result.reachable && !ollamaLocalOnDeck) onPersistOllamaIp(target);
    } catch (e: unknown) {
      if (seq !== probeSeqRef.current) return;
      const failed = { reachable: false, error: formatDeckyRpcError(e) };
      recordStatus(failed);
      onLastConnectionStatus?.(failed);
    } finally {
      if (!quiet) setConnectionTesting(false);
      if (probeInFlightRef.current === running) probeInFlightRef.current = null;
      finish();
    }
  };

  onTestConnectionRef.current = onTestConnection;

  /*
   * Install / Update. Whether this Deck has any model decides what the press does (none: a box offers the starter
   * models; some: the update runs), and that is only known once the quiet check has answered. A press made before
   * it answered used to read "no answer" as "has models" and start the engine-only update with no models at all
   * (the "Checking…" trap; lane D3 took the same trap off the first-time setup). Now the press waits for the check,
   * the button reading "Checking…", and a second press meanwhile does nothing. No answer at all counts as no models:
   * the box is a question, so asking is the safe side.
   */
  const pressInstallOrUpdate = async () => {
    if (localSetupBusy || checkingBeforeStart) return;
    if (latestStatusRef.current == null) {
      setCheckingBeforeStart(true);
      try {
        await (probeInFlightRef.current ?? onTestConnectionRef.current({ quiet: true }));
      } finally {
        setCheckingBeforeStart(false);
      }
    }
    const known = latestStatusRef.current;
    runLocalSetupInPlace(LOCAL_OLLAMA_SETUP_PROFILE_UPDATE_INSTALLED, "ollama-local-setup", {
      offerStarterModels: !(known?.models?.length ?? 0),
    });
  };

  // Auto-probe on mount, and again when the on-Deck / network mode changes, so the Install/Update
  // label reflects reachability without Test connection. Typing a new host still waits for an
  // explicit Test connection.
  //
  // Waits for settingsLoaded first: this tab can mount before the plugin's saved settings come
  // back, while ollamaLocalOnDeck and ollamaIp still read this render's opening defaults rather
  // than what is actually saved. Probing then went to the wrong host and logged a failure it
  // caused itself, even though Ollama was answering normally the whole time
  // (workshop:test-evidence/plan64-OLLAMA-TAB-AFTER-RELOAD.json). Once settings do land, this effect
  // re-runs from the settingsLoaded dependency and probes exactly once, for the real values.
  useEffect(() => {
    if (!settingsLoaded) return;
    if (autoProbeModeRef.current === ollamaLocalOnDeck) return;
    const target = ollamaLocalOnDeck ? OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP : ollamaIp.trim();
    if (!target) return;
    autoProbeModeRef.current = ollamaLocalOnDeck;
    void onTestConnectionRef.current({ quiet: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the mode (and settings
    // being loaded) alone, on purpose; ollamaIp is read fresh via the ref above.
  }, [ollamaLocalOnDeck, settingsLoaded]);

  const ollamaEngineReady = Boolean(connectionStatus?.reachable);
  engineReadyRef.current = connectionStatus == null ? undefined : ollamaEngineReady;

  const { openMdnsDiscoveryConfirm } = useMdnsOllamaDiscovery({
    mdnsDiscovering,
    setMdnsDiscovering,
    setMdnsHosts,
    setMdnsDiscoveryMessage,
    ollamaLocalOnDeck,
    localSetupBusy,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
    // A search outlives this copy of the tab: the box closing rebuilds it (plan 96, Deck 2026-10-18).
    store: tabMdnsDiscovery,
    returnFocusId: "ollama-find-lan",
  });

  const { runLocalSetupInPlace } = useLocalOllamaSetupFlow({
    ollamaLocalOnDeck,
    localSetupStatus,
    setLocalSetupStatus,
    localSetupBusy,
    setupAutoTestRanRef,
    onBeforeDeckyModal,
    onCompleteDeckyModalClose,
    onTestConnectionRef,
    onSetupDoneRef,
  });

  const { handleToggleAutostart, refreshAutostartStatus } = useOllamaLocalAutostart({
    setAutostartStatus,
    setAutostartBusy,
    setOllamaLocalAutostart,
  });
  onSetupDoneRef.current = refreshAutostartStatus;

  return (
      <PanelSection>
        {/* Folded (plan 91 § 2b): one line per switch; each one's longer text shows in the tab's help strip. */}
        <PanelSectionRow>
          <div
            ref={ollamaLocalToggleNavRef}
            className="bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <DenseSwitchRow
              label="Run AI on this Deck"
              help={OLLAMA_ROW_HELP.runOnDeck}
              checked={ollamaLocalOnDeck}
              onChange={(c) => setOllamaLocalOnDeck(c)}
              nav={{
                onMoveUp: () => handleMoveUpFromLocalToggle(),
                onMoveDown: () => handleMoveDownFromLocalToggle(),
                navRef: runSwitchNavRef,
              }}
              navOnWrapper
            />
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div
            ref={ollamaAutostartToggleNavRef}
            className="bonsai-settings-bleed"
            style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
          >
            <DenseSwitchRow
              label="Start the AI with the Deck"
              help={OLLAMA_ROW_HELP.autostart}
              checked={ollamaLocalAutostart}
              disabled={autostartBusy}
              onChange={(c) => handleToggleAutostart(c)}
              nav={{
                onMoveUp: () => handleMoveUpFromAutostartToggle(),
                onMoveDown: () => handleMoveDownFromAutostartToggle(),
                navRef: bootSwitchNavRef,
              }}
              navOnWrapper
            >
            {autostartStatus?.reason ? (
              <div
                className="bonsai-prose"
                style={{ fontSize: textPx(10), color: "#8fa0b4", lineHeight: 1.35, marginTop: 4, userSelect: "none" }}
                aria-live="polite"
              >
                {autostartStatus.reason}
              </div>
            ) : autostartStatus?.installed ? (
              <div
                className="bonsai-prose"
                style={{ fontSize: textPx(10), color: "#8fa0b4", lineHeight: 1.35, marginTop: 4, userSelect: "none" }}
                aria-live="polite"
              >
                Set up and answering questions.
              </div>
            ) : null}
            </DenseSwitchRow>
          </div>
        </PanelSectionRow>
        {ollamaLocalOnDeck ? (
          <PanelSectionRow>
            <OllamaLocalSetupBlock
              connectionStatus={connectionStatus}
              localSetupStatus={localSetupStatus}
              localSetupBusy={localSetupBusy}
              checkingBeforeStart={checkingBeforeStart}
              onPressInstallOrUpdate={() => void pressInstallOrUpdate()}
              onBrowse={() => {
                onBeforeDeckyModal();
                onOpenOllamaModelsHub({ initialSection: "browse" });
              }}
              onMoveUpOut={focusAutostartToggle}
              onMoveDownOut={moveDownToTestOrOn}
              entryRef={localSetupEntryRef}
            />
          </PanelSectionRow>
        ) : null}
        {!ollamaLocalOnDeck ? (
          <OllamaSavedHostsRows
            namedOllamaHosts={namedOllamaHosts}
            setNamedOllamaHosts={setNamedOllamaHosts}
            ollamaIp={ollamaIp}
            onOllamaIpChange={onOllamaIpChange}
            onPersistOllamaIp={onPersistOllamaIp}
            saveRowNavRef={saveRowNavRef}
            onMoveDownFromSave={takeAddress}
          />
        ) : null}
        <PanelSectionRow>
          <div
            ref={ollamaIpConnectionNavRef}
            className="bonsai-settings-connection-host bonsai-settings-bleed"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <Focusable
              className="bonsai-settings-connection-row"
              flow-children="horizontal"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 8,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              {!ollamaLocalOnDeck ? (
                <div
                  ref={(box) => {
                    // focus-patterns-allow: element-scoped query on this component's own wrapper, for the input Steam's text field draws (the Search find box does the same).
                    addressInputRef.current = box?.querySelector("input") ?? null;
                  }}
                  style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontVariant: "small-caps",
                      letterSpacing: "0.06em",
                      fontSize: textPx(11),
                      fontWeight: 600,
                      color: "#b8c6d6",
                      marginBottom: 2,
                    }}
                  >
                    PC address
                  </div>
                  <TextField
                    label=""
                    value={ollamaIp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onOllamaIpChange(e.target.value)}
                    {...({ onMoveDown: handleMoveDownFromAddress, onMoveUp: takeSaveRow, navRef: addressNavRef } as Record<string, unknown>)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      maxWidth: "100%",
                    }}
                  />
                  <div className="bonsai-prose" style={{ fontSize: textPx(10), color: "#6b7c90", marginTop: 4, lineHeight: 1.35 }}>
                    {OLLAMA_ROW_HELP.pcAddress}
                  </div>
                  {isHttpsOllamaAddress(ollamaIp) ? (
                    <div className="bonsai-prose" style={{ fontSize: textPx(11), color: "tomato", marginTop: 4 }}>
                      {OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className="bonsai-prose"
                  style={{
                    flex: "1 1 auto",
                    fontSize: textPx(11),
                    color: "#b8c6d6",
                    lineHeight: 1.35,
                    paddingBottom: 8,
                  }}
                >
                  Ollama runs on this Deck at <span style={{ color: "#9ce7ff" }}>127.0.0.1:11434</span>
                </div>
              )}
              {/* A Decky Button never passes move handlers on, so Steam's moves are caught on this wrapper. */}
              <Focusable
                {...focusableMoves(() => handleMoveUpFromConnection(), onMoveDownFromConnectionRow)}
                {...({ onMoveRight: handleMoveRightFromTest, navRef: testRowNavRef } as Record<string, unknown>)}
                /* Folded (plan 91): beside the address on this Deck too, not on a line of its own. */
                style={{ display: "flex", flex: "0 0 auto", alignSelf: "flex-end" }}
              >
              <Button
                className={FOCUS_RING_BTN_CLASS}
                ref={(el) => {
                  if (connectionTestBtnRef) connectionTestBtnRef.current = el as HTMLButtonElement | null;
                }}
                onClick={() => void onTestConnection()}
                disabled={testConnectionGreyed}
                style={{
                  marginBottom: 2,
                  minHeight: 38,
                  minWidth: ollamaLocalOnDeck ? 0 : 68,
                  height: 38,
                  maxWidth: ollamaLocalOnDeck ? undefined : 68,
                  padding: "0 8px",
                  fontSize: textPx(11),
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                  color: "#e8eef5",
                }}
                aria-label={connectionTesting ? "Testing Ollama connection" : "Test connection to Ollama"}
              >
                {connectionTesting ? "…" : "Test connection"}
              </Button>
              </Focusable>
              {findLanShown ? (
                /* Its own Focusable, so Steam has a node to hand the ring back to when its box closes. */
                <Focusable
                  style={{ display: "flex", flex: "0 0 auto", alignSelf: "flex-end" }}
                  {...focusableMoves(() => handleMoveUpFromConnection(), onMoveDownFromConnectionRow)}
                  {...({ onMoveLeft: handleMoveLeftFromFindLan, navRef: findLanNavRef } as Record<string, unknown>)}
                >
                <Button
                  className={FOCUS_RING_BTN_CLASS}
                  ref={(el) => {
                    findLanBtnRef.current = el as HTMLButtonElement | null;
                    // Its box (Search / Cancel) rebuilds this tab on close; the ring comes back here.
                    registerModalReturnFocusOwner("ollama-find-lan", el as HTMLElement | null, takeFindLan);
                  }}
                  onClick={openMdnsDiscoveryConfirm}
                  disabled={mdnsDiscovering || connectionTesting || localSetupBusy}
                  style={{
                    flex: "0 0 auto",
                    alignSelf: "flex-end",
                    marginBottom: 2,
                    minHeight: 38,
                    minWidth: 0,
                    height: 38,
                    maxWidth: 88,
                    padding: "0 4px",
                    fontSize: textPx(10),
                    fontWeight: 600,
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#c8d4e0",
                  }}
                  aria-label={mdnsDiscovering ? "Searching LAN for Ollama" : "Find Ollama on LAN via mDNS"}
                >
                  {mdnsDiscovering ? "…" : "Find LAN"}
                </Button>
                </Focusable>
              ) : null}
            </Focusable>
            {!ollamaLocalOnDeck ? (
              <div
                className="bonsai-prose"
                style={{
                  fontSize: textPx(10),
                  color: "#6b7c90",
                  lineHeight: 1.35,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                title="Network address of this Steam Deck (informational)"
                aria-live="polite"
              >
                {"This Deck's IP: "}
                <span style={{ color: "#8fa0b4", fontVariantNumeric: "tabular-nums" }}>{deckIp}</span>
              </div>
            ) : null}
          </div>
        </PanelSectionRow>
        {findLanShown && mdnsHosts.length > 0 ? (
          <PanelSectionRow>
            <div style={{ fontSize: textPx(11), color: "#9fb7d5", marginBottom: 6 }}>Found on LAN (mDNS)</div>
            <Focusable flow-children="vertical" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mdnsHosts.map((entry) => (
                <Focusable
                  key={`${entry.label}-${entry.host}`}
                  flow-children="horizontal"
                  style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                >
                  <Button
                    className={FOCUS_RING_BTN_CLASS}
                    onClick={() => {
                      onOllamaIpChange(entry.host);
                      onPersistOllamaIp(entry.host);
                      toaster.toast({
                        title: "PC address set",
                        body: entry.host,
                        duration: 2500,
                      });
                    }}
                    style={{ ...SETTINGS_GLASS_BTN, minHeight: 32, fontSize: textPx(11), flex: "1 1 auto" }}
                  >
                    Use {entry.label}
                    {entry.verified ? " ✓" : ""}
                  </Button>
                  <Button
                    className={FOCUS_RING_BTN_CLASS}
                    disabled={namedOllamaHosts.length >= MAX_NAMED_OLLAMA_HOSTS}
                    onClick={() => {
                      const host = entry.host.trim();
                      const label =
                        entry.label.length > 24 ? `${entry.label.slice(0, 21)}…` : entry.label || host;
                      setNamedOllamaHosts((prev) => {
                        const next = prev.filter((h) => h.host !== host);
                        next.push({ label, host });
                        return next.slice(-MAX_NAMED_OLLAMA_HOSTS);
                      });
                      onOllamaIpChange(host);
                      onPersistOllamaIp(host);
                      toaster.toast({ title: "Host saved", body: label, duration: 2500 });
                    }}
                    style={{ ...SETTINGS_GLASS_BTN, minHeight: 32, fontSize: textPx(10) }}
                  >
                    Save
                  </Button>
                </Focusable>
              ))}
            </Focusable>
          </PanelSectionRow>
        ) : null}
        {findLanShown && mdnsDiscoveryMessage ? (
          <PanelSectionRow>
            <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: textPx(11), color: "#8fa0b4" }}>
              {mdnsDiscoveryMessage}
            </div>
          </PanelSectionRow>
        ) : null}
        {connectionStatus &&
        !(
          connectionStatus.error === OLLAMA_HTTPS_NOT_SUPPORTED_MESSAGE &&
          !ollamaLocalOnDeck &&
          isHttpsOllamaAddress(ollamaIp)
        ) && (
          <PanelSectionRow>
            {connectionStatus.reachable ? (
              <div className="bonsai-settings-bleed" style={{ fontSize: textPx(12), color: "#81c784" }}>
                <div>
                  Connected · Ollama v{connectionStatus.version}
                  {connectionStatus.models && connectionStatus.models.length > 0
                    ? ` · ${connectionStatus.models.length} model${connectionStatus.models.length === 1 ? "" : "s"}`
                    : ""}
                </div>
                {connectionStatus.recovery_attempted ? (
                  <div className="bonsai-prose" style={{ fontSize: textPx(10), color: "#7d8fa3", marginTop: 4 }}>
                    Started or woke the local AI service for this check.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bonsai-prose bonsai-settings-bleed" style={{ fontSize: textPx(12), color: "tomato" }}>
                Unreachable — {connectionStatus.error}
              </div>
            )}
          </PanelSectionRow>
        )}
      </PanelSection>
  );
};
