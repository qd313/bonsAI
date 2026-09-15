/**
 * Title: About tab
 *
 * Purpose: The About tab — what bonsAI is, a beta warning, the
 * reply-language dropdown (its own file, AboutReplyLanguageSection), and
 * links out to GitHub, the Ollama project, the bug tracker, and support.
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
import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "@decky/ui";
import { toaster } from "@decky/api";
import { BONSAI_FOREST_GREEN } from "../features/unified-input/constants";
import supportPaypalQr from "../assets/qrcode.png";
import { AboutReplyLanguageSection } from "./AboutReplyLanguageSection";
import type { ReplyLanguageId } from "../data/replyLanguage";
import type { UiStringKey } from "../i18n/keys";

const PAYPAL_SUPPORT_URL = "https://paypal.me/quentind313";

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
 * This tab explains plugin purpose/safety context and provides contributor support links.
 * It keeps project metadata and external navigation actions out of the main screen component.
 */
function openExternal(url: string, toastTitle: string) {
  try {
    Navigation.NavigateToExternalWeb(url);
  } catch {
    toaster.toast({ title: toastTitle, body: url, duration: 4000 });
  }
}

/**
 * The tab body: the about blurb, the beta warning, the reply-language
 * section, and the Links panel.
 *
 * In: the three outbound URLs (GitHub, Ollama, issues), the current reply
 * language and a callback to change it, and the translation helper for
 * this tab's own strings.
 * Out: the tab's panels, in order.
 *
 * What can go wrong: openExternal() falls back to a toast with the raw URL
 * if Steam's own external-navigation call throws, so a link never just
 * fails silently.
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
    <>
      <PanelSection title="About bonsAI">
        <PanelSectionRow>
          <div style={{ fontSize: 12, color: "#c8c8c8", lineHeight: "1.2" }}>
            Backend Ollama Node for Steam (A.I.) - An AI assistant embedded in the
            Steam Deck Quick Access Menu. Ask questions, search settings, and get game-specific
            performance suggestions (TDP/GPU clock recommendations are read-only — apply them
            yourself in Steam&apos;s Performance tab if you choose).
          </div>
        </PanelSectionRow>
        <PanelSectionRow>
          <div style={{ fontSize: 12, color: BONSAI_FOREST_GREEN, lineHeight: "1.2", fontWeight: 600, marginTop: "1.2em" }}>
            This plugin is in beta. AI-generated recommendations — especially TDP
            and performance changes — should be verified before relying on them.
            Use at your own risk!
          </div>
        </PanelSectionRow>
      </PanelSection>

      <AboutReplyLanguageSection
        replyLanguage={replyLanguage}
        onReplyLanguageChange={onReplyLanguageChange}
        effectiveLang={effectiveLang}
        steamClientLanguageLabel={steamClientLanguageLabel}
      />

      {/*
        Plain ButtonItem rows, no Focusable wrappers and no onMoveUp/onMoveDown handlers.
        The wrappers used to hand-roll the D-pad chain as dropdown -> GitHub -> PayPal, which
        broke link access two ways: the handlers returned true (telling Steam the press was
        handled, so default navigation was skipped) while moving focus with a plain DOM
        `.focus()`, which does not transfer Steam's gamepad focus across nav containers — see
        navFocusRegistry.ts, measured 2026-08-04 — so presses were consumed and focus never
        moved. The chain also skipped the two middle links entirely, since they were never in it.
        DeveloperTab uses bare ButtonItems this way and navigates correctly.
      */}
      <PanelSection title="Links">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => openExternal(githubRepoUrl, "GitHub")}>
            <span style={{ fontSize: 13 }}>GitHub</span>
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => openExternal(ollamaRepoUrl, "Ollama")}>
            <span style={{ fontSize: 13 }}>Built on Ollama!</span>
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => openExternal(githubIssuesUrl, "Report a Bug")}>
            <span style={{ fontSize: 13 }}>Bugs & Feature Requests</span>
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 180,
                margin: "0 auto",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <ButtonItem layout="below" onClick={() => openExternal(PAYPAL_SUPPORT_URL, "PayPal")}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    textAlign: "center",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1.2 }}>Support my Steam Sale habit</span>
                  <img
                    src={supportPaypalQr}
                    alt="Support on PayPal — Support my Steam Sale habit"
                    style={{
                      display: "block",
                      width: 132,
                      maxWidth: "100%",
                      height: "auto",
                      margin: "0 auto",
                    }}
                  />
                </div>
              </ButtonItem>
            </div>
          </div>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};
