"""Re-extract OllamaWhereAiRunsSection from SettingsTab (fixed)."""
from pathlib import Path
import re

src_path = Path(__file__).resolve().parents[1] / "src/components/SettingsTab.tsx"
# Read from git or backup - SettingsTab was trimmed. Use OllamaWhereAiRunsSection backup from git
# Actually read original from git show
import subprocess
result = subprocess.run(
    ["git", "show", "HEAD:src/components/SettingsTab.tsx"],
    capture_output=True,
    cwd=Path(__file__).resolve().parents[1],
)
if result.returncode != 0:
    raise SystemExit("git show failed - use trimmed backup")
lines = result.stdout.decode("utf-8").splitlines()

HEADER = """import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PanelSection,
  PanelSectionRow,
  TextField,
  ToggleField,
  Button,
  Focusable,
  showModal,
  ConfirmModal,
} from "@decky/ui";
import { toaster } from "@decky/api";
import {
  OLLAMA_LOCAL_ON_DECK_DEFAULT_PCIP,
  type NamedOllamaHost,
  MAX_NAMED_OLLAMA_HOSTS,
} from "../utils/settingsAndResponse";
import type { DeveloperConnectionStatus } from "./DeveloperTab";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS, formatDeckyRpcError } from "../utils/deckyCall";
import {
  consumeOllamaTabLocalPending,
  peekOllamaTabLocalPending,
  registerOllamaTabLocalGetter,
  unregisterOllamaTabLocalGetter,
} from "../utils/ollamaTabLocalSurvival";

"""

constants = "\n".join(lines[36:91])

PROPS = """
export type OllamaWhereAiRunsSectionProps = {
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
  ollamaLocalOnDeck: boolean;
  setOllamaLocalOnDeck: (v: boolean) => void;
  onLastConnectionStatus?: (status: DeveloperConnectionStatus | null) => void;
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  onBeforeDeckyModal: () => void;
  onCompleteDeckyModalClose: (close: () => void) => void;
  onOpenOllamaModelsHub: (opts?: { initialSection?: "policy" | "browse" | "advanced" }) => void;
};

type ConnectionStatus = DeveloperConnectionStatus;

"""

# Component body: lines 169-561 (0-indexed 168-560) - before return
body = "\n".join(lines[168:561])
body = body.replace("peekSettingsTabLocalPending", "peekOllamaTabLocalPending")
body = body.replace("consumeSettingsTabLocalPending", "consumeOllamaTabLocalPending")
body = body.replace("registerSettingsTabLocalGetter", "registerOllamaTabLocalGetter")
body = body.replace("unregisterSettingsTabLocalGetter", "unregisterOllamaTabLocalGetter")

# Remove accent intensity state/refs
body = re.sub(
    r"  const \[accentIntensityMenuOpen[\s\S]*?const screenshotDimensionNavRef.*?\n",
    "",
    body,
)
body = body.replace("    setAccentIntensityMenuOpen(local.accentIntensityMenuOpen);\n", "")
body = body.replace("      accentIntensityMenuOpen,\n", "")
body = body.replace("    accentIntensityMenuOpen,\n", "")

body = re.sub(
    r"\n  const toggleAccentIntensityMenu[\s\S]*?focusAccentIntensityTrigger = useCallback[\s\S]*?\}, \[\]\);\n",
    "\n",
    body,
)

# Replace component signature
start = body.find("export const SettingsTab")
end = body.find("}) => {") + len("}) => {")
new_sig = """export const OllamaWhereAiRunsSection: React.FC<OllamaWhereAiRunsSectionProps> = ({
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
  ollamaLocalOnDeck,
  setOllamaLocalOnDeck,
  onLastConnectionStatus,
  namedOllamaHosts,
  setNamedOllamaHosts,
  onBeforeDeckyModal,
  onCompleteDeckyModalClose,
  onOpenOllamaModelsHub,
}) => {"""
body = new_sig + body[end:]

# Remove unused props from destructuring remnants
for prop in [
    "screenshotAttachmentPreset",
    "onOpenCharacterPicker",
    "onResetSession",
    "onClearAllPluginData",
    "showDeveloperTab",
]:
    body = re.sub(rf"  {prop},?\n", "", body)
    body = re.sub(rf"  set{prop[0].upper()}{prop[1:]},?\n", "", body)

jsx = "\n".join(lines[564:1065])  # PanelSection Where AI runs through closing PanelSection
jsx = jsx.replace("onOpenPullModels()", 'onOpenOllamaModelsHub({ initialSection: "browse" })')

out = HEADER + constants + "\n" + PROPS + body + "  return (\n" + jsx + "\n  );\n};\n"
out_path = Path(__file__).resolve().parents[1] / "src/components/OllamaWhereAiRunsSection.tsx"
out_path.write_text(out, encoding="utf-8")
print(f"Fixed {out_path}")
