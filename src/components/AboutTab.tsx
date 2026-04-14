import React from "react";
import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "@decky/ui";
import { toaster } from "@decky/api";

type Props = {
  githubRepoUrl: string;
  ollamaRepoUrl: string;
  githubIssuesUrl: string;
};

/**
 * This tab explains plugin purpose/safety context and provides contributor support links.
 * It keeps project metadata and external navigation actions out of the main screen component.
 */
export const AboutTab: React.FC<Props> = ({ githubRepoUrl, ollamaRepoUrl, githubIssuesUrl }) => (
  <PanelSection title="About bonsAI">
    <PanelSectionRow>
      <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
        bonsAI
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <div style={{ fontSize: 12, color: "#c8c8c8", lineHeight: "1.5" }}>
        Backend Ollama Node for Steam (A.I.) — an AI assistant embedded in the
        Steam Deck Quick Access Menu. Ask questions, get game-specific
        performance recommendations, and apply TDP/GPU changes directly from
        the QAM.
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <div style={{ fontSize: 12, color: "#f2cf84", lineHeight: "1.5" }}>
        This plugin is in beta. AI-generated recommendations — especially TDP
        and performance changes — should be verified before relying on them.
        bonsAI modifies system hardware settings based on AI suggestions. Use
        at your own risk.
      </div>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem
        layout="below"
        onClick={() => {
          // Decky navigation may fail in some contexts, so we fall back to a toast copy target.
          try {
            Navigation.NavigateToExternalWeb(githubRepoUrl);
          } catch {
            toaster.toast({ title: "GitHub", body: githubRepoUrl, duration: 4000 });
          }
        }}
      >
        <span style={{ fontSize: 13 }}>GitHub Repository</span>
      </ButtonItem>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem
        layout="below"
        onClick={() => {
          try {
            Navigation.NavigateToExternalWeb(ollamaRepoUrl);
          } catch {
            toaster.toast({ title: "Ollama", body: ollamaRepoUrl, duration: 4000 });
          }
        }}
      >
        <span style={{ fontSize: 13 }}>Built on Ollama</span>
      </ButtonItem>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem
        layout="below"
        onClick={() => {
          // Keep bug-report flow accessible even when external navigation is unavailable.
          try {
            Navigation.NavigateToExternalWeb(githubIssuesUrl);
          } catch {
            toaster.toast({ title: "Report a Bug", body: githubIssuesUrl, duration: 4000 });
          }
        }}
      >
        <span style={{ fontSize: 13 }}>Report a Bug / Request a Feature</span>
      </ButtonItem>
    </PanelSectionRow>
  </PanelSection>
);
