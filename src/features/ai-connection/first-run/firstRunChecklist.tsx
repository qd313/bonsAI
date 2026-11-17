/**
 * Title: The first-time setup's checklist: every download, its size and its site, with tick boxes
 *
 * Purpose: The top of the popup's first screen (board 5, tab 4, round 4 B): five rows, one per download, each with
 * a tick box, its name, its size with what it is for, and the site it comes from, and the total at the top right,
 * which follows the ticks (about 6.9 GB with all, about 5.8 GB with the least). The AI engine (Ollama) and the
 * answer model are locked on: without them nothing answers, so they are drawn ticked and are not stops. The
 * note-search model can be unticked; the speech models and the voice engine tick together, since Voice input needs
 * both. A left-out piece is offered again by its own feature (starterSetLeftOut.ts).
 *
 * Used for: FirstRunWhereAiRunsModal.tsx.
 *
 * Solves: The maintainer's notes on the drawings: "a checklist of all the things it's installing and from what
 * site", with the sizes known (Ollama's included), and "functional tickboxes". The voice engine's row also says
 * its build fetches compilers from the image's own package servers, the same words the download box uses
 * (downloadSites.ts), so every place the setup reaches is named before anything starts.
 *
 * Does not: Start anything or save anything; the screen reads the ticks when OK is pressed. Does not know whether a
 * piece is already on the Deck (a Deck that already has Ollama still reads about 6.9 GB; nothing is fetched twice).
 */
import React, { type CSSProperties } from "react";

import { textPx } from "../../../styles/textPx";
import type { SearchStopProps } from "../../search-tab/useSearchNav";
import {
  ANSWER_MODEL_DOWNLOAD_SIZE,
  NOTE_SEARCH_MODEL_DOWNLOAD_SIZE,
  OLLAMA_DOWNLOAD_SIZE,
  SPEECH_MODELS_DOWNLOAD_SIZE,
  totalDownloadSize,
  VOICE_ENGINE_DOWNLOAD_SIZE,
  type DownloadSize,
} from "../../downloads/downloadSizes";
import { STARTER_NOTE_SEARCH_TAG, STARTER_SPEECH_MODELS, TIER1_ESSENTIALS_TAG } from "../../models/deckEssentialsTags";
import type { StarterLeftOut } from "../../models/starterSetLeftOut";
import { FIRST_RUN_BOX } from "./firstRunBoxLayout";
import { PopupButton } from "./FirstRunPopupParts";

/** Which of the two choices are ticked: the note-search model, and the speech models with the voice engine. */
export type ChecklistTicks = Record<StarterLeftOut, boolean>;

/** The rows that are stops, top to bottom (the first screen's walk uses the same names). */
export type ChecklistStopRow = "note_search" | "speech" | "voice";

type ChecklistItem = {
  name: string;
  size: DownloadSize;
  site: string;
  why: string;
  /** The tick it follows; null for the two locked rows. */
  tick: StarterLeftOut | null;
  /** Its stop's row on the walk; null for the two locked rows. */
  row: ChecklistStopRow | null;
};

/** The five downloads, as drawn. Sizes are named constants with their source and date (downloadSizes.ts). */
const CHECKLIST_ITEMS: readonly ChecklistItem[] = [
  { name: "AI engine (Ollama)", size: OLLAMA_DOWNLOAD_SIZE, site: "ollama.com", why: "needed", tick: null, row: null },
  { name: `Answer model ${TIER1_ESSENTIALS_TAG}`, size: ANSWER_MODEL_DOWNLOAD_SIZE, site: "registry.ollama.ai", why: "needed", tick: null, row: null },
  {
    name: `Note-search model ${STARTER_NOTE_SEARCH_TAG}`,
    size: NOTE_SEARCH_MODEL_DOWNLOAD_SIZE,
    site: "registry.ollama.ai",
    why: "for the knowledge base",
    tick: "note_search",
    row: "note_search",
  },
  {
    name: `Speech models ${STARTER_SPEECH_MODELS.join(" and ")}`,
    size: SPEECH_MODELS_DOWNLOAD_SIZE,
    site: "huggingface.co",
    why: "for voice input, ticks with the row below",
    tick: "voice",
    row: "speech",
  },
  {
    name: "Voice engine (whisper.cpp)",
    size: VOICE_ENGINE_DOWNLOAD_SIZE,
    site: "ghcr.io",
    why: "for voice input; its build fetches compilers from its own package servers",
    tick: "voice",
    row: "voice",
  },
];

