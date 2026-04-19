import React from "react";
import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "@decky/ui";
import { toaster } from "@decky/api";
import { BONSAI_FOREST_GREEN } from "../features/unified-input/constants";

type Props = {
  githubRepoUrl: string;
  ollamaRepoUrl: string;
  githubIssuesUrl: string;
  /** When false, external link buttons show a toast and optional navigation to Permissions. */
  allowExternalNavigation: boolean;
  onNavigateToPermissions: () => void;
};

/**
 * This tab explains plugin purpose/safety context and provides contributor support links.
 * It keeps project metadata and external navigation actions out of the main screen component.
 */
function openExternalOrExplain(
  url: string,
  allow: boolean,
  onNavigateToPermissions: () => void,
  toastTitle: string
) {
  if (!allow) {
    toaster.toast({
      title: "Permission required",
      body: "Enable External and Steam navigation in the Permissions tab.",
      duration: 4500,
    });
    onNavigateToPermissions();
    return;
  }
  try {
    Navigation.NavigateToExternalWeb(url);
  } catch {
    toaster.toast({ title: toastTitle, body: url, duration: 4000 });
  }
}

export const AboutTab: React.FC<Props> = ({
  githubRepoUrl,
  ollamaRepoUrl,
  githubIssuesUrl,
  allowExternalNavigation,
  onNavigateToPermissions,
}) => (
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
      <div style={{ fontSize: 12, color: BONSAI_FOREST_GREEN, lineHeight: "1.5", fontWeight: 600 }}>
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
          openExternalOrExplain(githubRepoUrl, allowExternalNavigation, onNavigateToPermissions, "GitHub");
        }}
      >
        <span style={{ fontSize: 13 }}>GitHub Repository</span>
      </ButtonItem>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem
        layout="below"
        onClick={() => {
          openExternalOrExplain(ollamaRepoUrl, allowExternalNavigation, onNavigateToPermissions, "Ollama");
        }}
      >
        <span style={{ fontSize: 13 }}>Built on Ollama</span>
      </ButtonItem>
    </PanelSectionRow>
    <PanelSectionRow>
      <ButtonItem
        layout="below"
        onClick={() => {
          openExternalOrExplain(githubIssuesUrl, allowExternalNavigation, onNavigateToPermissions, "Report a Bug");
        }}
      >
        <span style={{ fontSize: 13 }}>Report a Bug / Request a Feature</span>
      </ButtonItem>
    </PanelSectionRow>
  </PanelSection>
);
