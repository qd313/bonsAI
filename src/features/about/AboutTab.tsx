/**
 * Title: About tab
 *
 * Purpose: The About tab — the version (on the title line, beside "About bonsAI"),
 * what bonsAI is (its paragraph) and the beta notice, both always drawn as plain text at the top (as before
 * plan 92; the maintainer asked for them back on 2026-10-12), the reply-language row (its own file,
 * AboutReplyLanguageSection),
 * and the links out to GitHub, the Ollama project, the bug tracker and
 * support, as small buttons beside a smaller QR code (its own file,
 * AboutLinks). One line per row, so the tab fits on about one screen (plan 92).
 * Nothing here changes how the AI behaves; it is entirely things to read or
 * tap through to leave the plugin.
 *
 * Used for: The About tab in index.tsx.
 *
 * Solves: Keeps project information and outbound links away from the tabs
 * that actually change settings, so About stays safe to browse without
 * risking a setting change.
 *
 * Does not: Change any AI or inference setting — see SettingsTab and
 * OllamaTab for that.
 */
import React from "react";
import { PanelSection, PanelSectionRow } from "@decky/ui";
import { AboutLinks } from "./AboutLinks";
import { AboutReplyLanguageSection } from "./AboutReplyLanguageSection";
import { scaledSteamWords } from "../../shared/text-size/scaledSteamWords";
import type { ReplyLanguageId } from "../../shared/i18n/replyLanguage";
import type { UiStringKey } from "../../shared/i18n/keys";
import { PLUGIN_VERSION } from "../../pluginVersion";
import { takeNavFocus } from "../../shared/dpad/navFocusRegistry";

type Props = {
  githubRepoUrl: string;
  ollamaRepoUrl: string;
  githubIssuesUrl: string;
  replyLanguage: ReplyLanguageId;
  onReplyLanguageChange: (next: ReplyLanguageId) => void;
  effectiveLang: string;
  steamClientLanguageLabel: string;
  t: (key: UiStringKey) => string;
};

/**
 * The first section's title: "About bonsAI" with the version after it on the same line.
 *
 * Decky types a section's title as text only, but Steam draws it as the first child of its title element, so a
 * node there keeps Steam's own title look (size, weight, capitals, colour) with nothing measured or guessed on
 * our side (the words themselves are a span sized by the Text size step, scaledSteamWords.tsx); only the version span undoes the capitals and takes the quieter description colour
 * (aboutTabStyles.ts, `.bonsai-about-title-version`). If a Steam build ever refuses a node, the Deck check shows the
 * title missing and the fallback is to draw this line ourselves.
 */
const ABOUT_TITLE_LINE = (
  <>
    {scaledSteamWords("About bonsAI", 16)}
    <span className="bonsai-about-title-version" data-bonsai-about-version="">
      Version {PLUGIN_VERSION}
    </span>
  </>
);

/**
 * The tab body: the title line with the version, "What bonsAI is", the beta notice, the
 * reply-language section, and the Links section.
 *
 * In: the three outbound URLs (GitHub, Ollama, issues), the current reply
 * language and a callback to change it, and the translation helper for
 * this tab's own strings.
 * Out: the tab's panels, in order. The stops, top to bottom: Reply language,
 * the three link buttons, the QR code. The version, the paragraph and
 * the beta notice are plain text.
 *
 * What can go wrong: nothing here; AboutLinks falls back to a toast with the
 * raw URL if Steam's own external-navigation call throws.
 */
export const AboutTab: React.FC<Props> = ({
  githubRepoUrl,
  ollamaRepoUrl,
  githubIssuesUrl,
  replyLanguage,
  onReplyLanguageChange,
  effectiveLang,
  steamClientLanguageLabel,
  t: _t,
}) => {
  return (
    <div className="bonsai-about-tab">
      <PanelSection title={ABOUT_TITLE_LINE as unknown as string}>
        <PanelSectionRow>
          <div className="bonsai-about-block">
            <div className="bonsai-about-blurb" data-bonsai-about-blurb="">
              Backend Ollama Node for Steam (A.I.) - An AI assistant embedded in the
              Steam Deck Quick Access Menu. Ask questions, search settings, and get game-specific
              performance suggestions (TDP/GPU clock recommendations are read-only — apply them
              yourself in Steam&apos;s Performance tab if you choose).
            </div>
            <div className="bonsai-about-beta" data-bonsai-about-beta="">
              This plugin is in beta. AI-generated recommendations should be verified
              before relying on them. Use at your own risk!
            </div>
          </div>
        </PanelSectionRow>
      </PanelSection>

      <AboutReplyLanguageSection
        replyLanguage={replyLanguage}
        onReplyLanguageChange={onReplyLanguageChange}
        effectiveLang={effectiveLang}
        steamClientLanguageLabel={steamClientLanguageLabel}
        onMoveDown={() => takeNavFocus("about-links")}
      />

      <PanelSection title={scaledSteamWords("Links", 16) as unknown as string}>
        <PanelSectionRow>
          <AboutLinks githubRepoUrl={githubRepoUrl} ollamaRepoUrl={ollamaRepoUrl} githubIssuesUrl={githubIssuesUrl} />
        </PanelSectionRow>
      </PanelSection>
    </div>
  );
};
