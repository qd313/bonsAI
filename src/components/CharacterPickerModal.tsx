import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ConfirmModal, Focusable, Router, TextField, ToggleField } from "@decky/ui";
import {
  AI_CHARACTER_CUSTOM_TEXT_MAX,
  CHARACTER_PICKER_COLUMNS,
  resolveAvatarBadgeLetterFromDisplayLabel,
  resolveMainTabAvatarBadgeLetter,
  resolveMainTabAvatarPresetId,
  type CharacterCatalogEntry,
  type CharacterCatalogSection,
} from "../data/characterCatalog";
import {
  resolveRunningGameCharacterSuggestions,
  type RunningGameCharacterSuggestions,
} from "../utils/runningGameCharacterSuggestions";
import { CharacterRoleplayEmoticon } from "./CharacterRoleplayEmoticon";

export type AiCharacterPickerDraft = {
  random: boolean;
  presetId: string;
  customText: string;
};

export type CharacterPickerModalProps = {
  initialDraft: AiCharacterPickerDraft;
  onCancel: () => void;
  onOK: (next: AiCharacterPickerDraft) => void | Promise<void>;
};

const PICKER_COL_COUNT = CHARACTER_PICKER_COLUMNS.length;
const LAST_PICKER_COL = PICKER_COL_COUNT - 1;
/** Only show the spinner if resolving takes longer than this (avoids flash on fast path). */
const RUNNING_STRIP_SLOW_MS = 160;

/** Decky `ToggleField` may pass `boolean` or numeric `0`/`1` depending on CEF build — normalize. */
function readToggleOn(raw: unknown): boolean | null {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  return null;
}

/**
 * Pass only to `showModal()` — `ConfirmModal` supplies Steam modal chrome; parent must not render this in the QAM tree.
 */
