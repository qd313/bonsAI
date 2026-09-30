/**
 * Title: Saved PC hosts rows
 *
 * Purpose: On the Ollama tab, when the AI runs on a PC rather than on this Deck, these are the
 * two rows that let a person keep a short list of PC addresses they use. The first row shows the
 * saved addresses as buttons; pressing one fills in the PC address and remembers it. The second is
 * a single button that saves whatever address is typed in right now, under a short name, and
 * keeps only the newest few (the limit is `MAX_NAMED_OLLAMA_HOSTS`).
 *
 * Used for: OllamaWhereAiRunsSection.tsx, in the part shown only while the AI runs on a PC.
 *
 * Solves: Keeps the panel's own file from growing past its size limit by holding this
 * self-contained pair of rows, moved out unchanged.
 *
 * Does not: Own the saved list itself or the typed address; both belong to the panel and come in
 * as props, and every change goes back out through the callbacks it hands in. It also does not
 * decide when to show itself: the panel draws it only while the AI runs on a PC.
 */
import React from "react";
import { PanelSectionRow, Button, Focusable } from "@decky/ui";
import { toaster } from "@decky/api";
import { MAX_NAMED_OLLAMA_HOSTS } from "../data/bonsaiSettingsSchema";
import type { NamedOllamaHost } from "../data/bonsaiSettingsSchema";
import { isHttpsOllamaAddress } from "../utils/ollamaAddress";

type OllamaSavedHostsRowsProps = {
  namedOllamaHosts: NamedOllamaHost[];
  setNamedOllamaHosts: React.Dispatch<React.SetStateAction<NamedOllamaHost[]>>;
  ollamaIp: string;
  onOllamaIpChange: (ip: string) => void;
  onPersistOllamaIp: (ip: string) => void;
};

export const OllamaSavedHostsRows: React.FC<OllamaSavedHostsRowsProps> = ({
  namedOllamaHosts,
  setNamedOllamaHosts,
  ollamaIp,
  onOllamaIpChange,
  onPersistOllamaIp,
}) => (
  <>
    {namedOllamaHosts.length > 0 ? (
      <PanelSectionRow>
        <div style={{ fontSize: 11, color: "#9fb7d5", marginBottom: 6 }}>Saved Ollama hosts (LAN)</div>
        <Focusable flow-children="horizontal" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {namedOllamaHosts.map((entry) => (
            <Button
              key={`${entry.label}-${entry.host}`}
              onClick={() => {
                onOllamaIpChange(entry.host);
                onPersistOllamaIp(entry.host);
              }}
              style={{ minHeight: 32, fontSize: 11 }}
            >
              {entry.label}
            </Button>
          ))}
        </Focusable>
      </PanelSectionRow>
    ) : null}
    <PanelSectionRow>
      <Button
        disabled={
          !ollamaIp.trim() ||
          isHttpsOllamaAddress(ollamaIp) ||
          namedOllamaHosts.length >= MAX_NAMED_OLLAMA_HOSTS
        }
        onClick={() => {
          const host = ollamaIp.trim();
          if (!host) return;
          const label = host.length > 24 ? `${host.slice(0, 21)}…` : host;
          setNamedOllamaHosts((prev) => {
            const next = prev.filter((h) => h.host !== host);
            next.push({ label, host });
            return next.slice(-MAX_NAMED_OLLAMA_HOSTS);
          });
          toaster.toast({ title: "Host saved", body: label, duration: 2500 });
        }}
        style={{ width: "100%", minHeight: 34 }}
      >
        Save current PC address as quick host
      </Button>
    </PanelSectionRow>
  </>
);
