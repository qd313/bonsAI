import React from "react";
import { PanelSection, PanelSectionRow, TextField, Button, Focusable, Router } from "@decky/ui";
import type { PresetPrompt } from "../data/presets";
import {
  ASK_LABEL_COLOR,
  UNIFIED_INPUT_ICON_STRIP_PX,
  UNIFIED_TEXT_BODY_MAX_PX,
  UNIFIED_TEXT_FONT_PX,
  UNIFIED_TEXT_LINE_HEIGHT,
  UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX,
} from "../features/unified-input/constants";
import { splitResponseIntoChunks } from "../utils/splitResponseIntoChunks";
import { getFocusableWithin, isLeftNavigationKey, isRightNavigationKey } from "../utils/focusNavigation";
import { formatBytes, formatScreenshotTimestamp, toFileUri } from "../utils/mediaFormat";
import type { AppliedResult, AskAttachment, OllamaContextUi, ScreenshotItem } from "../types/bonsaiUi";
import {
  AskMicIcon,
  AskStopIcon,
  AttachMediaIcon,
  BackChevronIcon,
  ClearIcon,
  ImageAttachmentIcon,
  RefreshArrowIcon,
} from "./icons";

export type MainTabProps = {
  fullBleedRowStyle: React.CSSProperties;
  presetButtonSurface: React.CSSProperties;
  suggestedPrompts: PresetPrompt[];
  setUnifiedInput: React.Dispatch<React.SetStateAction<string>>;
  unifiedInputHostRef: React.Ref<HTMLDivElement>;
  unifiedInputFieldLayerRef: React.Ref<HTMLDivElement>;
  unifiedInputMeasureRef: React.Ref<HTMLDivElement>;
  attachActionHostRef: React.Ref<HTMLDivElement>;
  askBarHostRef: React.Ref<HTMLDivElement>;
  screenshotBrowserHostRef: React.Ref<HTMLDivElement>;
  unifiedInputSurfacePx: number;
  unifiedInput: string;
  usesNativeMultilineField: boolean;
  setIsUnifiedInputFocused: (v: boolean) => void;
  isUnifiedInputFocused: boolean;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredSettings: string[];
  selectedIndex: number;
  onSettingClick: (settingPath: string, index?: number) => void;
  isAsking: boolean;
  ollamaIp: string;
  onAskOllama: () => void | Promise<void>;
  onOpenScreenshotBrowser: () => void | Promise<void>;
  onCancelAsk: () => void;
  onMicInput: () => void;
  selectedAttachment: AskAttachment | null;
  setSelectedAttachment: React.Dispatch<React.SetStateAction<AskAttachment | null>>;
  clearUnifiedInput: () => void;
  showSearchClearButton: boolean;
  isScreenshotBrowserOpen: boolean;
  onCloseScreenshotBrowser: () => void;
  loadRecentScreenshots: (limit?: number) => Promise<void>;
  mediaError: string;
  recentScreenshots: ScreenshotItem[];
  isLoadingRecentScreenshots: boolean;
  onSelectRecentScreenshot: (item: ScreenshotItem) => void;
  navigationMessage: string;
  isQamSetting: (settingPath: string) => boolean;
  showSlowWarning: boolean;
  latencyWarningSeconds: number;
  ollamaResponse: string;
  elapsedSeconds: number | null;
  lastApplied: AppliedResult | null;
  ollamaContext: OllamaContextUi;
  /** True when the last completed ask succeeded and a Q+A snapshot is available for Desktop save. */
  canSaveDesktopNote: boolean;
  onOpenDesktopNoteSave: () => void;
  /** When false, screenshot attach is blocked (Permissions); control is shown dimmed. */
  mediaLibraryEnabled?: boolean;
  /** When false, Desktop save is blocked (Permissions); control is shown dimmed. */
  desktopNoteSaveEnabled?: boolean;
};