export function CharacterPickerModal(props: CharacterPickerModalProps) {
  const { initialDraft, onCancel, onOK } = props;
  const [draft, setDraft] = useState<AiCharacterPickerDraft>(() => ({ ...initialDraft }));
  const pickerShellRef = useRef<HTMLDivElement | null>(null);
  const customCharacterShellRef = useRef<HTMLDivElement | null>(null);
  const columnButtonRefs = useRef<Array<Array<HTMLElement | null>>>(
    Array.from({ length: PICKER_COL_COUNT }, () => [])
  );
  const suggestionButtonRefs = useRef<(HTMLElement | null)[]>([]);

  const [runningStrip, setRunningStrip] = useState<
    RunningGameCharacterSuggestions | null | undefined
  >(undefined);
  const [showSlowSpinner, setShowSlowSpinner] = useState(false);

  const randomLocked = draft.random;
  const selectedPreset = !draft.random && !draft.customText.trim() ? draft.presetId : "";

  /** Same emoticon id as the main-tab avatar for the current draft (catalog / custom / random). */
  const okButtonPreviewPresetId = useMemo(
    () =>
      resolveMainTabAvatarPresetId({
        enabled: true,
        random: draft.random,
        presetId: draft.presetId,
        customText: draft.customText,
      }) ?? "__custom__",
    [draft.random, draft.presetId, draft.customText]
  );

  const okButtonPreviewBadgeLetter = useMemo(
    () =>
      resolveMainTabAvatarBadgeLetter({
        enabled: true,
        random: draft.random,
        presetId: draft.presetId,
        customText: draft.customText,
      }) ?? "?",
    [draft.random, draft.presetId, draft.customText]
  );

  const customFieldBadgeLetter = useMemo((): string => {
    if (draft.random) return "?";
    const t = draft.customText.trim();
    if (t) return resolveAvatarBadgeLetterFromDisplayLabel(t);
    return "?";
  }, [draft.random, draft.customText]);

  const strOKButtonText = useMemo(
    () => (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <CharacterRoleplayEmoticon
          key={okButtonPreviewPresetId}
          presetId={okButtonPreviewPresetId}
          size={22}
          badgeLetter={okButtonPreviewBadgeLetter}
        />
        <span>OK</span>
      </span>
    ),
    [okButtonPreviewPresetId, okButtonPreviewBadgeLetter]
  );

  const columnEntryCounts = useMemo(
    () => CHARACTER_PICKER_COLUMNS.map((col) => col.reduce((n, s) => n + s.entries.length, 0)),
    []
  );

  useEffect(() => {
    let cancelled = false;
    let slowTimer: number | null = null;
    setRunningStrip(undefined);
    setShowSlowSpinner(false);
    slowTimer = window.setTimeout(() => {
      if (!cancelled) setShowSlowSpinner(true);
    }, RUNNING_STRIP_SLOW_MS);

    void (async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      if (cancelled) {
        return;
      }
      const app = Router.MainRunningApp;
      const appId = app?.appid != null ? String(app.appid).trim() : "";
      const displayName = app?.display_name != null ? String(app.display_name) : "";
      const next = resolveRunningGameCharacterSuggestions(
        appId || undefined,
        displayName || undefined
      );
      if (cancelled) return;
      if (slowTimer != null) {
        window.clearTimeout(slowTimer);
        slowTimer = null;
      }
      setShowSlowSpinner(false);
      setRunningStrip(next);
    })();

    return () => {
      cancelled = true;
      if (slowTimer != null) window.clearTimeout(slowTimer);
    };
  }, []);

  const selectPreset = useCallback((entry: CharacterCatalogEntry) => {
    setDraft((d) => ({
      ...d,
      random: false,
      presetId: entry.id,
      customText: "",
    }));
  }, []);

  const findFooterButton = useCallback((label: string): HTMLElement | null => {
    const shell = pickerShellRef.current;
    if (!shell) return null;
    const want = label.trim().toLowerCase();
    let p: HTMLElement | null = shell.parentElement;
    for (let d = 0; d < 22 && p; d++) {
      for (const btn of p.querySelectorAll("button, [role=\"button\"]")) {
        const el = btn as HTMLElement;
        if (shell.contains(el)) continue;
        const t = el.textContent?.trim().toLowerCase() ?? "";
        if (t === want) return el;
      }
      p = p.parentElement;
    }
    return null;
  }, []);

  const focusRandomToggle = useCallback(() => {
    const shell = pickerShellRef.current;
    if (!shell) return false;
    const box = shell.querySelector(".bonsai-ai-char-random");
    const el = box?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    );
    el?.focus();
    return !!el;
  }, []);

  const focusCustomCharacterField = useCallback((): boolean => {
    const shell = customCharacterShellRef.current;
    if (!shell) return false;
    const el = shell.querySelector<HTMLElement>(
      "textarea, input:not([type='hidden']), [contenteditable='true']"
    );
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return !!el;
  }, []);

  const focusLastButtonInColumn0 = useCallback((): boolean => {
    const list = (columnButtonRefs.current[0] ?? []).filter(Boolean) as HTMLElement[];
    if (!list.length) return false;
    const el = list[list.length - 1];
    el.focus();
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }, []);

  const focusButtonAtColumnIndex = useCallback((col: number, index: number): boolean => {
    const list = (columnButtonRefs.current[col] ?? []).filter(Boolean) as HTMLElement[];
    if (!list.length) return false;
    const i = Math.max(0, Math.min(index, list.length - 1));
    const el = list[i];
    el.focus();
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }, []);

  const handleEntryMove = useCallback(
    (columnIndex: number, entryIndex: number, direction: "left" | "right"): boolean => {
      if (direction === "right" && columnIndex === LAST_PICKER_COL) {
        const cancel = findFooterButton("Cancel");
        if (cancel) {
          cancel.focus();
          return true;
        }
        return false;
      }
      if (direction === "left" && columnIndex === 0) {
        return focusRandomToggle();
      }
      const nextColumn = direction === "right" ? columnIndex + 1 : columnIndex - 1;
      return focusButtonAtColumnIndex(nextColumn, entryIndex);
    },
    [findFooterButton, focusButtonAtColumnIndex, focusRandomToggle]
  );

  const focusFooterOk = useCallback((): boolean => {
    const ok = findFooterButton("OK");
    if (ok) {
      ok.focus();
      return true;
    }
    return false;
  }, [findFooterButton]);

  const focusFirstSuggestion = useCallback((): boolean => {
    if (!runningStrip?.entries.length) return false;
    const el = suggestionButtonRefs.current[0];
    if (!el) return false;
    el.focus();
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }, [runningStrip]);

  const focusLastSuggestion = useCallback((): boolean => {
    if (!runningStrip?.entries.length) return false;
    const i = runningStrip.entries.length - 1;
    const el = suggestionButtonRefs.current[i];
    if (!el) return false;
    el.focus();
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }, [runningStrip]);

  const focusAboveCatalogColumn0 = useCallback((): boolean => {
    if (runningStrip?.entries.length) {
      return focusLastSuggestion();
    }
    return focusLastButtonInColumn0();
  }, [runningStrip, focusLastSuggestion, focusLastButtonInColumn0]);

  const renderSection = (section: CharacterCatalogSection, columnIndex: number, indexOffset: number) => {
    const lastFlatInColumn = columnEntryCounts[columnIndex] - 1;
    const sectionKey = `c${columnIndex}-${section.entries[0]?.id ?? "x"}-${section.workTitle}`;
    return (
      <div key={sectionKey} style={{ marginBottom: 12 }}>
        <div
          className="bonsai-ai-char-section-title"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#b8c6d6",
            marginBottom: 6,
            letterSpacing: "0.02em",
          }}
        >
          {section.workTitle}
        </div>
        <Focusable style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {section.entries.map((entry, entryIndex) => {
            const flatIndex = indexOffset + entryIndex;
            const active = selectedPreset === entry.id;
            const isLastInColumn = flatIndex === lastFlatInColumn;
            return (
              <div key={entry.id} data-bonsai-ai-char-col={String(columnIndex)}>
                <Button
                  ref={(el: HTMLElement | null) => {
                    columnButtonRefs.current[columnIndex][flatIndex] = el;
                  }}
                  disabled={randomLocked}
                  focusable={!randomLocked}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectPreset(entry);
                  }}
                  {...({
                    onOKButton: (evt: { stopPropagation: () => void }) => {
                      evt.stopPropagation();
                      selectPreset(entry);
                    },
                    onMoveLeft: () => handleEntryMove(columnIndex, flatIndex, "left"),
                    onMoveRight: () => handleEntryMove(columnIndex, flatIndex, "right"),
                    onMoveUp: () => {
                      if (flatIndex === 0) {
                        if (runningStrip?.entries.length) {
                          return focusLastSuggestion();
                        }
                        return focusRandomToggle();
                      }
                      return false;
                    },
                    onMoveDown: () => {
                      if (isLastInColumn) {
                        return focusCustomCharacterField();
                      }
                      return false;
                    },
                  } as unknown as Record<string, unknown>)}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 38,
                    padding: "4px 6px",
                    borderRadius: 4,
                    border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.12)",
                    background: active
                      ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)"
                      : "rgba(255,255,255,0.04)",
                    color: "#e8eef5",
                    justifyContent: "flex-start",
                    minWidth: 0,
                  }}
                >
                  <CharacterRoleplayEmoticon
                    presetId={entry.id}
                    size={24}
                    badgeLetter={resolveAvatarBadgeLetterFromDisplayLabel(entry.label)}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.label}
                  </span>
                </Button>
              </div>
            );
          })}
        </Focusable>
      </div>
    );
  };

  const renderColumn = (sections: CharacterCatalogSection[], columnIndex: number) => {
    let offset = 0;
    return sections.map((section) => {
      const node = renderSection(section, columnIndex, offset);
      offset += section.entries.length;
      return node;
    });
  };

  return (
    <ConfirmModal
      strTitle="AI character"
      strDescription={
        <div
          ref={pickerShellRef}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            textAlign: "left",
            minWidth: 0,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "2px 0",
          }}
        >
          <div
            className="bonsai-ai-char-random"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <ToggleField
                label="Random"
                description="Pick a different catalog character for each Ask. Disables the list below."
                checked={draft.random}
                {...({
                  onMoveRight: () => focusFooterOk(),
                  ...(draft.random
                    ? {
                        onMoveDown: () => focusFooterOk(),
                      }
                    : {
                        onMoveDown: () => {
                          if (focusFirstSuggestion()) return true;
                          return focusButtonAtColumnIndex(0, 0);
                        },
                      }),
                } as unknown as Record<string, unknown>)}
                onChange={(raw: unknown) => {
                  const on = readToggleOn(raw);
                  setDraft((d) => {
                    if (on === true) {
                      return { random: true, presetId: "", customText: "" };
                    }
                    if (on === false) {
                      return { ...d, random: false };
                    }
                    return d;
                  });
                }}
              />
            </div>
            <div style={{ flexShrink: 0 }} aria-hidden>
              <CharacterRoleplayEmoticon presetId="__random__" size={26} />
            </div>
          </div>
          {runningStrip === undefined && showSlowSpinner && (
            <div
              className="bonsai-ai-char-running-loading"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 28,
                minWidth: 0,
              }}
              aria-busy
            >
              <style>{`@keyframes bonsai-ai-char-running-spin { to { transform: rotate(360deg); } }`}</style>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.14)",
                  borderTopColor: "rgba(255, 214, 150, 0.92)",
                  animation: "bonsai-ai-char-running-spin 0.65s linear infinite",
                  flexShrink: 0,
                }}
              />
            </div>
          )}
          {runningStrip != null && (
            <div
              className="bonsai-ai-char-running-strip"
              inert={randomLocked ? true : undefined}
              style={{
                opacity: randomLocked ? 0.45 : 1,
                pointerEvents: randomLocked ? "none" : "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#b8c6d6",
                  letterSpacing: "0.02em",
                }}
              >
                Playing: {runningStrip.headline}
              </div>
              <Focusable style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {runningStrip.entries.map((entry, si) => {
                  const lastSi = runningStrip.entries.length - 1;
                  const active = selectedPreset === entry.id;
                  return (
                    <Button
                      key={`run-suggest-${entry.id}`}
                      ref={(el: HTMLElement | null) => {
                        suggestionButtonRefs.current[si] = el;
                      }}
                      disabled={randomLocked}
                      focusable={!randomLocked}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectPreset(entry);
                      }}
                      {...({
                        onOKButton: (evt: { stopPropagation: () => void }) => {
                          evt.stopPropagation();
                          selectPreset(entry);
                        },
                        onMoveUp: () => focusRandomToggle(),
                        onMoveDown: () => {
                          if (si === lastSi) {
                            return focusButtonAtColumnIndex(0, 0);
                          }
                          return false;
                        },
                        onMoveLeft: () => {
                          if (si === 0) return focusRandomToggle();
                          suggestionButtonRefs.current[si - 1]?.focus();
                          return true;
                        },
                        onMoveRight: () => {
                          if (si === lastSi) return focusButtonAtColumnIndex(0, 0);
                          suggestionButtonRefs.current[si + 1]?.focus();
                          return true;
                        },
                      } as unknown as Record<string, unknown>)}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 38,
                        padding: "4px 6px",
                        borderRadius: 4,
                        border: active ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.12)",
                        background: active
                          ? "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)"
                          : "rgba(255,255,255,0.04)",
                        color: "#e8eef5",
                        justifyContent: "flex-start",
                        minWidth: 0,
                        flex: "1 1 auto",
                      }}
                    >
                      <CharacterRoleplayEmoticon
                        presetId={entry.id}
                        size={24}
                        badgeLetter={resolveAvatarBadgeLetterFromDisplayLabel(entry.label)}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {entry.label}
                      </span>
                    </Button>
                  );
                })}
              </Focusable>
            </div>
          )}
          <div
            className="bonsai-ai-char-catalog-scroll"
            inert={randomLocked ? true : undefined}
            style={{
              opacity: randomLocked ? 0.45 : 1,
              pointerEvents: randomLocked ? "none" : "auto",
              maxHeight: "min(340px, 52vh)",
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 4,
              display: "flex",
              flexDirection: "row",
              gap: 8,
              alignItems: "flex-start",
              minWidth: 0,
            }}
          >
            {CHARACTER_PICKER_COLUMNS.map((sections, colIdx) => (
              <div key={`picker-col-${colIdx}`} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                {renderColumn(sections, colIdx)}
              </div>
            ))}
          </div>
          <div
            ref={customCharacterShellRef}
            className="bonsai-ai-char-custom"
            inert={randomLocked ? true : undefined}
            style={{
              opacity: randomLocked ? 0.45 : 1,
              pointerEvents: randomLocked ? "none" : "auto",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div style={{ flexShrink: 0 }} aria-hidden>
              <CharacterRoleplayEmoticon
                presetId="__custom__"
                size={26}
                badgeLetter={customFieldBadgeLetter}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TextField
                label="Custom character"
                value={draft.customText}
                disabled={randomLocked}
                {...({
                  placeholder: "Or type in your own character!",
                  multiline: true,
                  rows: 2,
                  onMoveUp: () => focusAboveCatalogColumn0(),
                } as unknown as Record<string, unknown>)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    random: false,
                    presetId: "",
                    customText: v.slice(0, AI_CHARACTER_CUSTOM_TEXT_MAX),
                  }));
                }}
              />
            </div>
          </div>
        </div>
      }
      strOKButtonText={strOKButtonText}
      strCancelButtonText="Cancel"
      onOK={() => {
        void onOK({
          random: draft.random,
          presetId: draft.presetId.trim(),
          customText: draft.customText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim(),
        });
      }}
      onCancel={onCancel}
    />
  );
}
