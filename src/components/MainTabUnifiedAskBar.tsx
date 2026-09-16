/**
 * Title: The Ask bar
 *
 * Purpose: The box a person types their question into, and every button
 * around it: the paperclip that attaches a screenshot, the button that picks
 * which AI mode to ask in, the microphone (which turns into a Stop button
 * while a recording or an answer is running), and the big Ask button itself.
 * This file also draws the two small menus those buttons open, and the
 * preview strip that shows an attached screenshot with a way to remove it.
 *
 *     ┌─ input host ────────────────────────────────────┐
 *     │ [avatar]  the question box (multi-line)         │
 *     │           ......................................│
 *     │  [paperclip]                [mode ▾] [mic/stop] │  <- bottom strip
 *     └───────────────────────────────────────────────────┘
 *        (the attach menu opens under the paperclip;
 *         the mode menu opens under [mode ▾])
 *
 *     (attached screenshot, only while one is attached)
 *     [ thumbnail + name ......................... ] [ x ]
 *
 *     ┌─ ask row ───────────────────────────────────────┐
 *     │                       ask                [clear]│  <- clear only while
 *     └───────────────────────────────────────────────────┘     a setting search
 *                                                                 is showing
 *     (matching settings, only while what was typed
 *      also matches one of the plugin's own settings)
 *
 * The same question box doubles as a search box for the plugin's own
 * settings: typing something that matches a setting's name shows a list of
 * matches below the Ask button, and Up, Down and Enter move through that
 * list instead of the box's own text. That search feature is unrelated to
 * asking the AI anything — it rides along on the same box because the box
 * was already there.
 *
 * Used for: MainTab, as the Ask bar sitting in the dock at the bottom of the
 * screen.
 *
 * Solves: One D-pad-safe home for the whole bar and its two popover menus,
 * so opening one menu closes the other, and every button's Up, Down, Left
 * and Right hand-offs live in one place instead of scattered across files.
 *
 * Does not: Submit the question or track whether one is already running —
 * onAskOllama and isAsking are both handed in by the caller. Does not decide
 * where each button's focus jump actually lands — see useMainTabAskBarFocus
 * for that.
 *
 * How it works:
 * 1. Work out whether the AI-character avatar shows at all, and whether the
 *    Ask button should look "ready" (there is text typed, and nothing is
 *    currently being asked).
 * 2. Get every focus-jump function this bar needs from
 *    useMainTabAskBarFocus(), and hand the "focus the question box" one back
 *    up to MainTab through onFocusHandlersReady once it exists.
 * 3. Register the question box's own Steam navigation handle, so a hop into
 *    it from outside the bar can use Steam's own transfer instead of a plain
 *    focus() call — see the Gotchas below for why that matters.
 * 4. Build the two menu-toggle functions, one for the mode menu and one for
 *    the attach menu. Each closes the other menu first, and each guards
 *    against running twice for a single press.
 * 5. Assemble the question box itself: the visible field, a hidden "measure"
 *    copy used to size it, and, on the Deck skins that cannot show a real
 *    multiline field, a text overlay that mirrors what the field holds.
 *    Enter either submits the question, or, while the settings-search
 *    results are showing, activates whichever result is highlighted.
 * 6. Render everything top to bottom, matching the drawing above: the input
 *    host, the two popovers anchored to their buttons, a status row for a
 *    screenshot capture or a media error, the attached-screenshot preview
 *    when there is one, the Ask row with its Ask and Clear buttons, and
 *    finally the settings-search results list.
 *
 * Gotchas:
 * - Every focus hand-off that crosses from one button or menu into another
 *   asks Steam for its own transfer (the navRef pattern, or takeNavFocus
 *   inside useMainTabAskBarFocus) rather than calling focus() directly. A
 *   plain focus() only moves the browser's own idea of what is focused, and
 *   this repo has lost fixes to Steam's ring disagreeing with that before.
 *   `navRef` itself is a real Steam Focusable prop that Decky's own types do
 *   not list, which is why it and the onMove* handlers ride in through an
 *   `as Record<string, unknown>` cast rather than a typed prop.
 * - Opening the mode menu or the attach menu adds a class to the nearest
 *   `.bonsai-scope` ancestor rather than something local to this file, since
 *   the menu itself renders as a popover that needs to sit above other Main
 *   tab content, not just above this bar.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelSectionRow, TextField, Button, Focusable } from "@decky/ui";
import {
  ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
  UNIFIED_INPUT_ICON_STRIP_PX,
  UNIFIED_TEXT_BODY_MAX_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
  UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX,
} from "../features/unified-input/constants";
import {
  getFocusableWithin,
  isLeftNavigationEvent,
  isRightNavigationEvent,
} from "../utils/focusNavigation";
import { getUiDocument, uiActiveElement, uiGamepadFocusElement } from "../utils/uiDocument";
import { formatBytes, toFileUri } from "../utils/mediaFormat";
import type { AskAttachment } from "../types/bonsaiUi";
import {
  AskMicIcon,
  AskStopIcon,
  AttachMediaIcon,
  ClearIcon,
  ImageAttachmentIcon,
} from "./icons";
import { CharacterRoleplayEmoticon } from "./CharacterRoleplayEmoticon";
import {
  ASK_MODE_ACCENT,
  ASK_MODE_ACCENT_BREATHE_HIGH,
  ASK_MODE_ACCENT_BREATHE_LOW,
  ASK_MODE_ACCENT_GLOW_HIGH,
  ASK_MODE_ACCENT_GLOW_LOW,
  ASK_MODE_FILL,
  ASK_MODE_LABELS,
  type AskModeId,
} from "../data/askMode";
import { MainTabAskModeMenuPopover } from "./MainTabAskModeMenuPopover";
import {
  MainTabAttachMenuPopover,
  type AttachMenuActionId,
} from "./MainTabAttachMenuPopover";
import { PermissionDenyAction } from "./PermissionDenyAction";
import type { BonsaiCapabilityKey } from "../utils/permissionDeepLink";
import { useMainTabAskBarFocus } from "../hooks/useMainTabAskBarFocus";
import {
  registerNavFocus,
  takeNavFocus,
  unregisterNavFocus,
  type NavRefHolder,
} from "../utils/navFocusRegistry";
import {
  SETTINGS_CARD_ROW_HEIGHT_PX,
  SETTINGS_CARD_TAB_BAR_GAP_PX,
  settingsCardRowsThatFit,
  shouldHideSettingsResultsCard,
} from "../hooks/useSteamSettingsSearch";

export type MainTabUnifiedAskBarProps = {
  fullBleedRowStyle: React.CSSProperties;
  presetCarouselHostRef: React.RefObject<HTMLDivElement | null>;
  unifiedInputHostRef: React.Ref<HTMLDivElement>;
  unifiedInputFieldLayerRef: React.Ref<HTMLDivElement>;
  unifiedInputMeasureRef: React.Ref<HTMLDivElement>;
  attachActionHostRef: React.Ref<HTMLDivElement>;
  askBarHostRef: React.Ref<HTMLDivElement>;
  unifiedInputSurfacePx: number;
  unifiedInput: string;
  usesNativeMultilineField: boolean;
  setIsUnifiedInputFocused: (v: boolean) => void;
  isUnifiedInputFocused: boolean;
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredSettings: string[];
  selectedIndex: number;
  onSettingClick: (settingPath: string, index?: number) => void;
  isAsking: boolean;
  ollamaIp: string;
  onAskOllama: (overrideQuestion?: string, opts?: { threadQuestionDisplay?: string }) => void | Promise<void>;
  onOpenScreenshotBrowser: () => void | Promise<void>;
  onTakeScreenshot: () => void | Promise<void>;
  onCancelAsk: () => void;
  onMicInput: () => void;
  voiceRecording?: boolean;
  selectedAttachment: AskAttachment | null;
  setSelectedAttachment: React.Dispatch<React.SetStateAction<AskAttachment | null>>;
  clearUnifiedInput: () => void;
  showSearchClearButton: boolean;
  mediaError: string;
  isCapturingScreenshot?: boolean;
  mediaLibraryEnabled?: boolean;
  aiCharacterPadClass?: boolean;
  aiCharacterAvatarPresetId?: string | null;
  aiCharacterAvatarBadgeLetter?: string | null;
  onOpenCharacterPicker?: () => void;
  aiCharacterDebugLine?: string | null;
  askMode: AskModeId;
  onAskModeChange: (mode: AskModeId) => void;
  isQamSetting: (settingPath: string) => boolean;
  onFocusHandlersReady?: (handlers: { focusUnifiedTextField: () => boolean }) => void;
  onNavigateToPermissions?: (capability: BonsaiCapabilityKey) => void;
};

function screenshotMediaErrorCapability(message: string): BonsaiCapabilityKey {
  if (message.includes("Read game & screenshot context")) return "steam_logs_read";
  return "media_library_access";
}

/*
 * In: MainTabUnifiedAskBarProps — the question text and its setter, whether
 * an Ask or a screenshot capture is running, the attached screenshot (if
 * any), the current AI mode, the settings-search results, and every host ref
 * and callback the bar and its menus need.
 * Out: the whole Ask bar, as drawn in the file header above.
 * What can go wrong: almost nothing is computed here beyond the ready flag
 * and the two menu-toggle guards — this function mostly arranges props and
 * local UI state into JSX. A missing optional prop hides the piece that
 * needed it (no onOpenCharacterPicker means no avatar) rather than breaking
 * the rest of the bar.
 *
 * See the file header's How it works for the full step order; in short:
 * 1. Work out the avatar and "ready" flags.
 * 2. Pull in the focus-jump functions and hand one back up to the caller.
 * 3. Register the question box's own Steam navigation handle.
 * 4. Build the mode-menu and attach-menu toggle functions.
 * 5. Assemble the question box's own body (field, measure copy, overlay).
 * 6. Render the bar, its menus, its status rows, and the settings-search
 *    results list.
 */
