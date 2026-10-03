/**
 * Title: Browse models' try-order switch and place buttons
 *
 * Purpose: The part of the AI models box that shows and changes the order bonsAI tries the installed
 * models in. A "Text / Pictures" switch sits above the table, each installed model's row carries its
 * place number with small up and down buttons, and quiet words say what is going on: that a change is
 * saved at once (beside the switch, to cost no height), how many models in the order the filters hide,
 * or why there are no places (no host, host not reachable, no installed model). A place whose model
 * Ask skips because big models are switched off says "Skipped: too big". "Reset order" asks first.
 *
 * With the AI on a PC the places belong to the PC's models, so they are drawn in their own "On the PC"
 * group after the Deck's rows (pcGroup()): one row per answering model the PC has, minus what the
 * person's licence and Ask-mode filters hide. Pull and Remove only ever act on this Deck, so the Deck's
 * rows keep their star and X and claim no place, and a PC row has neither (its Pull column reads "PC").
 *
 * Used for: PullModelsModal.tsx, through usePullModelTryNav(); drawn only when the box was opened with
 * a host (see useTryOrderPlaces.ts), so Browse models opened on its own looks as it always did.
 *
 * Solves: The Ollama tab's two "Set text / vision model try order" screens and their own buttons are
 * gone; this puts the same job inside the box a person already uses to pick models, with the place
 * next to the model it belongs to.
 *
 * Does not: Decide the order or save it; useTryOrderPlaces() does both. It does not own the table's
 * walking rules either: Up and Down on a place button go where they go from the row's star (the
 * caller hands those handlers in), and a place button never has a handler that removes a model.
 *
 * Focus: the switch row is one horizontal Focusable under the Filters row; its buttons hand Up to the
 * Filters button and Down to the first row (the caller's two functions). In a row the chain is star,
 * the up button, the down button, then the X, by Right and Left; Down and Up skip all of them and go
 * row to row from the star's own handlers, so a vertical walk never lands on the X. A PC row has no
 * star: its up button is the row's stop (it fills the same ref), and the chain ends at its down button. A button at an
 * end of the order stays focusable and does nothing (aria-disabled), so the ring never falls off a
 * button that just went dim. A press goes through onOKButton as well as onClick, as every control on
 * this screen must (the screen is a confirm box with its own OK).
 */
import { useCallback, useRef, type ReactNode, type RefCallback } from "react";
import { Button, ConfirmModal, Focusable, showModal } from "@decky/ui";
import type { TableSection } from "./PullModelsModal.types";
import { PullModelsPcRow } from "./PullModelsPcRow";
import type { PullModelEntry, PullModelModeFilterId } from "../data/pullModelCatalog";
import type { ModelPolicyTierId } from "../data/modelPolicy";
import { entryMatchesLicenceTier, entryMatchesModeFilters, isTagInstalled } from "../utils/pullModelFilters";
import { isHighVramTag } from "../utils/modelRoutingOrder";
import {
  placeCountHidden,
  useTryOrderPlaces,
  type TryOrderHost,
  type TryOrderKind,
} from "../features/model-routing/useTryOrderPlaces";

type OkRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => void;
/** The screen's nested-box handoff, so a box raised from here returns the ring the way its other boxes do. */
export type NestedModalHooks = { before?: () => void; complete: (close: () => void) => void };
type Reveal = (el: HTMLElement | null | undefined) => boolean;

const KINDS: Array<{ kind: TryOrderKind; label: string }> = [
  { kind: "text", label: "Text" },
  { kind: "vision", label: "Pictures" },
];

export type TryCellArgs = {
  tag: string;
  rowIndex: number;
  installed: boolean;
  /** The row's star handlers: Up and Down go to the neighbouring rows' stars. */
  nav: Record<string, unknown>;
  goSelect: () => boolean;
  goDelete: () => boolean;
  okButtonRuns: OkRuns;
  /** A row of the "On the PC" group: it has no star or X, and its up button is the row's first stop. */
  pc?: boolean;
  bindSelect?: RefCallback<HTMLElement>;
};

/** Shown on a place whose model the order keeps but Ask skips because "Allow high-VRAM models" is off. */
const SKIPPED_MARK = "Skipped: too big";
const SKIPPED_HINT = "Allow high-VRAM models in routing is off (Advanced), so this model is skipped when you ask.";

/** Plain text for a count of models, "1 model ... is", "2 models ... are". */
function hiddenLine(hidden: number): string {
  const one = hidden === 1;
  return `${hidden} ${one ? "model" : "models"} in the order ${one ? "is" : "are"} hidden by the filters. ${
    one ? "It keeps" : "They keep"
  } ${one ? "its" : "their"} place; the numbers skip ${one ? "it" : "them"}.`;
}

/**
 * In: the host choice (undefined turns it all off), the box's installed set and whether it is still
 * listing, the starred model (so a star re-reads the places), the table's rows (to know which models
 * are shown), and the screen's reveal function (focus + scroll into view). It runs useTryOrderPlaces().
 * Out: `enabled`; focus helpers the screen's walking rules use (`focusSwitch`, `focusPlaceUp`,
 * `focusPlaceDown`); `cell()` for a row's Try column; and `bar()` for the switch row and quiet lines.
 */