export function MainTab(props: MainTabProps) {
  const {
    fullBleedRowStyle,
    presetButtonSurface,
    suggestedPrompts,
    setUnifiedInput,
    unifiedInputHostRef,
    unifiedInputFieldLayerRef,
    unifiedInputMeasureRef,
    attachActionHostRef,
    askBarHostRef,
    screenshotBrowserHostRef,
    unifiedInputSurfacePx,
    unifiedInput,
    usesNativeMultilineField,
    setIsUnifiedInputFocused,
    isUnifiedInputFocused,
    setSelectedIndex,
    filteredSettings,
    selectedIndex,
    onSettingClick,
    isAsking,
    ollamaIp,
    onAskOllama,
    onOpenScreenshotBrowser,
    onCancelAsk,
    onMicInput,
    selectedAttachment,
    setSelectedAttachment,
    clearUnifiedInput,
    showSearchClearButton,
    isScreenshotBrowserOpen,
    onCloseScreenshotBrowser,
    loadRecentScreenshots,
    mediaError,
    recentScreenshots,
    isLoadingRecentScreenshots,
    onSelectRecentScreenshot,
    navigationMessage,
    isQamSetting,
    showSlowWarning,
    latencyWarningSeconds,
    ollamaResponse,
    elapsedSeconds,
    lastApplied,
    ollamaContext,
    canSaveDesktopNote,
    onOpenDesktopNoteSave,
    mediaLibraryEnabled = true,
    desktopNoteSaveEnabled = true,
  } = props;
  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <div className="bonsai-full-bleed-row" style={{ ...fullBleedRowStyle, display: "grid", gap: 8 }}>
            {suggestedPrompts.map((p, i) => (
              <Button
                key={`preset-${i}`}
                className="bonsai-preset-glass"
                onClick={() => {
                  const gameName = Router.MainRunningApp?.display_name ?? "";
                  setUnifiedInput(gameName ? `${p.text} for ${gameName}` : p.text);
                }}
                style={{
                  width: "100%",
                  minHeight: 34,
                  fontSize: 12,
                  color: "#c4d3e2",
                }}
              >
                {p.text}
                {p.beta && (
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.55, fontStyle: "italic" }}>
                    [beta]
                  </span>
                )}
              </Button>
            ))}
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div
            ref={unifiedInputHostRef}
            className="bonsai-unified-input-host bonsai-glass-panel bonsai-full-bleed-row"
            style={fullBleedRowStyle}
          >
            <div
              ref={unifiedInputFieldLayerRef}
              style={{
                position: "relative",
                width: "100%",
                minHeight: unifiedInputSurfacePx + UNIFIED_INPUT_ICON_STRIP_PX,
              }}
            >
              <div
                ref={unifiedInputMeasureRef}
                aria-hidden
                style={{
                  position: "absolute",
                  visibility: "hidden",
                  pointerEvents: "none",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
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
                  setUnifiedInput(e.target.value);
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
              {!usesNativeMultilineField && (
                <div
                  className="bonsai-unified-input-text-overlay"
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    bottom: UNIFIED_INPUT_ICON_STRIP_PX + UNIFIED_TEXT_OVERLAY_BOTTOM_GAP_PX,
                    color: isUnifiedInputFocused ? "rgba(248, 250, 252, 0.98)" : "rgba(220, 232, 244, 0.95)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: UNIFIED_TEXT_LINE_HEIGHT,
                    fontSize: UNIFIED_TEXT_FONT_PX,
                  }}
                >
                  {unifiedInput}
                  {isUnifiedInputFocused && <span className="bonsai-unified-input-fake-caret" aria-hidden>|</span>}
                </div>
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
                  zIndex: 5,
                  margin: 0,
                  padding: 0,
                  boxSizing: "border-box",
                }}
              >
                <Focusable
                  flow-children="horizontal"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    width: "100%",
                    height: "100%",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    margin: 0,
                    padding: 0,
                  }}
                >
                  <Button
                    className="bonsai-askbar-target bonsai-unified-input-corner-left"
                    onClick={onOpenScreenshotBrowser}
                    disabled={isAsking}
                    aria-label="Attach screenshot"
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
                    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="bonsai-unified-input-icon">
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
                  {isAsking ? (
                    <Button
                      className="bonsai-askbar-target bonsai-unified-input-corner-right"
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
                      }}
                    >
                      <span className="bonsai-unified-input-icon">
                        <AskStopIcon size={20} />
                      </span>
                    </Button>
                  ) : (
                    <Button
                      className="bonsai-askbar-target bonsai-unified-input-corner-right"
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
                      }}
                    >
                      <span className="bonsai-unified-input-icon">
                        <AskMicIcon size={16} />
                      </span>
                    </Button>
                  )}
                </Focusable>
              </div>
            </div>
          </div>
        </PanelSectionRow>
        {selectedAttachment && (
          <PanelSectionRow>
            <div
              className="bonsai-full-bleed-row"
              onKeyDownCapture={(ev: React.KeyboardEvent<HTMLDivElement>) => {
                const activeEl = document.activeElement as HTMLElement | null;
                const previewActive = Boolean(activeEl?.closest(".bonsai-attachment-preview-target"));
                const removeActive = Boolean(activeEl?.closest(".bonsai-attachment-remove-target"));
                if (isRightNavigationKey(ev.key) && previewActive) {
                  const removeTarget = getFocusableWithin(".bonsai-attachment-remove-target");
                  if (removeTarget) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    removeTarget.focus();
                  }
                  return;
                }
                if (isLeftNavigationKey(ev.key) && removeActive) {
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
          <div className="bonsai-full-bleed-row bonsai-ask-bleed-wrap" style={{ ...fullBleedRowStyle }}>
            <div
              ref={askBarHostRef}
              className="bonsai-askbar-merged bonsai-glass-panel bonsai-askbar-row-host"
              style={{
                position: "relative",
                width: "var(--bonsai-search-host-width, 100%)",
                minWidth: "var(--bonsai-search-host-width, 100%)",
                minHeight: 44,
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
                  minHeight: 44,
                  alignItems: "stretch",
                }}
              >
                <Button
                  className="bonsai-askbar-target bonsai-ask-primary"
                  onClick={onAskOllama}
                  disabled={isAsking}
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: 44,
                    boxSizing: "border-box",
                    paddingRight: showSearchClearButton ? 42 : 0,
                    borderRadius: 0,
                    border: "none",
                    background: showSearchClearButton ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.04)",
                    color: ASK_LABEL_COLOR,
                    transition: "background-color 120ms ease",
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
                        minHeight: 44,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        background: showSearchClearButton ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.04)",
                        color: "#c8d4e0",
                        boxShadow: "inset 1px 0 0 rgba(255,255,255,0.08)",
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
        {isScreenshotBrowserOpen && (
          <PanelSectionRow>
            <Focusable
              className="bonsai-full-bleed-row"
              flow-children="vertical"
              ref={screenshotBrowserHostRef}
              onKeyDown={(ev: React.KeyboardEvent<HTMLDivElement>) => {
                if (ev.key === "Escape" || ev.key === "Backspace") {
                  onCloseScreenshotBrowser();
                  ev.preventDefault();
                }
              }}
              style={{
                ...fullBleedRowStyle,
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 8,
                background: "rgba(12, 18, 25, 0.96)",
                padding: 10,
                display: "grid",
                gap: 8,
                minHeight: 320,
                position: "relative",
              }}
            >
              <Focusable flow-children="horizontal" style={{ display: "flex", gap: 8 }}>
                <Button
                  onClick={onCloseScreenshotBrowser}
                  aria-label="Back"
                  style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
                >
                  <BackChevronIcon size={20} />
                </Button>
                <Button
                  onClick={() => {
                    void loadRecentScreenshots(24);
                  }}
                  disabled={isLoadingRecentScreenshots}
                  aria-label="Refresh screenshots"
                  style={{ minWidth: 52, width: 52, minHeight: 34, padding: 0, ...presetButtonSurface }}
                >
                  <RefreshArrowIcon size={20} />
                </Button>
              </Focusable>

              {mediaError && (
                <div style={{ color: "#f09a8d", fontSize: 11, lineHeight: 1.35 }}>
                  {mediaError}
                </div>
              )}

              {recentScreenshots.length === 0 && !isLoadingRecentScreenshots ? (
                <div style={{ color: "#9cb0c6", fontSize: 12, lineHeight: 1.4 }}>
                  No recent screenshots found. Open Steam Media and take a screenshot, then refresh.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    alignContent: "start",
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {recentScreenshots.map((item) => (
                    <Button
                      key={item.path}
                      onClick={() => onSelectRecentScreenshot(item)}
                      style={{
                        minHeight: 144,
                        ...presetButtonSurface,
                        padding: 6,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        justifyContent: "flex-start",
                        gap: 4,
                        textAlign: "left",
                      }}
                    >
                      <img
                        src={item.preview_data_uri || toFileUri(item.path)}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: 94,
                          objectFit: "cover",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.04)",
                        }}
                      />
                      <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 9, color: "#8ea2b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatScreenshotTimestamp(item.mtime)}
                      </span>
                      <span style={{ fontSize: 10, color: "#d9e6f4", fontWeight: 700 }}>
                        Size: {formatBytes(item.size_bytes ?? 0)}
                      </span>
                    </Button>
                  ))}
                </div>
              )}

            </Focusable>
          </PanelSectionRow>
        )}

        {navigationMessage && (
          <PanelSectionRow>
            <div style={{ color: "#81c784", fontSize: 13 }}>{navigationMessage}</div>
          </PanelSectionRow>
        )}

        {filteredSettings.length > 0 && (
          <>
            <PanelSectionRow>
              <div style={{ color: "gray", padding: "6px 0", fontSize: 13 }}>Results</div>
            </PanelSectionRow>
            {filteredSettings.map((s, i) => {
              const isQam = isQamSetting(s);
              const isSelected = i === selectedIndex;
              const parts = s.split(">").map((part) => part.trim()).filter(Boolean);
              const title = parts[parts.length - 1] ?? s;
              const breadcrumb = parts.slice(0, -1).join(" > ");
              const compactLine = isQam ? `* QAM > ${title}` : `${title}`;
              const compactSubline = isQam ? `(${breadcrumb})` : breadcrumb;

              return (
                <PanelSectionRow key={i}>
                  <Button
                    onClick={() => onSettingClick(s, i)}
                    style={{
                      width: "100%",
                      minHeight: 28,
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
                </PanelSectionRow>
              );
            })}
          </>
        )}

        {isAsking && showSlowWarning && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12, padding: "6px 0" }}>
              This is taking a while (&gt;{latencyWarningSeconds}s)... If responses are consistently slow, verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower.
            </div>
          </PanelSectionRow>
        )}
        {canSaveDesktopNote && (
          <PanelSectionRow>
            <Button
              onClick={() => onOpenDesktopNoteSave()}
              style={{
                width: "100%",
                minHeight: 38,
                border: "1px solid rgba(150, 187, 223, 0.45)",
                background: "rgba(64, 93, 124, 0.35)",
                color: "#dce8f4",
                opacity: desktopNoteSaveEnabled ? 1 : 0.45,
              }}
            >
              Save to Desktop note…
            </Button>
          </PanelSectionRow>
        )}
        {ollamaResponse && splitResponseIntoChunks(ollamaResponse).map((chunk, i, arr) => (
          <PanelSectionRow key={`ai-chunk-${i}`}>
            <Focusable
              className="bonsai-ai-response-chunk"
              onActivate={() => {}}
              noFocusRing={false}
              style={{
                borderRadius: i === 0 && arr.length === 1 ? 4
                  : i === 0 ? "4px 4px 0 0"
                  : i === arr.length - 1 ? "0 0 4px 4px"
                  : 0,
                marginTop: i > 0 ? -8 : 0,
                marginBottom: i === arr.length - 1 ? 80 : 0,
              }}
            >
              {chunk}
            </Focusable>
          </PanelSectionRow>
        ))}
        {!isAsking && elapsedSeconds != null && elapsedSeconds > latencyWarningSeconds && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12 }}>
              Response took {elapsedSeconds}s (warning threshold: {latencyWarningSeconds}s) — verify Ollama is using your GPU, not CPU. CPU inference is dramatically slower.
            </div>
          </PanelSectionRow>
        )}
        {lastApplied && (lastApplied.tdp_watts != null || lastApplied.gpu_clock_mhz != null) && (
          <PanelSectionRow>
            <div style={{ color: "#f2cf84", fontSize: 12 }}>
              Applied to system successfully. If QAM Performance sliders look stale, close and reopen the QAM Performance tab to verify reflected values.
            </div>
          </PanelSectionRow>
        )}
        {ollamaContext && (
          <PanelSectionRow>
            <div style={{ color: "#9fb7d5", fontSize: 13 }}>
              {ollamaContext.app_context === "active" && ollamaContext.app_id
                ? `Context: active game AppID ${ollamaContext.app_id}`
                : "Context: no active game detected"}
            </div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
}