export function MainTabUnifiedAskBar(props: MainTabUnifiedAskBarProps) {
  const {
    fullBleedRowStyle,
    presetCarouselHostRef,
    unifiedInputHostRef,
    unifiedInputFieldLayerRef,
    unifiedInputMeasureRef,
    attachActionHostRef,
    askBarHostRef,
    unifiedInputSurfacePx,
    unifiedInput,
    usesNativeMultilineField,
    setIsUnifiedInputFocused,
    isUnifiedInputFocused,
    setUnifiedInput,
    setSelectedIndex,
    filteredSettings,
    selectedIndex,
    onSettingClick,
    isAsking,
    ollamaIp,
    onAskOllama,
    onOpenScreenshotBrowser,
    onTakeScreenshot,
    onCancelAsk,
    onMicInput,
    voiceRecording = false,
    selectedAttachment,
    setSelectedAttachment,
    clearUnifiedInput,
    showSearchClearButton,
    mediaError,
    isCapturingScreenshot = false,
    mediaLibraryEnabled = true,
    aiCharacterPadClass = false,
    aiCharacterAvatarPresetId = null,
    aiCharacterAvatarBadgeLetter = null,
    onOpenCharacterPicker,
    aiCharacterDebugLine = null,
    askMode,
    onAskModeChange,
    isQamSetting,
    onFocusHandlersReady,
    onNavigateToPermissions,
  } = props;

  const askModeMenuAnchorRef = useRef<HTMLDivElement | null>(null);
  const askModeMenuFirstItemRef = useRef<HTMLElement | null>(null);
  const attachMenuAnchorRef = useRef<HTMLDivElement | null>(null);
  const attachMenuFirstItemRef = useRef<HTMLElement | null>(null);
  const [askModeMenuOpen, setAskModeMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const askModeToggleOnceRef = useRef(false);
  const attachMenuToggleOnceRef = useRef(false);

  const showAiCharacterChrome = Boolean(onOpenCharacterPicker && aiCharacterPadClass);
  const askLooksReady = unifiedInput.trim().length > 0 && !isAsking;

  /*
   * The settings-results card (plan 45 / plan 56 lane E): does what was typed hide it outright
   * (a long question, unless it is an exact run inside a setting's own name -- see
   * shouldHideSettingsResultsCard), and if not, how many of the results actually fit above the
   * question box without reaching the tab bar.
   */
  const settingsCardHidden = shouldHideSettingsResultsCard(unifiedInput);
  const [settingsCardRowsShown, setSettingsCardRowsShown] = useState<number>(filteredSettings.length);

  useEffect(() => {
    if (unifiedInput.trim() === "" && /\n/.test(unifiedInput)) setUnifiedInput("");
  }, [unifiedInput, setUnifiedInput]);

  const {
    focusUnifiedTextField,
    focusAttachPaperclip,
    focusAiCharacterAvatar,
    focusAskPrimary,
    focusMicOrStop,
    focusAskModeButton,
    unifiedInputDeckNavHandlers,
    avatarDeckNavHandlers,
  } = useMainTabAskBarFocus(
    {
      unifiedInputFieldLayerRef,
      attachActionHostRef,
      askBarHostRef,
      presetCarouselHostRef,
    },
    showAiCharacterChrome,
    isAsking,
  );

  useEffect(() => {
    onFocusHandlersReady?.({ focusUnifiedTextField });
  }, [onFocusHandlersReady, focusUnifiedTextField]);

  /*
   * Every press of the Ask button used to leave nothing highlighted, with a real question and an
   * empty box alike (measured 2026-09-05, four times). The cause lives outside this file: onAskOllama
   * (useBonsaiAskOrchestration.ts) blurs whatever the page's own focus happens to be sitting on
   * before it even checks whether there is a question to send -- dismissing the on-screen keyboard
   * is bound to activeElement, not to whether this press did anything. Nothing downstream then
   * claims the ring, so it drops to nothing, and the next D-pad press has to place it again -- on a
   * fresh panel, that placing press lands on Decky's own back arrow above the plugin.
   *
   * Fixed at the press itself rather than in the orchestration hook: hand the ring on to somewhere
   * sensible right after firing the ask, through Steam's own transfer. A send moves it to the
   * question box, since a person may want to type a follow-up right away. An empty-box press never
   * sends anything, so the ring simply goes back to this same button -- a plain focus() here is
   * safe because it is not crossing a container, it is the button reclaiming itself.
   */
  const handleAskPress = useCallback(() => {
    if (isAsking) return;
    const hadQuestion = unifiedInput.trim().length > 0;
    void onAskOllama();
    if (hadQuestion) {
      takeNavFocus("unified-input");
    } else {
      focusAskPrimary();
    }
  }, [isAsking, unifiedInput, onAskOllama, focusAskPrimary]);

  /*
   * The text field's own Steam nav node, so a hop from another container (a preset chip's Down,
   * the help chip, the avatar) can use Steam's transfer instead of a plain `focus()` that only
   * moves `activeElement` (navFocusRegistry). `navRef` is a real Steam Focusable prop that Decky's
   * types omit; it rides in through the same cast as the move handlers.
   */
  const unifiedInputNavRef = useRef<NavRefHolder["current"]>(null);
  useEffect(() => {
    registerNavFocus("unified-input", unifiedInputNavRef);
    return () => unregisterNavFocus("unified-input", unifiedInputNavRef);
  }, []);

  /*
   * How much room the settings-results card actually has, measured live rather than assumed.
   * Plan 45 was drawn against a 696px panel; measured on the Deck's own 1280x800 screen the panel
   * is 454px, so a flat eight-row card would cover the tab bar. The room is the gap between the
   * question box's own top edge (unifiedInputHostRef -- the card is anchored there, see the render
   * below) and the tab bar's bottom edge, both read through getBoundingClientRect on the real
   * elements rather than any assumed pixel count, minus a 6px clearance kept under the tab bar.
   * Re-measured whenever the result count or the box's own height (it grows as text wraps) could
   * have changed how much of that room is left. Falls back to showing everything the cap allows
   * when the tab bar cannot be found (an unmounted card, or a test with no `.bonsai-scope`
   * wrapper) rather than hiding the card outright.
   */
  useLayoutEffect(() => {
    const boxEl =
      unifiedInputHostRef && typeof unifiedInputHostRef === "object" && "current" in unifiedInputHostRef
        ? (unifiedInputHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    if (!boxEl) return;
    const scope = boxEl.closest(".bonsai-scope");
    const tabBar = scope?.querySelector<HTMLElement>(".bonsai-tab-bar") ?? null;
    if (!tabBar) {
      setSettingsCardRowsShown(filteredSettings.length);
      return;
    }
    const boxTop = boxEl.getBoundingClientRect().top;
    const tabBarBottom = tabBar.getBoundingClientRect().bottom;
    const availableHeightPx = boxTop - tabBarBottom - SETTINGS_CARD_TAB_BAR_GAP_PX;
    setSettingsCardRowsShown(
      settingsCardRowsThatFit(availableHeightPx, filteredSettings.length).shown,
    );
  }, [filteredSettings.length, unifiedInput, unifiedInputSurfacePx, unifiedInputHostRef]);

  /*
   * ATTEMPT at "opening the panel leaves nothing highlighted": on a fresh panel open nothing
   * owns Steam's ring at all, so the first D-pad press has to place it rather than move it --
   * measured landing on Decky's own back arrow above the plugin rather than in it
   * (docs/test-evidence/round35-trap-attempt-1-after-b-reopen.json). AGENTS.md calls this normal
   * Steam behaviour and not ours to fix; the maintainer asked for an attempt anyway, on the
   * condition that it can never steal the ring from something that already has it.
   *
   * Decky has not populated the text field's own nav node on the first render, so this retries a
   * few times a beat apart. Every attempt re-checks ownership first: `uiGamepadFocusElement()`
   * reads Steam's `.gpfocus` ring and falls back to `document.activeElement` only when there is no
   * ring at all, and `document.activeElement` is `document.body` when nothing has ever been
   * focused -- so "the gamepad-aware answer is still body" is the one honest way this file has to
   * ask "is anything home yet". The moment that stops being true -- Steam parked the ring
   * somewhere, or a person already moved it with a mouse -- this gives up rather than yanking the
   * ring away. Never a plain `focus()`: this is a hop into a different Steam nav container, the
   * same reason `focusUnifiedTextField` above uses `takeNavFocus`.
   */
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const MAX_ATTEMPTS = 20;
    const POLL_MS = 50;
    const tryClaim = () => {
      if (cancelled) return;
      attempts += 1;
      if (uiGamepadFocusElement() !== getUiDocument().body) return; // something already owns it
      if (takeNavFocus("unified-input")) return; // claimed
      if (attempts < MAX_ATTEMPTS) {
        timeoutId = setTimeout(tryClaim, POLL_MS);
      }
    };
    timeoutId = setTimeout(tryClaim, POLL_MS);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const toggleAskModeMenu = useCallback(() => {
    if (askModeToggleOnceRef.current) return;
    askModeToggleOnceRef.current = true;
    setAttachMenuOpen(false);
    setAskModeMenuOpen((o) => !o);
    queueMicrotask(() => {
      askModeToggleOnceRef.current = false;
    });
  }, []);
  const closeAskModeMenu = useCallback(() => setAskModeMenuOpen(false), []);
  const toggleAttachMenu = useCallback(() => {
    if (attachMenuToggleOnceRef.current) return;
    attachMenuToggleOnceRef.current = true;
    setAskModeMenuOpen(false);
    setAttachMenuOpen((o) => !o);
    queueMicrotask(() => {
      attachMenuToggleOnceRef.current = false;
    });
  }, []);
  const closeAttachMenu = useCallback(() => setAttachMenuOpen(false), []);
  const onAttachMenuSelect = useCallback(
    (action: AttachMenuActionId) => {
      if (action === "take_screenshot") void onTakeScreenshot();
      else void onOpenScreenshotBrowser();
    },
    [onTakeScreenshot, onOpenScreenshotBrowser],
  );

  useLayoutEffect(() => {
    const hostEl =
      unifiedInputHostRef && typeof unifiedInputHostRef === "object" && "current" in unifiedInputHostRef
        ? (unifiedInputHostRef as React.RefObject<HTMLDivElement | null>).current
        : null;
    const scope = hostEl?.closest(".bonsai-scope");
    if (!scope) return;
    scope.classList.toggle("bonsai-ask-menu-open-scope", askModeMenuOpen || attachMenuOpen);
    return () => scope.classList.remove("bonsai-ask-menu-open-scope");
  }, [askModeMenuOpen, attachMenuOpen, unifiedInputHostRef]);

  const unifiedTextFieldBody = (
    <>
      {/*
        No `whiteSpace` / `overflowWrap` here on purpose -- section-5.ts sets both `!important`
        from `--bonsai-unified-field-*` custom properties that useUnifiedInputSurface.ts copies
        off the real field's own computed style on every measure pass, so this mirror always
        wraps exactly the way the field does rather than declaring a guess of its own.
      */}
      <div
        ref={unifiedInputMeasureRef}
        className="bonsai-unified-input-measure"
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
          fontSize: UNIFIED_TEXT_FONT_PX,
        }}
      >
        {unifiedInput || "\u00a0"}
      </div>
      <TextField
        label=""
        value={unifiedInput}
        spellCheck={false}
        {...({ multiline: true, rows: 3 } as unknown as Record<string, unknown>)}
        {...(askMode === "strategy"
          ? ({
              placeholder: "Describe the level, boss, or puzzle you're stuck on.",
            } as Record<string, unknown>)
          : {})}
        {...unifiedInputDeckNavHandlers}
        {...({ navRef: unifiedInputNavRef } as Record<string, unknown>)}
        style={{
          width: "100%",
          minHeight: unifiedInputSurfacePx,
          height: unifiedInputSurfacePx,
          maxHeight: UNIFIED_TEXT_BODY_MAX_PX,
          overflow: "auto",
          fontSize: UNIFIED_TEXT_FONT_PX,
          lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
          color: usesNativeMultilineField ? "rgba(236, 244, 252, 0.98)" : "transparent",
          caretColor: usesNativeMultilineField ? "white" : "transparent",
        }}
        onFocus={() => { setIsUnifiedInputFocused(true); }}
        onBlur={() => { setIsUnifiedInputFocused(false); }}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          let next = e.target.value;
          /* Collapse newline-only “empty” values so the caret stays on the first line (native textarea + placeholder). */
          if (next.trim() === "" && /\n/.test(next)) next = "";
          setUnifiedInput(next);
          setSelectedIndex(-1);
        }}
        onKeyDown={(ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          if (ev.key === "ArrowDown") {
            if (filteredSettings.length > 0) {
              setSelectedIndex((prev) => Math.min(prev + 1, filteredSettings.length - 1));
              ev.preventDefault();
            }
            return;
          }
          if (ev.key === "ArrowUp") {
            if (filteredSettings.length > 0) {
              setSelectedIndex((prev) => Math.max(prev - 1, 0));
              ev.preventDefault();
            }
            return;
          }
          if (ev.key === "Enter") {
            ev.preventDefault();
            const hasSelectedResult = selectedIndex >= 0 && selectedIndex < filteredSettings.length;
            if (hasSelectedResult) {
              onSettingClick(filteredSettings[selectedIndex], selectedIndex);
              return;
            }
            if (!isAsking && unifiedInput.trim() && ollamaIp.trim()) {
              (ev.currentTarget as HTMLElement).blur();
              onAskOllama();
            }
          }
        }}
      />
      {/*
        Same as the measure div above: no `whiteSpace` / `overflowWrap` here, section-5.ts sets
        both from the field's own computed style so this overlay never wraps a line differently
        than the real field underneath it does.
      */}
      {!usesNativeMultilineField && (
        <div
          className="bonsai-unified-input-text-overlay"
          style={{
            pointerEvents: "none",
            position: "absolute",
            bottom: UNIFIED_INPUT_ICON_STRIP_PX + UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX,
            color: isUnifiedInputFocused ? "rgba(248, 250, 252, 0.98)" : "rgba(220, 232, 244, 0.95)",
            lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
            fontSize: UNIFIED_TEXT_FONT_PX,
          }}
        >
          {!unifiedInput.trim() && askMode === "strategy" ? (
            <>
              <span className="bonsai-unified-input-strategy-placeholder">
                Describe the level, boss, or puzzle you're stuck on.
              </span>
              {isUnifiedInputFocused && (
                <span className="bonsai-unified-input-fake-caret bonsai-unified-input-fake-caret--overlay" aria-hidden>|</span>
              )}
            </>
          ) : (
            <>
              {unifiedInput}
              {isUnifiedInputFocused && <span className="bonsai-unified-input-fake-caret" aria-hidden>|</span>}
            </>
          )}
        </div>
      )}
    </>
  );

  const settingsCardShownSettings = filteredSettings.slice(0, Math.max(0, settingsCardRowsShown));
  const settingsCardHiddenCount = Math.max(0, filteredSettings.length - settingsCardShownSettings.length);
  const showSettingsCard =
    !settingsCardHidden && filteredSettings.length > 0 && settingsCardShownSettings.length > 0;

  return (
    <>
{/*
  position: relative purely to anchor the settings-results card below -- see its own comment.
  Nothing else about the box's own box model changes: this wrapper has no size of its own beyond
  its one child's, so it never nudges the box.
*/}
<div style={{ position: "relative" }}>
<PanelSectionRow>
  <div
    ref={unifiedInputHostRef}
    className={
      "bonsai-unified-input-host bonsai-glass-panel bonsai-full-bleed-row" +
      (aiCharacterPadClass ? " bonsai-unified-input--ai-character" : "") +
      (isAsking ? " bonsai-unified-input--asking" : "") +
      (isCapturingScreenshot ? " bonsai-unified-input--capturing" : "") +
      (askModeMenuOpen ? " bonsai-ask-mode-menu-open" : "") +
      (attachMenuOpen ? " bonsai-attach-menu-open" : "")
    }
    style={{
      ...fullBleedRowStyle,
      "--bonsai-ask-mode-accent": ASK_MODE_ACCENT[askMode],
      "--bonsai-ask-mode-fill": ASK_MODE_FILL[askMode],
      "--bonsai-ask-breathe-low": ASK_MODE_ACCENT_BREATHE_LOW[askMode],
      "--bonsai-ask-breathe-high": ASK_MODE_ACCENT_BREATHE_HIGH[askMode],
      "--bonsai-ask-glow-low": ASK_MODE_ACCENT_GLOW_LOW[askMode],
      "--bonsai-ask-glow-high": ASK_MODE_ACCENT_GLOW_HIGH[askMode],
    } as React.CSSProperties}
  >
    <div
      ref={unifiedInputFieldLayerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: unifiedInputSurfacePx + UNIFIED_INPUT_ICON_STRIP_PX,
        overflow: askModeMenuOpen || attachMenuOpen ? "visible" : undefined,
      }}
    >
      {showAiCharacterChrome ? (
        <div className="bonsai-unified-input-text-row">
          <div
            className="bonsai-ai-character-avatar-slot"
            onKeyDownCapture={(ev) => {
              if (!isRightNavigationEvent(ev)) return;
              if (!(ev.target as HTMLElement).closest?.(".bonsai-ai-character-avatar")) return;
              ev.preventDefault();
              ev.stopPropagation();
              focusUnifiedTextField();
            }}
          >
            <Focusable
              className="bonsai-ai-character-avatar"
              aria-label={
                aiCharacterAvatarBadgeLetter
                  ? `Choose AI character, ${aiCharacterAvatarBadgeLetter}`
                  : "Choose AI character"
              }
              {...avatarDeckNavHandlers}
              onClick={() => onOpenCharacterPicker?.()}
              onActivate={() => {
                onOpenCharacterPicker?.();
              }}
              style={{
                width: "100%",
                height: "100%",
                minWidth: 18,
                minHeight: 18,
                margin: 0,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                border: "none",
                outline: "none",
                background: "transparent",
                boxShadow: "none",
                backdropFilter: "none",
                boxSizing: "border-box",
              }}
            >
              <CharacterRoleplayEmoticon
                key={aiCharacterAvatarPresetId ?? "__custom__"}
                presetId={aiCharacterAvatarPresetId ?? "__custom__"}
                size={18}
                badgeLetter={aiCharacterAvatarBadgeLetter}
                art="prop"
              />
            </Focusable>
            {aiCharacterDebugLine ? (
              <div
                className="bonsai-ai-character-debug"
                style={{
                  position: "absolute",
                  left: -5,
                  top: 16,
                  zIndex: 6,
                  maxWidth: "min(100vw - 48px, 280px)",
                  fontSize: 9,
                  lineHeight: 1.15,
                  color: "rgba(160, 220, 180, 0.95)",
                  wordBreak: "break-word",
                  pointerEvents: "none",
                  fontFamily: "monospace",
                }}
              >
                {aiCharacterDebugLine}
              </div>
            ) : null}
          </div>
          <div className="bonsai-unified-input-text-box">
            {unifiedTextFieldBody}
          </div>
        </div>
      ) : (
        unifiedTextFieldBody
      )}
      <div
        ref={attachActionHostRef}
        className="bonsai-unified-input-bottom-actions"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: UNIFIED_INPUT_ICON_STRIP_PX,
          zIndex: 25,
          margin: 0,
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <Focusable
          className="bonsai-unified-input-actions-row"
          flow-children="horizontal"
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            width: "100%",
            height: "100%",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            margin: 0,
            padding: 0,
          }}
        >
          <Button
            ref={attachMenuAnchorRef}
            className="bonsai-askbar-target bonsai-unified-input-corner-left"
            {...({
              onMoveRight: () => focusAskModeButton(),
              ...(showAiCharacterChrome ? { onMoveUp: () => focusAiCharacterAvatar() } : {}),
              ...(attachMenuOpen
                ? {
                    onMoveDown: () => {
                      attachMenuFirstItemRef.current?.focus();
                      return true;
                    },
                  }
                : {}),
              onOKButton: (evt: { stopPropagation: () => void }) => {
                evt.stopPropagation();
                toggleAttachMenu();
              },
            } as Record<string, unknown>)}
            onClick={toggleAttachMenu}
            disabled={isAsking}
            aria-expanded={attachMenuOpen}
            aria-haspopup="menu"
            aria-label="Attach screenshot to Ask"
            style={{
              minWidth: 20,
              width: 20,
              minHeight: 20,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 0,
              border: "none",
              background: "transparent",
              color: "#dbe6f3",
              flexShrink: 0,
              opacity: mediaLibraryEnabled ? 1 : 0.45,
            }}
          >
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="bonsai-askbar-corner-icon">
                <AttachMediaIcon size={15} />
              </span>
              {selectedAttachment && (
                <span
                  style={{
                    position: "absolute",
                    right: -8,
                    top: -8,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 999,
                    background: "#dfeaf6",
                    color: "#1d2a38",
                    fontSize: 9,
                    lineHeight: "14px",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  1
                </span>
              )}
            </span>
          </Button>
          <Focusable
            className="bonsai-unified-input-actions-right"
            flow-children="horizontal"
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              gap: 5,
              flexShrink: 0,
              margin: 0,
              padding: 0,
            }}
          >
            <div ref={askModeMenuAnchorRef} style={{ display: "inline-flex", flexShrink: 0, position: "relative" }}>
            <Button
              className="bonsai-askbar-target bonsai-ask-mode-trigger"
              {...({
                onMoveLeft: () => focusAttachPaperclip(),
                onMoveRight: () => focusMicOrStop(),
                ...(askModeMenuOpen
                  ? {
                      onMoveDown: () => {
                        askModeMenuFirstItemRef.current?.focus();
                        return true;
                      },
                    }
                  : {}),
                onOKButton: (evt: { stopPropagation: () => void }) => {
                  evt.stopPropagation();
                  toggleAskModeMenu();
                },
              } as Record<string, unknown>)}
              onClick={toggleAskModeMenu}
              aria-expanded={askModeMenuOpen}
              aria-haspopup="menu"
              aria-label={`Inference mode: ${ASK_MODE_LABELS[askMode]}. Open to change.`}
              style={{
                minHeight: 20,
                height: 20,
                padding: "0 5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 600,
                fontVariant: "small-caps",
                letterSpacing: 0.15,
                lineHeight: 1,
                maxWidth: 76,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                boxSizing: "border-box",
              }}
            >
              {ASK_MODE_LABELS[askMode]}
            </Button>
            </div>
            {isAsking ? (
              <Button
                className="bonsai-askbar-target bonsai-unified-input-corner-right"
                {...({
                  onMoveLeft: () => focusAskModeButton(),
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    evt.stopPropagation();
                    onCancelAsk();
                  },
                } as Record<string, unknown>)}
                onClick={onCancelAsk}
                aria-label="Stop generation"
                style={{
                  minWidth: 20,
                  width: 20,
                  minHeight: 20,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 0,
                  border: "none",
                  background: "transparent",
                  flexShrink: 0,
                  transform: "translateX(2px)",
                }}
              >
                <span className="bonsai-unified-input-icon">
                  <AskStopIcon size={20} />
                </span>
              </Button>
            ) : voiceRecording ? (
              <Button
                className="bonsai-askbar-target bonsai-unified-input-corner-right bonsai-voice-recording-active"
                {...({
                  onMoveLeft: () => focusAskModeButton(),
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    evt.stopPropagation();
                    onMicInput();
                  },
                } as Record<string, unknown>)}
                onClick={onMicInput}
                aria-label="Stop voice input"
                style={{
                  minWidth: 20,
                  width: 20,
                  minHeight: 20,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 0,
                  border: "none",
                  background: "transparent",
                  color: "#f87171",
                  flexShrink: 0,
                  transform: "translateX(2px)",
                }}
              >
                <span className="bonsai-unified-input-icon">
                  <AskStopIcon size={16} />
                </span>
              </Button>
            ) : (
              <Button
                className="bonsai-askbar-target bonsai-unified-input-corner-right"
                {...({
                  onMoveLeft: () => focusAskModeButton(),
                  onOKButton: (evt: { stopPropagation: () => void }) => {
                    evt.stopPropagation();
                    onMicInput();
                  },
                } as Record<string, unknown>)}
                onClick={onMicInput}
                aria-label="Voice input"
                style={{
                  minWidth: 20,
                  width: 20,
                  minHeight: 20,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 0,
                  border: "none",
                  background: "transparent",
                  color: "#dbe6f3",
                  flexShrink: 0,
                  transform: "translateX(2px)",
                }}
              >
                <span className="bonsai-unified-input-icon">
                  <AskMicIcon size={16} />
                </span>
              </Button>
            )}
          </Focusable>
        </Focusable>
      </div>
      <MainTabAskModeMenuPopover
        open={askModeMenuOpen}
        anchorRef={askModeMenuAnchorRef}
        hostRef={unifiedInputHostRef as React.RefObject<HTMLElement | null>}
        firstMenuItemRef={askModeMenuFirstItemRef}
        selectedId={askMode}
        onSelect={onAskModeChange}
        onRequestClose={closeAskModeMenu}
        onFocusModeChip={focusAskModeButton}
      />
      <MainTabAttachMenuPopover
        open={attachMenuOpen}
        anchorRef={attachMenuAnchorRef}
        hostRef={unifiedInputHostRef as React.RefObject<HTMLElement | null>}
        firstMenuItemRef={attachMenuFirstItemRef}
        onSelect={onAttachMenuSelect}
        onRequestClose={closeAttachMenu}
        onFocusPaperclip={focusAttachPaperclip}
        takeScreenshotDisabled={isAsking || isCapturingScreenshot || !mediaLibraryEnabled}
        browseDisabled={isAsking || !mediaLibraryEnabled}
      />
    </div>
  </div>