/** "about 6.9 GB in all": the total of every ticked row and the two locked ones. */
function checklistTotal(ticks: ChecklistTicks): string {
  return `${totalDownloadSize(CHECKLIST_ITEMS.filter((i) => i.tick === null || ticks[i.tick]).map((i) => i.size))} in all`;
}

/** What OK leaves out, in the words the back end and the left-out note take. */
export function leftOutFromTicks(ticks: ChecklistTicks): StarterLeftOut[] {
  return (["note_search", "voice"] as const).filter((p) => !ticks[p]);
}

const BOX_PATH = <rect x="3.5" y="3.5" width="17" height="17" rx="3" />;
/** The tick box, ticked or empty, as drawn. */
function TickBox({ on, locked }: { on: boolean; locked: boolean }): React.ReactElement {
  const color = locked ? "#6f8aa5" : on ? "#7ee2a8" : "#8b929a";
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ justifySelf: "center" }}>
      {BOX_PATH}
      {on ? <path d="M7.5 12.5l3.2 3.2 6-7" /> : null}
    </svg>
  );
}

const ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "30px minmax(0, 1fr) auto",
  columnGap: 10,
  alignItems: "center",
  boxSizing: "border-box",
  width: "100%",
  height: FIRST_RUN_BOX.rowHeightPx,
  minHeight: FIRST_RUN_BOX.rowHeightPx,
  padding: 0,
  margin: 0,
  border: 0,
  borderBottom: "1px solid #1b2026",
  borderRadius: 0,
  background: "transparent",
  color: "inherit",
  textAlign: "left",
};
const NAME_STYLE: CSSProperties = { fontSize: textPx(13), color: "#ffffff", lineHeight: 1.2, fontWeight: 600, minWidth: 0 };
const SMALL_STYLE: CSSProperties = { display: "block", fontSize: textPx(10.5), fontWeight: 400, color: "#9fb7d5", marginTop: 1 };
const TAG_STYLE: CSSProperties = {
  fontSize: textPx(10.5),
  lineHeight: 1,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(156,231,255,.35)",
  background: "rgba(156,231,255,.08)",
  color: "#9ce7ff",
  whiteSpace: "nowrap",
};

/** One row's inside: the tick box, the name with its size and use, the site tag. */
function RowParts({ item, on }: { item: ChecklistItem; on: boolean }): React.ReactElement {
  const faded = on ? null : { opacity: 0.45 };
  return (
    <>
      <TickBox on={on} locked={item.tick === null} />
      <div style={{ ...NAME_STYLE, ...faded }}>
        {item.name}
        <small style={SMALL_STYLE}>
          {item.size.label} · {item.why}
        </small>
      </div>
      <span style={{ ...TAG_STYLE, ...faded }}>{item.site}</span>
    </>
  );
}

/** The checklist: its header with the total, then the five rows; the three that can be unticked are stops. */
export function FirstRunChecklist({
  ticks,
  onToggle,
  stop,
}: {
  ticks: ChecklistTicks;
  onToggle: (tick: StarterLeftOut) => void;
  stop: (row: ChecklistStopRow, col: number) => SearchStopProps;
}): React.ReactElement {
  return (
    <div data-bonsai-first-run-part="checklist" style={{ display: "flex", flexDirection: "column", borderTop: `${FIRST_RUN_BOX.checklistRulePx}px solid #1f2933` }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          height: FIRST_RUN_BOX.headHeightPx,
          margin: `${FIRST_RUN_BOX.headMarginTopPx}px 0 ${FIRST_RUN_BOX.headMarginBottomPx}px`,
          fontSize: textPx(10),
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#8b929a",
        }}
      >
        <span>What OK downloads. Untick what you do not want</span>
        <span data-bonsai-first-run-total="" style={{ color: "#ffffff", letterSpacing: 0, textTransform: "none", fontSize: textPx(11.5) }}>
          {checklistTotal(ticks)}
        </span>
      </div>
      {CHECKLIST_ITEMS.map((item) => {
        const on = item.tick === null || ticks[item.tick];
        if (item.row === null || item.tick === null) {
          return (
            <div key={item.name} style={ROW_STYLE} data-bonsai-first-run-row={item.name}>
              <RowParts item={item} on />
            </div>
          );
        }
        const tick = item.tick;
        return (
          <PopupButton
            key={item.name}
            stop={stop(item.row, 0)}
            look="row"
            rowStyle={ROW_STYLE}
            label={<RowParts item={item} on={on} />}
            ariaLabel={item.name}
            ariaChecked={on}
            onPress={() => onToggle(tick)}
          />
        );
      })}
    </div>
  );
}
