/**
 * Title: Settings tab -- the AI voice & personality section's rows
 *
 * Purpose: The rows inside the folded "AI voice & personality" section (plan 91 § 2b, plan 92 T1): the
 * on/off switch, the character picker button (which opens its own popup), and the Accent intensity row
 * with its popover menu. One line each. This file also owns the one piece of local state here, whether the
 * accent menu is open, and keeps it across a rebuild of the tab (leaving Settings and coming back).
 *
 * Used for: SettingsTab, inside the "character" FoldedSection.
 *
 * Solves: Moving this block out of SettingsTab.tsx unchanged in behaviour: the picker remembers itself
 * before opening so the ring comes back to it (modalReturnFocusRegistry), the accent control carries both
 * an onClick and an onOKButton at one toggle guarded against running twice for one press, and the menu's
 * removal with the ring inside it hands the ring back to the accent control through Steam's own transfer.
 * The longer words (the switch's description, the accent level and the pointer to the menu) ride on the
 * rows for the help strip.
 *
 * Does not: Open the character picker itself (`onOpenCharacterPicker` does) or save any setting.
 *
 * Focus: Up from the switch goes to the section's line and Down from the last control (the accent
 * control, or the switch while the character is off) to the next line, both handed in by the tab. The
 * switch's Down is left to Steam's column while the picker and the accent row sit below it.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";

import {
  AI_CHARACTER_ACCENT_INTENSITY_OPTIONS,
  type AiCharacterAccentIntensityId,
} from "./aiCharacterAccentIntensity";
import { formatAiCharacterSelectionLine } from "./characterCatalog";
import { DenseRow, DenseSwitchRow } from "../folded-tabs/DenseRow";
import { accentIntensityHelp, SETTINGS_ROW_HELP } from "../settings/settingsTabFolds";
import { registerModalReturnFocusOwner, rememberModalReturnFocus } from "../../shared/dpad/modalReturnFocusRegistry";
import { focusInTabBody } from "../../shared/dpad/useTabBodyFocusScroll";
import { ASK_LABEL_COLOR_50 } from "../unified-input/constants";
import { FOCUS_RING_BTN_CLASS, FOCUS_RING_INSET_CLASS, FOCUS_RING_WRAP_CLASS } from "../../styles/settingsGlassButton";
import { textPx } from "../../styles/textPx";
import { elementHasGamepadFocus } from "../../utils/uiDocument";
import {
  consumeSettingsTabLocalPending,
  peekSettingsTabLocalPending,
  registerSettingsTabLocalGetter,
  unregisterSettingsTabLocalGetter,
} from "../settings/settingsTabLocalSurvival";
import { SettingsTabAccentIntensityMenuPopover } from "./SettingsTabAccentIntensityMenuPopover";

const accentIntensityOutline: Record<AiCharacterAccentIntensityId, string> = {
  subtle: "#eab308",
  balanced: "#f97316",
  heavy: "#b91c1c",
  unleashed: "#a855f7",
};

export type SettingsTabCharacterSectionProps = {
  aiCharacterEnabled: boolean;
  setAiCharacterEnabled: (v: boolean) => void;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  aiCharacterAccentIntensity: AiCharacterAccentIntensityId;
  setAiCharacterAccentIntensity: (v: AiCharacterAccentIntensityId) => void;
  onOpenCharacterPicker: () => void;
  /** Up from the switch: the section's line. */
  onMoveUpFromFirst: () => boolean;
  /** Down from the last control: the next line. */
  onMoveDownFromLast: () => boolean;
};

/**
 * The whole section's rows: the switch, then (while the character is on) the picker button and the Accent
 * intensity row with its menu.
 *
 * In: the character settings and their setters, the callback that opens the picker popup, and the two
 * hand-offs the tab gives (Up to the section's line, Down to the next line).
 * Out: one panel row holding the switch, the picker and the accent row.
 *
 * What can go wrong: the accent menu's rows are removed with the ring on one of them (a pick, or B); the
 * menu notices that and hands the ring back to the accent control (focusAccentIntensityTrigger).
 */