</PanelSectionRow>
{/*
  The settings-results card. Anchored to the box's own top edge (bottom: 100% of this wrapper,
  which is exactly the box's rendered height -- see the position:relative wrapper opened above)
  so it draws over the chat and takes no layout space of its own: nothing below it ever moves,
  which is the whole point (plan 45 section 1 -- "the list grows upward and pushes the box... up
  the screen", fixed by taking the list out of that flow entirely). Rows beyond what
  settingsCardRowsShown allows are simply not rendered -- see the measuring effect above -- and
  are folded into the heading's "N more" count instead of being cut off mid-row.
*/}
{showSettingsCard && (
  <div
    className="bonsai-settings-results-card bonsai-glass-panel"
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: "100%",
    }}
  >
    <div className="bonsai-settings-results-card-heading">
      Steam settings
      {settingsCardHiddenCount > 0 && (
        <span className="bonsai-settings-results-card-heading-count">
          {` · ${settingsCardHiddenCount} more`}
        </span>
      )}
    </div>
    {settingsCardShownSettings.map((s, i) => {
      const isQam = isQamSetting(s);
      const isSelected = i === selectedIndex;
      const parts = s.split(">").map((part) => part.trim()).filter(Boolean);
      const title = parts[parts.length - 1] ?? s;
      const breadcrumb = parts.slice(0, -1).join(" > ");
      const compactLine = isQam ? `* QAM > ${title}` : `${title}`;
      const compactSubline = isQam ? `(${breadcrumb})` : breadcrumb;

      return (
        <Button
          key={s}
          className="bonsai-settings-results-card-row"
          onClick={() => onSettingClick(s, i)}
          style={{
            width: "100%",
            minHeight: SETTINGS_CARD_ROW_HEIGHT_PX,
            padding: "2px 6px",
            borderRadius: 4,
            border: `1px solid ${isQam ? "rgba(243, 197, 91, 0.3)" : "rgba(255,255,255,0.1)"}`,
            background: isSelected
              ? isQam
                ? "rgba(243, 197, 91, 0.22)"
                : "rgba(255,255,255,0.14)"
              : isQam
                ? "rgba(243, 197, 91, 0.08)"
                : "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: isSelected ? "white" : isQam ? "#f2cf84" : "#d4dbe2", lineHeight: "1.15" }}>
              {compactLine}
            </div>
            {compactSubline && (
              <div style={{ fontSize: 9, color: isSelected ? "#dfe8ef" : "#9fafbc", lineHeight: "1.1", marginTop: 1 }}>
                {compactSubline}
              </div>
            )}
          </div>
        </Button>
      );
    })}
  </div>
)}
</div>
{(isCapturingScreenshot || mediaError) && (
  <PanelSectionRow>
    {isCapturingScreenshot ? (
      <div
        className="bonsai-full-bleed-row"
        role="status"
        aria-live="polite"
        style={{
          ...fullBleedRowStyle,
          fontSize: 11,
          lineHeight: 1.4,
          color: "#9cb0c6",
        }}
      >
        Closing this menu and capturing a game screenshot…
      </div>
    ) : mediaError && onNavigateToPermissions ? (
      <div className="bonsai-full-bleed-row" style={fullBleedRowStyle}>
        <PermissionDenyAction
          capability={screenshotMediaErrorCapability(mediaError)}
          message={mediaError}
          onJump={onNavigateToPermissions}
          compact
        />
      </div>
    ) : (
      <div
        className="bonsai-full-bleed-row"
        role="status"
        aria-live="polite"
        style={{
          ...fullBleedRowStyle,
          fontSize: 11,
          lineHeight: 1.4,
          color: "#f09a8d",
        }}
      >
        {mediaError}
      </div>
    )}
  </PanelSectionRow>
)}
{selectedAttachment && (
  <PanelSectionRow>
    <div
      className="bonsai-full-bleed-row"
      onKeyDownCapture={(ev: React.KeyboardEvent<HTMLDivElement>) => {
        const activeEl = uiActiveElement();
        const previewActive = Boolean(activeEl?.closest(".bonsai-attachment-preview-target"));
        const removeActive = Boolean(activeEl?.closest(".bonsai-attachment-remove-target"));
        if (isRightNavigationEvent(ev) && previewActive) {
          const removeTarget = getFocusableWithin(".bonsai-attachment-remove-target");
          if (removeTarget) {
            ev.preventDefault();
            ev.stopPropagation();
            removeTarget.focus();
          }
          return;
        }
        if (isLeftNavigationEvent(ev) && removeActive) {
          const previewTarget = getFocusableWithin(".bonsai-attachment-preview-target");
          if (previewTarget) {
            ev.preventDefault();
            ev.stopPropagation();
            previewTarget.focus();
          }
          return;
        }
      }}
      style={{ ...fullBleedRowStyle, display: "flex", flexDirection: "column", gap: 6 }}
    >
      <Focusable
        flow-children="horizontal"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minHeight: 38,
          borderRadius: 8,
          border: "1px solid rgba(150, 187, 223, 0.62)",
          background: "linear-gradient(180deg, rgba(64, 93, 124, 0.42) 0%, rgba(48, 71, 95, 0.42) 100%)",
          color: "#e3edf7",
          padding: "5px 8px",
        }}
      >
        <Button
          className="bonsai-attachment-preview-target"
          aria-label={`Attached screenshot ${selectedAttachment.name}`}
          onClick={onOpenScreenshotBrowser}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 30,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            border: "none",
            background: "transparent",
            color: "#e3edf7",
            boxShadow: "none",
          }}
        >
          <ImageAttachmentIcon size={17} />
          <img
            src={selectedAttachment.preview_data_uri || toFileUri(selectedAttachment.path)}
            alt={selectedAttachment.name}
            style={{
              width: 58,
              height: 34,
              borderRadius: 4,
              objectFit: "cover",
              background: "rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span
              style={{
                display: "block",
                fontSize: 11,
                color: "#dbe7f3",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedAttachment.name}
            </span>
            <span style={{ display: "block", fontSize: 8, color: "#cfdeed", fontWeight: 600, marginTop: 2 }}>
              {formatBytes(selectedAttachment.size_bytes ?? 0)}
            </span>
          </div>
        </Button>
        <Button
          className="bonsai-attachment-remove-target"
          onClick={() => setSelectedAttachment(null)}
          aria-label="Remove attachment"
          style={{
            minWidth: 36,
            width: 36,
            minHeight: 34,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "#dce8f4",
            boxShadow: "none",
            outline: "none",
          }}
        >
          <ClearIcon size={18} />
        </Button>
      </Focusable>
    </div>
  </PanelSectionRow>
)}
<PanelSectionRow>
  <div
    className="bonsai-full-bleed-row bonsai-ask-bleed-wrap"
    style={{ ...fullBleedRowStyle }}
  >
    <div
      ref={askBarHostRef}
      className={`bonsai-askbar-merged bonsai-glass-panel bonsai-askbar-row-host${askLooksReady ? " bonsai-askbar-merged--ready" : ""}`}
      style={{
        position: "relative",
        /* Plain 100%: this row and the unified input host are sibling PanelSectionRow children of
           one column, so they match by construction. Was a measured px var — see section-4.ts. */
        width: "100%",
        minWidth: 0,
        minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
        borderRadius: 8,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Focusable
        flow-children="horizontal"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          width: "100%",
          minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
          alignItems: "stretch",
        }}
      >
        <Button
          className={`bonsai-askbar-target bonsai-ask-primary${askLooksReady ? " bonsai-ask-primary--ready" : ""}`}
          {...({
            onOKButton: (evt: { stopPropagation: () => void }) => {
              if (isAsking) return;
              evt.stopPropagation();
              handleAskPress();
            },
          } as Record<string, unknown>)}
          onClick={handleAskPress}
          disabled={isAsking}
          style={{
            position: "relative",
            width: "100%",
            minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
            boxSizing: "border-box",
            paddingRight: showSearchClearButton ? 42 : 0,
            borderRadius: 0,
            border: "none",
          }}
        >
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span className="bonsai-ask-primary-label" style={{ fontWeight: 600, fontVariant: "small-caps", letterSpacing: "0.55px", fontSize: 15, lineHeight: 1 }}>
              ask
            </span>
          </span>
        </Button>
        {showSearchClearButton && (
          <div
            className="bonsai-askbar-clear-slot"
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 42,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "auto",
            }}
          >
            <Button
              onClick={clearUnifiedInput}
              aria-label="Clear"
              style={{
                width: "100%",
                height: "100%",
                minHeight: ASK_BAR_PRIMARY_MIN_HEIGHT_PX,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: askLooksReady ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.075)",
                color: "#c8d4e0",
                boxShadow: "inset 1px 0 0 rgba(255,255,255,0.1)",
                transition: "background-color 120ms ease",
              }}
            >
              <span className="bonsai-askbar-corner-icon">
                <ClearIcon size={22} />
              </span>
            </Button>
          </div>
        )}
      </Focusable>
    </div>
  </div>
</PanelSectionRow>
    </>
  );
}
