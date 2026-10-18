/**
 * Title: The AI models box's filters column
 *
 * Purpose: The filters, always on screen in a column to the left of the model list (plan 91 § 2a, the
 * mock-up board's tab 2, round 2, option A). From the top: "7 models match" and Clear, then the three
 * groups in the order people use them (LICENSE, GOOD FOR with a count beside each choice, SHOW), then
 * the three chips that used to live on the old Filters row: "Type a name", "Install the starter set"
 * while the starter model is missing, and the Suggested models. A on a row ticks it and the list
 * changes at once.
 *
 *     [ 7 models match            Clear ]   <- the first stop
 *     LICENSE   (•) Open source only            Up from Clear -> Advanced
 *               ( ) Also try open-weight models
 *               ( ) Any installed model         (greyed until unlocked, and skipped, Left included)
 *     GOOD FOR  [ ] Speed               5       Right from any stop -> the nearest stop on the right
 *               [ ] Strategy … Vision   3
 *     SHOW      [ ] Installed only, Deck essentials only, Recently added
 *     [ Type a name ] [ Install the starter set ] Suggested: [ chip ] [ chip ]
 *        Down past the last stop -> Steam carries the ring to Done
 *
 * Used for: PullModelsModal.tsx, beside the list.
 *
 * Solves: The filters hid behind a "Filters · N on" button that was easy to miss, and Done pressed while
 * the panel was open closed the whole box and lost the pick. With the column there is no filters step
 * to fall out of.
 *
 * Does not: Hold the picks (the box does, through the session memory in pullModelsBoxMemory.ts), count
 * the models (usePullModelTableData.ts does), or move the ring into the list itself: Right calls the
 * box's `toList` with the stop's element, and the box picks the nearest stop beside it (pullModelsBeside.ts)
 * and hands the ring over by Steam's own transfer; with nothing level the press is held.
 *
 * Focus: one Focusable (`navRef`, so the list can hand the ring back by Steam's transfer); every stop is
 * a plain button inside it, so Up and Down between stops are plain sibling focus moves (`step()`), the
 * greyed licence row and an absent starter chip skipped (the open "Type a name" row is its own small
 * Focusable, reached by the same plain hop it always was from the old Filters row; see docs/focus-graph.md).
 * The box asks the column for its stops (`apiRef.stops`) when Left is
 * pressed on a row, and lands on the one nearest that row (pullModelsBeside.ts); the greyed row is
 * never among them. Left inside the column is held (nothing sits to the left). B is not claimed: it does what it does for the box. Every press also goes through
 * `onOKButton` (the box is a confirm box with its own OK; Steam delivers A that way, never a click).
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import { Button, Focusable } from "@decky/ui";
import type { PullModelEntry, PullModelModeFilterId } from "../pullModelCatalog";
import type { ModelPolicyTierId } from "../modelPolicy";
import {
  FILTER_PANEL_ROWS,
  filterPanelRowAriaLabel,
  filterPanelRowGroupHeading,
  filterPanelRowKey,
  filterPanelRowLabel,
  type FilterPanelRow,
} from "./pullModelFilters";
import type { NavRefHolder } from "../../../shared/dpad/navFocusRegistry";
import { DEFAULT_SESSION_FILTERS, focusAndReveal, type PullModelsSessionFilters } from "./pullModelsBoxMemory";
import type { FiltersColumnApi } from "./pullModelsBeside";
import { PullModelsCustomTagEntry } from "./PullModelsCustomTagEntry";
import { PullModelsStarterSetChip } from "./PullModelsStarterSetChip";

type OkRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => void;

export type { FiltersColumnApi };

export type PullModelsFiltersColumnProps = {
  /** The column's nav node, filled by Steam: the target of the list's Left transfer. */
  navRef: NavRefHolder;
  apiRef: MutableRefObject<FiltersColumnApi | null>;
  filters: PullModelsSessionFilters;
  changeFilters: (change: Partial<PullModelsSessionFilters> | ((p: PullModelsSessionFilters) => Partial<PullModelsSessionFilters>)) => void;
  tier: ModelPolicyTierId;
  nonFossUnlocked: boolean;
  onSelectTier?: (tier: ModelPolicyTierId) => void;
  /** The rows the list draws. */
  matchCount: number;
  modeCounts: Record<PullModelModeFilterId, number>;
  installedTags: Set<string>;
  suggested: readonly PullModelEntry[];
  selectedTags: Set<string>;
  onToggleSuggested: (entry: PullModelEntry, ev?: { stopPropagation: () => void; preventDefault: () => void }) => void;
  pullBusy: boolean;
  onPullAccepted: () => void;
  focusAfterRedraw: (fn: () => void) => void;
  okButtonRuns: OkRuns;
  /** Right from a stop: the nearest stop on the right, by Steam's transfer (pullModelsBeside.ts). In: the stop's element and key. */
  toList: (origin: HTMLElement | null, key: string) => boolean;
  /** Up from the first stop: the title row's Advanced link. False leaves the press to Steam. */
  upFromTop: () => boolean;
};

