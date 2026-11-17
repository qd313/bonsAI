/**
 * Title: The AI models box's filter strip
 *
 * Purpose: The filters, always on screen above the model list (board 5, tab 3, option C: word buttons and two
 * switches). Two switches on the first line, "Fits this Deck" and "Open source only", and how many models the list
 * shows; under them "Pick a word to narrow the list" and the word buttons, built from whatever is in the list. After
 * the words, the three things the old filters column also held: "Type a name", "Install the starter set" while the
 * starter model is missing, and the Suggested models.
 *
 *     [ Fits this Deck  (o) ] [ Open source only (o) ]            17 models      Up from here -> Advanced
 *     Pick a word to narrow the list
 *     (chat) (pictures) (strategy) (qwen) (gemma) (llama) (3 more words v) [Type a name] [Install...] Suggested: [chip]
 *        Down past the last line -> the try-order switch, or the first row of the list
 *
 * Used for: PullModelsModal.tsx, above the list.
 *
 * Solves: eleven filter rows in three groups, several that changed nothing you could see, beside a list too narrow
 * to read. Licence is one switch (it dims a row, never hides one), "Show" is one switch (Fits this Deck), "Good for"
 * is the words, and the list shows the same count whatever is set.
 *
 * Does not: Hold the picks (the box does, through the session memory in pullModelsBoxMemory.ts), count the models
 * (usePullModelTableData.ts does), build the words (pullModelWords.ts does), or decide the licence (a saved setting
 * the box's hub keeps; the switch only proposes a change to it).
 *
 * Focus: one Focusable (`navRef`, so the try-order switch and the list can hand the ring back by Steam's
 * transfer); every stop is a plain button inside it. Up, Down, Left and Right between stops are plain sibling
 * `focus()` moves to the stop the strip works out from where the stops are drawn at the press (pullModelsStripMove.ts);
 * Left and Right are held at the ends of a line, Up from the first line is the box's `upFromTop` (the Advanced link)
 * and Down from the last is `downFromStrip` (a transfer out of the strip). Every press also goes through
 * `onOKButton` (the box is a confirm box with its own OK; Steam delivers A that way, never a click). The open
 * "Type a name" row is its own small Focusable, reached by the same plain hop it always was (see docs/focus-graph.md).
 */
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Button, Focusable } from "@decky/ui";
import type { PullModelEntry } from "../pullModelCatalog";
import type { ModelPolicyTierId } from "../modelPolicy";
import type { NavRefHolder } from "../../../shared/dpad/navFocusRegistry";
import { focusAndReveal, type PullModelsSessionFilters } from "./pullModelsBoxMemory";
import { stripTarget, type StripDirection, type StripStop } from "./pullModelsStripMove";
import type { PullModelWord } from "./pullModelWords";
import { PullModelsCustomTagEntry } from "./PullModelsCustomTagEntry";
import { PullModelsStarterSetChip } from "./PullModelsStarterSetChip";

type OkRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => void;

/** What the box asks of the strip: land on its first stop, or on the last line's stop nearest an element. */
export type FiltersStripApi = {
  focusStop: (key: string | null) => boolean;
  focusBottomNear: (near: HTMLElement | null) => boolean;
};

export type PullModelsFiltersStripProps = {
  /** The strip's nav node, filled by Steam: the target of the box's transfers onto it. */
  navRef: NavRefHolder;
  apiRef: MutableRefObject<FiltersStripApi | null>;
  filters: PullModelsSessionFilters;
  changeFilters: (change: Partial<PullModelsSessionFilters>) => void;
  tier: ModelPolicyTierId;
  onSelectTier?: (tier: ModelPolicyTierId) => void;
  /** The rows the list draws. */
  matchCount: number;
  /** The word buttons, and the picked one if the list still has it. */
  words: readonly PullModelWord[];
  activeWord: string | null;
  installedTags: Set<string>;
  suggested: readonly PullModelEntry[];
  selectedTags: Set<string>;
  onToggleSuggested: (entry: PullModelEntry, ev?: { stopPropagation: () => void; preventDefault: () => void }) => void;
  pullBusy: boolean;
  onPullAccepted: () => void;
  focusAfterRedraw: (fn: () => void) => void;
  okButtonRuns: OkRuns;
  /** Down from the last line: out of the strip by Steam's transfer. False leaves the press to Steam. */
  downFromStrip: () => boolean;
  /** Up from the first line: the title row's Advanced link. False leaves the press to Steam. */
  upFromTop: () => boolean;
};

