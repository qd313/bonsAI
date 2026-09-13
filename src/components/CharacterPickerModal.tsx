/**
 * Title: Character picker modal
 * Purpose: Full-screen roleplay character preset picker with four-column D-pad layout.
 * Used for: Settings / Main tab when AI character chrome is enabled.
 * Solves: Large catalog navigation in a modal with its own focus graph owner.
 * Does not: Apply roleplay prompts — backend ai_character_service builds system suffixes.
 */
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
import { BonsaiModalScope } from "./BonsaiModalScope";

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

/*
 * Every avatar in this modal, one number (D33, locked 2026-08-27 at 26px — option C, "grow the
 * picker part-way rather than to the design's 44px").
 *
 * It was five hardcoded numbers — 22 on the OK button preview, 24 on both character grids, 26 on
 * the Random and Custom rows — which is what let the picker straddle the design's badge line: the
 * handoff puts the letter badge inside the disc at 26 and above and beside it below, so one screen
 * would have shown both treatments. One constant is also how the maintainer changes their mind
 * cheaply, which they said they might after seeing 26 on the Deck.
 *
 * The main tab Ask bar is deliberately NOT on this constant: it is pinned to its own 18px slot and
 * the standing instruction is that the Ask row must not move.
 */
const PICKER_AVATAR_PX = 26;

/**
 * Inner padding on each character grid column (roadmap: "The focus ring is clipped on grid
 * layouts"). Every entry button stretches to its column's full width with zero inset, and the
 * column div itself clips overflow -- so a focused button flush against the top, bottom, left or
 * right edge of its column had its D-pad ring cut off before it could render: rings paint outside
 * the element's own border box, but `overflow: hidden` does not know that and clips at the edge
 * regardless. Padding inside that same clipping box gives the ring room to render without ever
 * reaching the clip boundary.
 *
 * 6px covers either reference point at hand: bonsAI's own documented "outer ring" recipe
 * (design-tokens.md, an outline plus two box-shadow layers) reaches about 5px past the element,
 * and Steam's native ring on a plain, unstyled `Button` like this one -- the ring actually in
 * play here, since this modal's buttons carry none of the specific classes that recipe targets --
 * has been read on device as roughly 2-3px plus a soft glow. This is inner padding for the ring,
 * not a decorative gutter (docs/design-language.md Rule 1); it costs a few px of label width on
 * every entry, not just the ones at an edge, because every column clips independently.
 */
const PICKER_GRID_RING_PAD_PX = 6;

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
  const randomRowRef = useRef<HTMLDivElement | null>(null);
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
          size={PICKER_AVATAR_PX}
          art="prop"
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
    // Scoped to a ref'd container rather than found by class from the shell: a registered mounted
    // owner is what AGENTS.md (Decky focus graph) asks for, and the class lookup was one of
    // the DOM queries that made this screen unnavigable on Deck.
    const box = randomRowRef.current;
    if (!box) return false;
    const el = box.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    );
    el?.focus();
    return !!el;
  }, []);

  /**
   * Claim focus for the Random toggle when the picker opens with Random already on.
   *
   * With `randomLocked` every other control in the body is `disabled` / `focusable={false}` /
   * `inert` — the character grid, the suggestions, the custom field. The toggle is then the **only**
   * focusable control, and the only way to unlock the rest. If nothing claims it on open, the screen
   * reads as dead on a Deck: no visible focus ring anywhere, D-pad does nothing, and the user cannot
   * reach the one control that would let them pick a character. That is the 2026-08-04 report
   * ("select a character, it stays on random") — the selection never moved because it could not.
   *
   * Two frames: one for ConfirmModal to mount its body, one for Decky to finish its own focus pass,
   * so this claim lands last rather than being overwritten.
   */
  /**
   * Claim the Random toggle on open **only when it locks everything else**.
   *
   * With `randomLocked` the grid, the suggestions and the custom field are all `disabled` /
   * `focusable={false}` / `inert`, so the toggle is the only focusable control and the only way to
   * unlock the rest. Unlocked, the grid is navigable on its own and Decky picks the starting
   * control — claiming one here would only fight it.
   *
   * Kept deliberately narrow after 2026-08-04: two earlier versions of this effect (locked-only,
   * then unconditional) were both written on the theory that nothing was claiming focus. The real
   * cause of "no focus ring, D-pad dead" was that this modal rendered outside `.bonsai-scope`, so
   * none of the ring CSS could match it. `BonsaiModalScope` fixed that. Do not widen this again
   * without evidence that a claim, rather than the styling, is what is missing.
   */
  useEffect(() => {
    if (!initialDraft.random) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        focusRandomToggle();
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
    // Mount-only: re-running on later draft changes would yank focus mid-interaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    size={PICKER_AVATAR_PX}
                    art="prop"
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
        <BonsaiModalScope shellRef={pickerShellRef}>
        <div
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
            ref={randomRowRef}
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
              <CharacterRoleplayEmoticon presetId="__random__" size={PICKER_AVATAR_PX} art="prop" />
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
                        size={PICKER_AVATAR_PX}
                        art="prop"
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
              <div
                key={`picker-col-${colIdx}`}
                className="bonsai-ai-char-grid-col"
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  padding: PICKER_GRID_RING_PAD_PX,
                }}
              >
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
                size={PICKER_AVATAR_PX}
                art="prop"
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
        </BonsaiModalScope>
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