export const SettingsTabCharacterSection: React.FC<SettingsTabCharacterSectionProps> = ({
  aiCharacterEnabled,
  setAiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  aiCharacterAccentIntensity,
  setAiCharacterAccentIntensity,
  onOpenCharacterPicker,
  onMoveUpFromFirst,
  onMoveDownFromLast,
}) => {
  const [accentIntensityMenuOpen, setAccentIntensityMenuOpen] = useState(
    () => peekSettingsTabLocalPending()?.accentIntensityMenuOpen ?? false,
  );
  const accentIntensityMenuAnchorRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuFirstItemRef = useRef<HTMLDivElement>(null);
  const accentIntensityMenuToggleOnceRef = useRef(false);
  /** Steam's nav node for the wrapper around the accent control: the approved way to move the ring onto it. */
  const accentTriggerNavRef = useRef<{ TakeFocus?: (gamepad?: boolean) => unknown } | null>(null);

  useLayoutEffect(() => {
    const local = consumeSettingsTabLocalPending();
    if (!local) return;
    setAccentIntensityMenuOpen(local.accentIntensityMenuOpen);
  }, []);

  useEffect(() => {
    registerSettingsTabLocalGetter(() => ({
      accentIntensityMenuOpen,
    }));
    return () => unregisterSettingsTabLocalGetter();
  }, [accentIntensityMenuOpen]);

  const toggleAccentIntensityMenu = useCallback(() => {
    if (accentIntensityMenuToggleOnceRef.current) return;
    accentIntensityMenuToggleOnceRef.current = true;
    setAccentIntensityMenuOpen((o) => !o);
    requestAnimationFrame(() => {
      accentIntensityMenuToggleOnceRef.current = false;
    });
  }, []);
  const closeAccentIntensityMenu = useCallback(() => setAccentIntensityMenuOpen(false), []);
  const focusAccentIntensityTrigger = useCallback((): boolean => {
    // focus-patterns-allow: element-scoped query on the accent row's own ref, the sanctioned pattern (it moved here from SettingsTab.tsx unchanged).
    const btn = accentIntensityMenuAnchorRef.current?.querySelector<HTMLElement>("button.bonsai-accent-intensity-trigger");
    if (!btn) return false;
    // The menu's rows are removed with the ring on one of them (a pick, or B), so nothing would own
    // the ring (plan76-S3C.json). Steam's own transfer to the control first, its own focus if that
    // did not land it.
    try {
      accentTriggerNavRef.current?.TakeFocus?.(true);
    } catch {
      /* the check below decides */
    }
    if (!elementHasGamepadFocus(btn.parentElement ?? btn)) focusInTabBody(btn);
    return true;
  }, []);

  const accentShortLabel =
    AI_CHARACTER_ACCENT_INTENSITY_OPTIONS.find((o) => o.id === aiCharacterAccentIntensity)?.shortLabel ?? "";

  return (
    <PanelSection>
      <PanelSectionRow>
        <div
          className="bonsai-settings-ai-character-block"
          style={{ width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}
        >
          <DenseSwitchRow
            label="AI voice & personality"
            help={SETTINGS_ROW_HELP.character}
            checked={aiCharacterEnabled}
            onChange={(checked) => setAiCharacterEnabled(checked)}
            nav={{
              onMoveUp: onMoveUpFromFirst,
              /* With the character off the switch is the last control; on, the picker and the accent row follow it. */
              ...(aiCharacterEnabled ? {} : { onMoveDown: onMoveDownFromLast }),
            }}
          />
          {aiCharacterEnabled && (
            <>
              <DenseRow kind="button" label="Character">
                <Button
                  className={`bonsai-ai-character-picker-open ${FOCUS_RING_BTN_CLASS}`}
                  ref={(el: HTMLElement | null) => registerModalReturnFocusOwner("character-picker-settings", el)}
                  onClick={() => {
                    rememberModalReturnFocus("character-picker-settings");
                    onOpenCharacterPicker();
                  }}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    minHeight: 32,
                    fontSize: textPx(12),
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                    color: "#e8eef5",
                    textAlign: "left",
                  }}
                >
                  Character:{" "}
                  {formatAiCharacterSelectionLine({
                    random: aiCharacterRandom,
                    presetId: aiCharacterPresetId,
                    customText: aiCharacterCustomText,
                  })}
                </Button>
              </DenseRow>
              <DenseRow kind="choice" label="Accent intensity" help={accentIntensityHelp(aiCharacterAccentIntensity)}>
                <div
                  className={
                    "bonsai-settings-inline-menu-host" + (accentIntensityMenuOpen ? " bonsai-settings-accent-menu-open" : "")
                  }
                  style={{ marginTop: 6, width: "100%", maxWidth: "100%", minWidth: 0, position: "relative" }}
                >
                  <div
                    ref={accentIntensityMenuAnchorRef}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    <span style={{ color: "#d9d9d9", fontWeight: 600, fontSize: textPx(13) }}>Accent intensity</span>
                    <Focusable
                      className={FOCUS_RING_WRAP_CLASS}
                      style={{ display: "flex", flexShrink: 0 }}
                      onOKButton={toggleAccentIntensityMenu}
                      {...({ navRef: accentTriggerNavRef, onMoveDown: onMoveDownFromLast } as Record<string, unknown>)}
                    >
                      <Button
                        className={`bonsai-accent-intensity-trigger ${FOCUS_RING_BTN_CLASS} ${FOCUS_RING_INSET_CLASS}`}
                        {...({
                          onOKButton: (evt: { stopPropagation: () => void }) => {
                            evt.stopPropagation();
                            toggleAccentIntensityMenu();
                          },
                        } as Record<string, unknown>)}
                        onClick={toggleAccentIntensityMenu}
                        aria-expanded={accentIntensityMenuOpen}
                        aria-haspopup="menu"
                        aria-label={`Accent intensity: ${accentShortLabel}`}
                        style={{
                          minHeight: 26,
                          padding: "4px 8px",
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          borderRadius: 3,
                          border: `1px solid ${accentIntensityOutline[aiCharacterAccentIntensity]}`,
                          background: "transparent",
                          color: ASK_LABEL_COLOR_50,
                          flexShrink: 0,
                          fontSize: textPx(10),
                          fontWeight: 600,
                          fontVariant: "small-caps",
                          letterSpacing: 0.1,
                          lineHeight: 1,
                        }}
                      >
                        <span>{accentShortLabel}</span>
                        <span style={{ color: "#7a8fa3", fontSize: textPx(9), lineHeight: 1 }} aria-hidden>
                          ▾
                        </span>
                      </Button>
                    </Focusable>
                    <SettingsTabAccentIntensityMenuPopover
                      open={accentIntensityMenuOpen}
                      firstMenuItemRef={accentIntensityMenuFirstItemRef}
                      selectedId={aiCharacterAccentIntensity}
                      onSelect={(id) => setAiCharacterAccentIntensity(id)}
                      onRequestClose={closeAccentIntensityMenu}
                      onFocusTrigger={focusAccentIntensityTrigger}
                    />
                  </div>
                </div>
              </DenseRow>
            </>
          )}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};