/** Nine words show; the rest sit behind "N more words", as drawn. */
const WORDS_SHOWN = 9;
const FITS = "fits";
const OSS = "oss";
const MORE = "more";
const CUSTOM = "custom";
const STARTER = "starter";
const wordKey = (id: string) => `word-${id}`;
const suggestedKey = (tag: string) => `suggested-${tag}`;

/**
 * The strip: the two switches and the count, then the words and the chips, each stop answering its own press. See the
 * header for the walk. In: the picks and the words from the box; Out: the drawn strip, and the box's handle on it (`apiRef`).
 */
export function PullModelsFiltersStrip(props: PullModelsFiltersStripProps) {
  const { filters, changeFilters, tier, okButtonRuns } = props;
  const [allWords, setAllWords] = useState(false);
  /** Where the ring lands on each stop, and the area that counts as that stop (they differ only for an open "Type a name"). */
  const landings = useRef(new Map<string, HTMLElement | null>());
  const areas = useRef(new Map<string, HTMLElement | null>());
  const bind = (key: string) => (landing: HTMLElement | null, area: HTMLElement | null = landing) => {
    landings.current.set(key, landing);
    areas.current.set(key, area);
  };

  const shown = allWords ? props.words : props.words.slice(0, WORDS_SHOWN);
  const hasMore = props.words.length > WORDS_SHOWN;
  /** Every stop's key, in the order drawn; a key with no element drawn is skipped by the moves. */
  const order = [
    FITS,
    OSS,
    ...shown.map((w) => wordKey(w.id)),
    ...(hasMore ? [MORE] : []),
    CUSTOM,
    STARTER,
    ...props.suggested.map((e) => suggestedKey(e.tag)),
  ];

  /** Every stop that is drawn, with where. */
  const measured = (): StripStop[] =>
    order.flatMap((key) => {
      const el = areas.current.get(key);
      if (!el) return [];
      const r = el.getBoundingClientRect();
      return [{ key, left: r.left, top: r.top, width: r.width, height: r.height }];
    });

  const go = (from: string, dir: StripDirection): boolean => {
    const stops = measured();
    if (!stops.some((s) => s.key === from)) {
      // The stop under the ring has gone (the starter chip when its run ends): the ring goes to the last stop left.
      const last = stops[stops.length - 1];
      return dir === "up" && last ? focusAndReveal(landings.current.get(last.key)) : true;
    }
    const target = stripTarget(stops, from, dir);
    if (target === "hold") return true;
    if (target === "out-up") return props.upFromTop();
    if (target === "out-down") return props.downFromStrip();
    return focusAndReveal(landings.current.get(target));
  };
  const nav = (key: string): Record<string, unknown> => ({
    onMoveUp: () => go(key, "up"),
    onMoveDown: () => go(key, "down"),
    onMoveLeft: () => go(key, "left"),
    onMoveRight: () => go(key, "right"),
  });

  useEffect(() => {
    props.apiRef.current = {
      focusStop: (key) => focusAndReveal((key && landings.current.get(key)) || landings.current.get(FITS)),
      focusBottomNear: (near) => {
        const stops = measured();
        if (!stops.length) return false;
        const lastTop = Math.max(...stops.map((s) => s.top));
        const line = stops.filter((s) => Math.abs(s.top - lastTop) <= 8);
        const x = near ? near.getBoundingClientRect().left + near.getBoundingClientRect().width / 2 : 0;
        const best = line.reduce((b, s) => (Math.abs(s.left + s.width / 2 - x) < Math.abs(b.left + b.width / 2 - x) ? s : b), line[0]);
        return focusAndReveal(landings.current.get(best.key));
      },
    };
  });

  const toggleFits = () => changeFilters({ fitsDeck: !filters.fitsDeck });
  const ossOn = tier === "open_source_only";
  const toggleOss = () => props.onSelectTier?.(ossOn ? "open_weight" : "open_source_only");
  const pickWord = (id: string) => changeFilters({ word: props.activeWord === id ? null : id });

  const sw = (key: string, label: string, on: boolean, fn: () => void, aria: string) => (
    <Button
      ref={(el: HTMLElement | null) => bind(key)(el)}
      className={`bonsai-pullmodels-switch${on ? " bonsai-pullmodels-switch--on" : ""}`}
      aria-pressed={on}
      aria-label={aria}
      onClick={(ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        fn();
      }}
      {...({ ...nav(key), onOKButton: okButtonRuns(fn) } as unknown as Record<string, unknown>)}
    >
      <span className="bonsai-pullmodels-switch-label">{label}</span>
      <i className="bonsai-pullmodels-switch-knob" aria-hidden="true" />
    </Button>
  );

  const n = props.matchCount;
  return (
    <Focusable className="bonsai-pullmodels-strip" flow-children="column" {...({ navRef: props.navRef } as Record<string, unknown>)}>
      <div className="bonsai-pullmodels-strip-switches">
        {sw(FITS, "Fits this Deck", filters.fitsDeck, toggleFits, "Fits this Deck: leave out models that are slow or too big for a Deck")}
        {sw(OSS, "Open source only", ossOn, toggleOss, "Open source only: dim models whose licence is not open source")}
        <span className="bonsai-pullmodels-strip-count">
          {n} {n === 1 ? "model" : "models"}
        </span>
      </div>
      <div className="bonsai-pullmodels-find">
        <div className="bonsai-pullmodels-find-label">Pick a word to narrow the list</div>
        {shown.map((w) => {
          const on = props.activeWord === w.id;
          return (
            <Button
              key={w.id}
              ref={(el: HTMLElement | null) => bind(wordKey(w.id))(el)}
              className={`bonsai-pullmodels-word${on ? " bonsai-pullmodels-word--on" : ""}`}
              aria-pressed={on}
              onClick={(ev) => {
                ev.stopPropagation();
                ev.preventDefault();
                pickWord(w.id);
              }}
              {...({ ...nav(wordKey(w.id)), title: `${w.count} in the list`, onOKButton: okButtonRuns(() => pickWord(w.id)) } as unknown as Record<string, unknown>)}
            >
              {w.id}
            </Button>
          );
        })}
        {hasMore ? (
          <Button
            ref={(el: HTMLElement | null) => bind(MORE)(el)}
            className="bonsai-pullmodels-word bonsai-pullmodels-word--more"
            aria-expanded={allWords}
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              setAllWords((v) => !v);
            }}
            {...({ ...nav(MORE), onOKButton: okButtonRuns(() => setAllWords((v) => !v)) } as unknown as Record<string, unknown>)}
          >
            {allWords ? "Fewer words ▴" : `${props.words.length - WORDS_SHOWN} more words ▾`}
          </Button>
        ) : null}
        <PullModelsCustomTagEntry
          pullBusy={props.pullBusy}
          onPullAccepted={props.onPullAccepted}
          focusAfterRedraw={props.focusAfterRedraw}
          okButtonRuns={okButtonRuns}
          nav={nav(CUSTOM)}
          bindStop={bind(CUSTOM)}
        />
        <PullModelsStarterSetChip installedTags={props.installedTags} nav={nav(STARTER)} bindStop={bind(STARTER)} okButtonRuns={okButtonRuns} />
        {props.suggested.length > 0 ? <span className="bonsai-pullmodels-find-suggested">Suggested</span> : null}
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