const CLEAR = "clear";
const CUSTOM = "custom";
const STARTER = "starter";
const suggestedKey = (tag: string) => `suggested-${tag}`;

/** The column: the count and Clear, the three groups of rows, then the chips. See the header for the walk. */
export function PullModelsFiltersColumn(props: PullModelsFiltersColumnProps) {
  const { filters, changeFilters, tier, nonFossUnlocked, okButtonRuns } = props;
  /** Where the ring lands on each stop, and the area that counts as that stop (they differ only for an open "Type a name"). */
  const landings = useRef(new Map<string, HTMLElement | null>());
  const areas = useRef(new Map<string, HTMLElement | null>());
  const bind = (key: string) => (landing: HTMLElement | null, area: HTMLElement | null = landing) => {
    landings.current.set(key, landing);
    areas.current.set(key, area);
  };

  const disabled = (row: FilterPanelRow) => row.kind === "licence" && row.tier === "non_foss" && !nonFossUnlocked;
  const checked = (row: FilterPanelRow): boolean => {
    if (row.kind === "licence") return tier === row.tier;
    if (row.kind === "mode") return filters.modeFilters.has(row.id);
    if (row.kind === "installedOnly") return filters.installedOnly;
    if (row.kind === "essentialsOnly") return filters.essentialsOnly;
    return filters.recentlyAddedOnly;
  };
  const toggle = (row: FilterPanelRow) => {
    if (disabled(row)) return;
    if (row.kind === "licence") props.onSelectTier?.(row.tier);
    else if (row.kind === "mode") {
      changeFilters((prev) => {
        const next = new Set(prev.modeFilters);
        if (!next.delete(row.id)) next.add(row.id);
        return { modeFilters: next };
      });
    } else if (row.kind === "installedOnly") changeFilters((p) => ({ installedOnly: !p.installedOnly }));
    else if (row.kind === "essentialsOnly") changeFilters((p) => ({ essentialsOnly: !p.essentialsOnly }));
    else changeFilters((p) => ({ recentlyAddedOnly: !p.recentlyAddedOnly }));
  };
  /** Clear: Good for and Show back to their defaults. The licence is a saved choice, so it stays (plan 92 § 14, call 2). */
  const clear = () => changeFilters(DEFAULT_SESSION_FILTERS);

  /** Every stop's key, top to bottom; a key with no element drawn, or a disabled one, is skipped by the walk. */
  const order = [
    CLEAR,
    ...FILTER_PANEL_ROWS.map(filterPanelRowKey),
    CUSTOM,
    STARTER,
    ...props.suggested.map((e) => suggestedKey(e.tag)),
  ];
  /*
   * A greyed row is skipped by what the column knows (the row is off), never by asking the element: on the
   * Deck a greyed button carries only a Disabled class, not the browser's `disabled`, and a plain focus()
   * put the ring on it (plan92-P91-MODELS-COLUMN-WALK.json: the third licence row, both ways).
   */
  const greyed = new Set(FILTER_PANEL_ROWS.filter(disabled).map(filterPanelRowKey));
  const usable = (key: string) => {
    const el = landings.current.get(key);
    return el && !greyed.has(key) ? el : null;
  };
  /** The next usable stop from `key` in `dir`, by a plain sibling focus; false past either end. */
  const step = (key: string, dir: 1 | -1): boolean => {
    for (let i = order.indexOf(key) + dir; i >= 0 && i < order.length; i += dir) {
      const el = usable(order[i]);
      if (el) return focusAndReveal(el);
    }
    return false;
  };
  const nav = (key: string): Record<string, unknown> => ({
    onMoveUp: () => step(key, -1) || props.upFromTop(),
    onMoveDown: () => step(key, 1),
    onMoveRight: () => props.toList(areas.current.get(key) ?? null, key),
    onMoveLeft: () => true,
  });

  useEffect(() => {
    props.apiRef.current = {
      focusStop: (key) => focusAndReveal((key && usable(key)) || usable(CLEAR)),
      // Left from a row measures these: every stop that can take the ring, the greyed row left out above.
      stops: () => order.flatMap((key) => (usable(key) ? [{ key, el: areas.current.get(key) ?? usable(key)! }] : [])),
    };
  });

  const n = props.matchCount;
  let lastHeading = "";
  return (
    <Focusable
      className="bonsai-pullmodels-filtercol"
      flow-children="column"
      {...({ navRef: props.navRef } as Record<string, unknown>)}
    >
      <div className="bonsai-pullmodels-filtercol-top">
        <span className="bonsai-pullmodels-filtercol-count">
          {n} {n === 1 ? "model matches" : "models match"}
        </span>
        <Button
          ref={(el: HTMLElement | null) => bind(CLEAR)(el)}
          className="bonsai-pullmodels-filtercol-clear"
          aria-label="Clear the Good for and Show filters"
          onClick={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            clear();
          }}
          {...({ ...nav(CLEAR), onOKButton: okButtonRuns(clear) } as unknown as Record<string, unknown>)}
        >
          Clear
        </Button>
      </div>
      {FILTER_PANEL_ROWS.map((row) => {
        const key = filterPanelRowKey(row);
        const heading = filterPanelRowGroupHeading(row);
        const title = heading !== lastHeading ? <div className="bonsai-pullmodels-filtercol-title">{heading}</div> : null;
        lastHeading = heading;
        const on = checked(row);
        const off = disabled(row);
        const radio = row.kind === "licence";
        return (
          <div key={key} className="bonsai-pullmodels-filtercol-group-row">
            {title}
            <Button
              ref={(el: HTMLElement | null) => bind(key)(el)}
              focusable={!off}
              disabled={off}
              className={`bonsai-pullmodels-filtercol-row${on ? " bonsai-pullmodels-filtercol-row--on" : ""}`}
              aria-pressed={on}
              aria-label={off ? `${filterPanelRowAriaLabel(row)} — turn on the unlock in Advanced first` : filterPanelRowAriaLabel(row)}
              onClick={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                toggle(row);
              }}
              {...({ ...nav(key), onOKButton: okButtonRuns(() => toggle(row)) } as unknown as Record<string, unknown>)}
            >
              <span className="bonsai-pullmodels-filtercol-tick" aria-hidden="true">
                {radio ? (on ? "●" : "○") : on ? "✔" : ""}
              </span>
              <span className="bonsai-pullmodels-filtercol-label">{filterPanelRowLabel(row)}</span>
              {row.kind === "mode" ? <span className="bonsai-pullmodels-filtercol-n">{props.modeCounts[row.id]}</span> : null}
            </Button>
          </div>
        );
      })}
      <div className="bonsai-pullmodels-filtercol-chips">
        <PullModelsCustomTagEntry
          pullBusy={props.pullBusy}
          onPullAccepted={props.onPullAccepted}
          focusAfterRedraw={props.focusAfterRedraw}
          okButtonRuns={okButtonRuns}
          nav={nav(CUSTOM)}
          bindStop={bind(CUSTOM)}
        />
        <PullModelsStarterSetChip
          installedTags={props.installedTags}
          nav={nav(STARTER)}
          bindStop={bind(STARTER)}
          okButtonRuns={okButtonRuns}
        />
        {props.suggested.length > 0 ? <div className="bonsai-pullmodels-filtercol-title">Suggested</div> : null}
        {props.suggested.map((entry) => {
          const key = suggestedKey(entry.tag);
          const queued = props.selectedTags.has(entry.tag);
          return (
            <Button
              key={key}
              ref={(el: HTMLElement | null) => bind(key)(el)}
              className={`bonsai-pullmodels-chip${queued ? " bonsai-pullmodels-chip--active" : ""}`}
              onClick={(ev) => props.onToggleSuggested(entry, ev)}
              aria-label={queued ? `Remove ${entry.tag} from queue` : `Queue ${entry.tag}`}
              {...({ ...nav(key), onOKButton: okButtonRuns(() => props.onToggleSuggested(entry)) } as unknown as Record<string, unknown>)}
            >
              {entry.tag}
            </Button>
          );
        })}
      </div>
    </Focusable>
  );
}