export function usePullModelTryNav(a: {
  host: TryOrderHost | undefined;
  installedTags: Set<string>;
  loading: boolean;
  refreshKey: string | null;
  flatRows: TableSection["rows"];
  reveal: Reveal;
  /** The table's catalog, licence pick, Ask-mode filters and live sizes: what the "On the PC" group is filtered and drawn with. */
  catalog: PullModelEntry[];
  tier: ModelPolicyTierId;
  modeFilters: ReadonlySet<PullModelModeFilterId>;
  liveSizeGbByTag: Record<string, number>;
}) {
  const { host, installedTags, loading, refreshKey, flatRows, reveal, catalog, tier, modeFilters, liveSizeGbByTag } = a;
  const places = useTryOrderPlaces({ host, deckInstalled: installedTags, deckLoading: loading, refreshKey });
  const enabled = places.status !== "off";
  const onPcReady = places.onPc && places.status === "ready";
  const entryOf = (tag: string) => catalog.find((e) => e.tag === tag || `${e.tag}:latest` === tag);
  // With the AI on a PC the PC's own size for a model comes first: it is the model that will run.
  const sizeOf = (tag: string): number | undefined =>
    (places.onPc ? places.pcSizeGbByTag[tag] : undefined) ?? liveSizeGbByTag[tag] ?? entryOf(tag)?.sizeGb;
  /** With the AI on a PC: every answering model the PC has, minus what the person's own licence and Ask-mode filters hide. */
  const pcTags = onPcReady
    ? places.order
        .filter((t) => {
          const e = entryOf(t);
          return !e || (entryMatchesLicenceTier(e, tier) && entryMatchesModeFilters(e, modeFilters));
        })
        .sort((x, y) => x.localeCompare(y))
    : [];
  const skipsBig = (tag: string) => host?.modelAllowHighVramFallbacks === false && isHighVramTag(tag, sizeOf(tag));
  const switchRefs = useRef<Partial<Record<TryOrderKind, HTMLElement | null>>>({});
  const upRefs = useRef<(HTMLElement | null)[]>([]);
  const downRefs = useRef<(HTMLElement | null)[]>([]);

  const focusSwitch = useCallback(
    (): boolean => enabled && reveal(switchRefs.current[places.kind]),
    [enabled, places.kind, reveal],
  );
  const focusPlaceUp = useCallback((rowIndex: number): boolean => reveal(upRefs.current[rowIndex]), [reveal]);
  const focusPlaceDown = useCallback((rowIndex: number): boolean => reveal(downRefs.current[rowIndex]), [reveal]);

  const cell = (c: TryCellArgs): ReactNode => {
    if (!enabled) return null;
    // With the AI on a PC the places belong to the PC's models, drawn in the "On the PC" group below the table.
    const forThisRow = c.pc || !places.onPc;
    const place = forThisRow && c.installed && places.status === "ready" ? places.placeOf(c.tag) : null;
    const last = places.order.length;
    const press = (delta: -1 | 1) => void places.move(c.tag, delta);
    const button = (dir: "up" | "down") => {
      const delta = dir === "up" ? -1 : 1;
      const atEnd = dir === "up" ? place === 1 : place === last;
      const refs = dir === "up" ? upRefs : downRefs;
      return (
        <Button
          ref={(el: HTMLElement | null) => {
            refs.current[c.rowIndex] = el;
            if (dir === "up") c.bindSelect?.(el);
          }}
          focusable
          className="bonsai-pullmodels-chip bonsai-pullmodels-place-btn"
          aria-label={`Move ${c.tag} ${dir}`}
          aria-disabled={atEnd}
          onClick={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            if (!atEnd) press(delta);
          }}
          {...({
            ...c.nav,
            onMoveLeft: dir === "up" ? c.goSelect : () => focusPlaceUp(c.rowIndex),
            onMoveRight: dir === "up" ? () => focusPlaceDown(c.rowIndex) : c.goDelete,
            onOKButton: c.okButtonRuns(() => {
              if (!atEnd) press(delta);
            }),
          } as unknown as Record<string, unknown>)}
        >
          {dir === "up" ? "▲" : "▼"}
        </Button>
      );
    };
    return (
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--try" role="cell">
        {place == null ? (
          c.installed && forThisRow ? <span className="bonsai-pullmodels-place-none">—</span> : null
        ) : (
          <>
            <span className="bonsai-pullmodels-place-num">{place}</span>
            {button("up")}
            {button("down")}
            {skipsBig(c.tag) ? (
              <span className="bonsai-pullmodels-place-skipped" title={SKIPPED_HINT}>
                {SKIPPED_MARK}
              </span>
            ) : null}
          </>
        )}
      </div>
    );
  };

  /**
   * The "On the PC" group (AI on a PC only): one row per answering model the PC has, in a fixed
   * order by name so a row never moves when its place changes, each with its place and up/down. The
   * rows come after the Deck's, and `startIndex` continues the table's row numbering.
   */
  const pcGroup = (g: {
    startIndex: number;
    bindSelect: (rowIndex: number) => RefCallback<HTMLElement>;
    nav: (rowIndex: number) => Record<string, unknown>;
    okButtonRuns: OkRuns;
  }): ReactNode =>
    pcTags.length === 0 ? null : (
      <div key="on-the-pc">
        <div className="bonsai-pullmodels-group-title">On the PC</div>
        {pcTags.map((tag, i) => {
          const rowIndex = g.startIndex + i;
          const tryCell = cell({
            tag,
            rowIndex,
            installed: true,
            pc: true,
            nav: g.nav(rowIndex),
            goSelect: () => false,
            goDelete: () => false,
            okButtonRuns: g.okButtonRuns,
            bindSelect: g.bindSelect(rowIndex),
          });
          return <PullModelsPcRow key={`pc-${tag}`} tag={tag} entry={entryOf(tag)} sizeGb={sizeOf(tag)} tryCell={tryCell} />;
        })}
      </div>
    );

  /** The box that asks before the order goes back to automatic. The ring lands on the choice that changes nothing. */
  const askReset = (nested: NestedModalHooks) => {
    const word = places.kind === "vision" ? "pictures" : "text";
    nested.before?.();
    const handle = showModal(
      <ConfirmModal
        strTitle={`Put the ${word} try order back to automatic?`}
        strDescription={
          <div className="bonsai-prose" style={{ fontSize: 12, color: "#9fb7d5", lineHeight: 1.45 }}>
            Automatic means bonsAI works the order out from the models installed, and keeps following its defaults when
            you add or remove a model. The order you set by hand is forgotten.
          </div>
        }
        strOKButtonText="Not now"
        strMiddleButtonText="Reset order"
        strCancelButtonText="Cancel"
        onOK={() => nested.complete(() => handle.Close())}
        onMiddleButton={() => {
          nested.complete(() => handle.Close());
          void places.reset();
        }}
        onCancel={() => nested.complete(() => handle.Close())}
      />,
    );
  };

  const bar = (b: {
    okButtonRuns: OkRuns;
    onMoveUp: () => boolean;
    onMoveDown: () => boolean;
    nested: NestedModalHooks;
  }): ReactNode => {
    if (!enabled) return null;
    const shown: string[] = [];
    for (const row of flatRows) {
      if (row.kind === "other") shown.push(row.tag);
      else if (isTagInstalled(row.entry.tag, installedTags)) shown.push(row.entry.tag);
    }
    const hidden =
      places.status !== "ready" ? 0 : places.onPc ? places.order.length - pcTags.length : placeCountHidden(places.order, shown);
    const nav = (extra: Record<string, unknown>) =>
      ({ onMoveUp: b.onMoveUp, onMoveDown: b.onMoveDown, ...extra }) as unknown as Record<string, unknown>;
    let note: string | null = null;
    if (places.status === "loading") note = "Checking which models can answer…";
    else if (places.status === "refused") note = places.refusal;
    return (
      <div className="bonsai-pullmodels-tryorder">
        <Focusable flow-children="horizontal" className="bonsai-pullmodels-tryorder-row">
          <span className="bonsai-pullmodels-tryorder-label">Try order for</span>
          {KINDS.map(({ kind, label }) => (
            <Button
              key={kind}
              ref={(el: HTMLElement | null) => {
                switchRefs.current[kind] = el;
              }}
              className={`bonsai-pullmodels-chip${places.kind === kind ? " bonsai-pullmodels-chip--active" : ""}`}
              aria-pressed={places.kind === kind}
              aria-label={`Try order for ${label.toLowerCase()} questions`}
              onClick={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                places.setKind(kind);
              }}
              {...nav({ onOKButton: b.okButtonRuns(() => places.setKind(kind)) })}
            >
              {label}
            </Button>
          ))}
          <Button
            className="bonsai-pullmodels-chip"
            aria-label="Reset the try order to automatic"
            aria-disabled={places.isAutomatic}
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              if (!places.isAutomatic) askReset(b.nested);
            }}
            {...nav({
              onOKButton: b.okButtonRuns(() => {
                if (!places.isAutomatic) askReset(b.nested);
              }),
            })}
          >
            Reset order
          </Button>
          {/* Beside the buttons, not under them: the box's body is only 264 px tall on the Deck's own
              screen, and a line of its own would cost a model row. Not a focus stop. */}
          {places.status === "ready" ? (
            <span className="bonsai-pullmodels-tryorder-saved">
              {places.onPc ? "These places are for the PC the AI runs on; Pull and Remove act on this Deck. " : ""}A place change is saved at once;
              Cancel does not undo it.
            </span>
          ) : null}
        </Focusable>
        {note ? <div className="bonsai-pullmodels-tryorder-note">{note}</div> : null}
        {hidden > 0 ? <div className="bonsai-pullmodels-tryorder-note">{hiddenLine(hidden)}</div> : null}
      </div>
    );
  };

  return { enabled, pcCount: pcTags.length, focusSwitch, focusPlaceUp, focusPlaceDown, cell, pcGroup, bar };
}
