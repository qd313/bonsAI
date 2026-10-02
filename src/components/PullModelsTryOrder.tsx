/**
 * Title: Browse models' try-order switch and place buttons
 *
 * Purpose: The part of the AI models box that shows and changes the order bonsAI tries the installed
 * models in. A "Text / Pictures" switch sits above the table, each installed model's row carries its
 * place number with small up and down buttons, and a few quiet lines say what is going on: that a
 * change is saved at once, how many models in the order the filters hide, or why there are no places
 * (no host, host not reachable, no installed model).
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
 * row to row from the star's own handlers, so a vertical walk never lands on the X. A button at an
 * end of the order stays focusable and does nothing (aria-disabled), so the ring never falls off a
 * button that just went dim. A press goes through onOKButton as well as onClick, as every control on
 * this screen must (the screen is a confirm box with its own OK).
 */
import { useCallback, useRef, type ReactNode } from "react";
import { Button, Focusable } from "@decky/ui";
import type { TableSection } from "./PullModelsModal.types";
import { isTagInstalled } from "../utils/pullModelFilters";
import {
  placeCountHidden,
  useTryOrderPlaces,
  type TryOrderHost,
  type TryOrderKind,
} from "../features/model-routing/useTryOrderPlaces";

type OkRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => void;
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
};

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
}) {
  const { host, installedTags, loading, refreshKey, flatRows, reveal } = a;
  const places = useTryOrderPlaces({ host, deckInstalled: installedTags, deckLoading: loading, refreshKey });
  const enabled = places.status !== "off";
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
    const place = c.installed && places.status === "ready" ? places.placeOf(c.tag) : null;
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
          c.installed ? <span className="bonsai-pullmodels-place-none">—</span> : null
        ) : (
          <>
            <span className="bonsai-pullmodels-place-num">{place}</span>
            {button("up")}
            {button("down")}
          </>
        )}
      </div>
    );
  };

  const bar = (b: {
    okButtonRuns: OkRuns;
    onMoveUp: () => boolean;
    onMoveDown: () => boolean;
  }): ReactNode => {
    if (!enabled) return null;
    const shown: string[] = [];
    for (const row of flatRows) {
      if (row.kind === "other") shown.push(row.tag);
      else if (isTagInstalled(row.entry.tag, installedTags)) shown.push(row.entry.tag);
    }
    const hidden = places.status === "ready" ? placeCountHidden(places.order, shown) : 0;
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
              if (!places.isAutomatic) void places.reset();
            }}
            {...nav({
              onOKButton: b.okButtonRuns(() => {
                if (!places.isAutomatic) void places.reset();
              }),
            })}
          >
            Reset order
          </Button>
        </Focusable>
        {note ? <div className="bonsai-pullmodels-tryorder-note">{note}</div> : null}
        {places.status === "ready" ? (
          <>
            <div className="bonsai-pullmodels-tryorder-note">
              {places.onPc ? "These places are for the PC the AI runs on. " : ""}A place change is saved at once;
              Cancel does not undo it.
            </div>
            {hidden > 0 ? <div className="bonsai-pullmodels-tryorder-note">{hiddenLine(hidden)}</div> : null}
          </>
        ) : null}
      </div>
    );
  };

  return { enabled, focusSwitch, focusPlaceUp, focusPlaceDown, cell, bar };
}
