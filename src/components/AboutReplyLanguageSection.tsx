/**
 * Title: Reply language picker
 *
 * Purpose: The dropdown on the About tab where you choose what language the AI
 * writes its replies in. This is separate from Steam's own display language —
 * you can run Steam in English and still have the AI answer in Spanish, or
 * leave it on "follow system" so it always matches whatever language Steam is
 * set to. Underneath the dropdown, a line of hint text spells out which
 * language is actually in effect right now, so "follow system" is never a
 * guess.
 *
 * Used for: Drawn by the About tab, below the support links.
 *
 * Solves: One place that owns both the dropdown's choices and the "here's
 * what that means right now" hint text, so the two can never end up saying
 * different things.
 *
 * Does not: Change the language of the plugin's own menus and buttons — that
 * follows Steam's own display language and is handled elsewhere (the i18n
 * keys and steamLanguages).
 */
import React, { useMemo } from "react";
import { Dropdown, Focusable, PanelSection, PanelSectionRow } from "@decky/ui";
import {
  buildReplyLanguageDropdownOptions,
  REPLY_LANGUAGE_FOLLOW_SYSTEM,
  replyLanguageLabel,
  type ReplyLanguageId,
} from "../data/steamLanguages";
import { t as translate } from "../utils/i18n";

const deckNav = (handlers: Record<string, () => boolean | void>) =>
  handlers as unknown as Record<string, unknown>;

type Props = {
  replyLanguage: ReplyLanguageId;
  onReplyLanguageChange: (next: ReplyLanguageId) => void;
  effectiveLang: string;
  steamClientLanguageLabel: string;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
  dropdownHostRef?: React.Ref<HTMLDivElement>;
};

/**
 * The dropdown itself, plus the two lines of hint text drawn above it.
 *
 * In: the language currently chosen, a callback to run when the user picks a
 * different one, the language currently in effect (used to translate the
 * hint text itself), and the label Steam reports for its own display
 * language (shown only when "follow system" is the current choice).
 * Out: the About tab section — its title, the hint lines, and the dropdown.
 *
 * What can go wrong: nothing talks to the backend from here. The list of
 * choices is fixed and built once by buildReplyLanguageDropdownOptions(), and
 * picking one only calls onReplyLanguageChange — saving the choice happens
 * wherever that callback leads, not in this file.
 */
export const AboutReplyLanguageSection: React.FC<Props> = ({
  replyLanguage,
  onReplyLanguageChange,
  effectiveLang,
  steamClientLanguageLabel,
  onMoveUp,
  onMoveDown,
  dropdownHostRef,
}) => {
  const options = useMemo(() => buildReplyLanguageDropdownOptions(), []);
  // Decky Dropdown matches selectedOption against each option's `.data`, not the full option object.
  const selectedOption = replyLanguage;

  const sectionTitle = translate("about.replyLanguage.sectionTitle", effectiveLang);
  const dropdownLabel = translate("about.replyLanguage.dropdownLabel", effectiveLang);
  const hint = translate("about.replyLanguage.hint", effectiveLang);
  const systemLine =
    replyLanguage === REPLY_LANGUAGE_FOLLOW_SYSTEM
      ? translate("about.replyLanguage.systemDetected", effectiveLang, {
          name: steamClientLanguageLabel,
        })
      : null;

  return (
    <PanelSection title={sectionTitle}>
      <PanelSectionRow>
        <Focusable
          ref={(el: HTMLDivElement | null) => {
            if (typeof dropdownHostRef === "function") dropdownHostRef(el);
            else if (dropdownHostRef) (dropdownHostRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }}
          style={{ width: "100%" }}
          data-bonsai-about-language-dropdown="1"
          {...deckNav({
            onMoveUp: () => onMoveUp?.() ?? false,
            onMoveDown: () => onMoveDown?.() ?? false,
          })}
        >
          <div style={{ fontSize: 11, color: "#9fb7d5", lineHeight: 1.35, marginBottom: 8 }}>
            {hint}
          </div>
          {systemLine ? (
            <div style={{ fontSize: 11, color: "#9ce7ff", lineHeight: 1.35, marginBottom: 8 }}>
              {systemLine}
            </div>
          ) : null}
          <div style={{ fontSize: 12, fontWeight: 600, color: "#dce8f4", marginBottom: 6 }}>
            {dropdownLabel}:{" "}
            <span style={{ color: "#9ce7ff" }}>{replyLanguageLabel(replyLanguage)}</span>
          </div>
          <Dropdown
            rgOptions={options}
            selectedOption={selectedOption}
            onChange={(opt) => onReplyLanguageChange((opt.data as ReplyLanguageId) ?? REPLY_LANGUAGE_FOLLOW_SYSTEM)}
            strDefaultLabel={dropdownLabel}
          />
        </Focusable>
      </PanelSectionRow>
    </PanelSection>
  );
};
