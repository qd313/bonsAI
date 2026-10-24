/**
 * Title: Reply language picker
 *
 * Purpose: The row on the About tab where you choose what language the AI
 * writes its replies in. This is separate from Steam's own display language —
 * you can run Steam in English and still have the AI answer in Spanish, or
 * leave it on "follow system" so it always matches whatever language Steam is
 * set to. It is one line: Steam's dropdown, the full width of the row, with the
 * chosen language and its chevron and no label of its own (the section title says
 * "Reply language", so a "Language" label beside it was redundant); while the ring is on it, the hint text opens
 * under it and spells out which language is actually in effect right now, so
 * "follow system" is never a guess. The hint closes when the ring leaves
 * (plan 92, lane T3).
 *
 * Used for: Drawn by the About tab, between the beta notice and the links.
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
} from "../../shared/i18n/steamLanguages";
import { t as translate } from "../../shared/i18n/i18n";
import { useRevealWhileRinged } from "./AboutRevealRow";
import { scaledSteamWords } from "../../shared/text-size/scaledSteamWords";

const deckNav = (handlers: Record<string, () => boolean | void>) =>
  handlers as unknown as Record<string, unknown>;

type Props = {
  replyLanguage: ReplyLanguageId;
  onReplyLanguageChange: (next: ReplyLanguageId) => void;
  /** Steam has just opened its list: the moment to take the note of the screen (see the header). */
  onReplyLanguageMenuOpened?: () => void;
  effectiveLang: string;
  steamClientLanguageLabel: string;
  onMoveUp?: () => boolean;
  onMoveDown?: () => boolean;
  dropdownHostRef?: React.Ref<HTMLDivElement>;
};

/**
 * The one-line row, plus the hint text that opens under it while the ring is on it.
 *
 * In: the language currently chosen, a callback to run when the user picks a
 * different one, the language currently in effect (used to translate the
 * hint text itself), and the label Steam reports for its own display
 * language (shown only when "follow system" is the current choice).
 * Out: the About tab section — its title, the full-width dropdown, and (ring on the row) the hint lines.
 *
 * What can go wrong: nothing talks to the backend from here. The list of
 * choices is fixed and built once by buildReplyLanguageDropdownOptions(), and
 * picking one only calls onReplyLanguageChange — saving the choice happens
 * wherever that callback leads, not in this file.
 */
export const AboutReplyLanguageSection: React.FC<Props> = ({
  replyLanguage,
  onReplyLanguageChange,
  onReplyLanguageMenuOpened,
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
  const hint = translate("about.replyLanguage.hint", effectiveLang);
  const systemLine =
    replyLanguage === REPLY_LANGUAGE_FOLLOW_SYSTEM
      ? translate("about.replyLanguage.systemDetected", effectiveLang, {
          name: steamClientLanguageLabel,
        })
      : null;

  const { open, focusProps } = useRevealWhileRinged();

  return (
    <PanelSection title={scaledSteamWords(sectionTitle, 16) as unknown as string}>
      <PanelSectionRow>
        <div className="bonsai-about-item" data-bonsai-about-item="language">
          <Focusable
            ref={(el: HTMLDivElement | null) => {
              if (typeof dropdownHostRef === "function") dropdownHostRef(el);
              else if (dropdownHostRef) (dropdownHostRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="bonsai-about-lang"
            data-bonsai-about-language-dropdown="1"
            {...focusProps}
            {...deckNav({
              onMoveUp: () => onMoveUp?.() ?? false,
              onMoveDown: () => onMoveDown?.() ?? false,
            })}
          >
            <Dropdown
              rgOptions={options}
              selectedOption={selectedOption}
              onMenuOpened={() => onReplyLanguageMenuOpened?.()}
              onChange={(opt) => onReplyLanguageChange((opt.data as ReplyLanguageId) ?? REPLY_LANGUAGE_FOLLOW_SYSTEM)}
              strDefaultLabel={replyLanguageLabel(replyLanguage)}
              renderButtonValue={() => scaledSteamWords(replyLanguageLabel(replyLanguage), 16)}
            />
          </Focusable>
          {open ? (
            <div className="bonsai-about-reveal" data-bonsai-about-reveal="language">
              {hint}
              {systemLine ? <span className="bonsai-about-reveal-note">{systemLine}</span> : null}
            </div>
          ) : null}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
};
