/**
 * Title: Browse models' "Install the starter set" button
 *
 * Purpose: One button near the bottom of the AI models box's filters column (under "Type a name") that asks
 * first, with the sizes, and then downloads the starter set: the answer model (it can chat, read
 * screenshots and help in Strategy mode), the note-search model and the two speech models. It is the
 * one-press way to get started on a Deck with no models, now that the Ollama tab's "Install options..."
 * button is gone.
 *
 * Used for: PullModelsFiltersColumn.tsx, drawn until the whole set is there: the answer model and the
 * note-search model installed in Ollama, and both speech models on disk. The speech models are read from
 * the voice engine's status; until that answers (or if it cannot), only Ollama's two models decide. A run
 * this button started is watched: when it ends "done" the button goes at once, and when it ends any other
 * way the speech models are read again (so the button follows what is really on the Deck).
 *
 * Solves: Without it a person looking for models on a fresh Deck had to find the right model in the
 * table and queue it by hand.
 *
 * Does not: install anything itself. askThenInstallStarterSet() (localOllamaStarterSet.tsx) shows the
 * download notice and starts the same setup run the old Tier 1 button started. Hiding the button
 * once the whole set is installed is the only decision made here.
 *
 * Focus: one stop of the filters column; the column hands in its moves (`nav`: Up and Down to the
 * neighbouring stops, Right to the list) and is told where the ring lands (`bindStop`), so a chip that
 * is not drawn is skipped by the walk. A press goes through
 * `onOKButton` as well as `onClick`, as every control on this screen must (the screen is a confirm
 * box with its own OK). The box is the shell's usual download notice, so closing it hands the ring
 * back through the same nested-box handoff as the screen's other download boxes.
 */
import { useEffect, useState } from "react";
import { Button } from "@decky/ui";
import { useHandRingOnGone } from "../../../shared/dpad/useHandRingOnGone";
import { useStarterSetRunWatch } from "../useStarterSetRunWatch";
import { STARTER_NOTE_SEARCH_TAG, STARTER_SPEECH_MODELS, TIER1_ESSENTIALS_TAG } from "../deckEssentialsTags";
import { callDeckyWithTimeout, DECKY_RPC_TIMEOUT_MS } from "../../../shared/deckyCall";
import { isTagInstalled } from "./pullModelFilters";
import { askThenInstallStarterSet, STARTER_SET_BUTTON_LABEL } from "../localOllamaStarterSet";

export function PullModelsStarterSetChip(props: {
  installedTags: Set<string>;
  nav: Record<string, unknown>;
  bindStop: (el: HTMLElement | null) => void;
  okButtonRuns: (fn: () => void) => (evt: { stopPropagation: () => void }) => void;
}) {
  const { installedTags, nav, bindStop, okButtonRuns } = props;
  // Which speech models are on disk, from the voice engine's status (null until it answers, or if it cannot).
  const [speechReady, setSpeechReady] = useState<Record<string, boolean> | null>(null);
  // A run this button started has ended: "done" means every piece is there, so the button goes at once;
  // whatever the ending, the speech models are read again.
  const [runDone, setRunDone] = useState(false);
  const [lookAgain, setLookAgain] = useState(0);
  const watchRun = useStarterSetRunWatch((phase) => {
    if (phase === "done") setRunDone(true);
    setLookAgain((n) => n + 1);
  });
  // The button can vanish under the ring (the run ended while it was on it): hand the ring to the stop above.
  const ringRef = useHandRingOnGone(() => {
    (nav.onMoveUp as (() => boolean) | undefined)?.();
  });
  useEffect(() => {
    let alive = true;
    callDeckyWithTimeout<[], { speech_models_ready?: Record<string, boolean> }>("get_voice_engine_status", [], DECKY_RPC_TIMEOUT_MS)
      .then((st) => alive && setSpeechReady(st?.speech_models_ready ?? null))
      .catch(() => alive && setSpeechReady(null));
    return () => {
      alive = false;
    };
  }, [installedTags.size, lookAgain]);
  const ollamaPartThere = isTagInstalled(TIER1_ESSENTIALS_TAG, installedTags) && isTagInstalled(STARTER_NOTE_SEARCH_TAG, installedTags);
  const speechMissing = speechReady != null && STARTER_SPEECH_MODELS.some((m) => speechReady[m] !== true);
  if (runDone || (ollamaPartThere && !speechMissing)) return null;
  const press = () => {
    void askThenInstallStarterSet().then((started) => {
      if (started) watchRun();
    });
  };
  return (
    <Button
      ref={(el: HTMLElement | null) => {
        bindStop(el);
        ringRef(el);
      }}
      className="bonsai-pullmodels-chip bonsai-pullmodels-starter-set-chip"
      onClick={(ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        press();
      }}
      aria-label={STARTER_SET_BUTTON_LABEL}
      {...({ ...nav, onOKButton: okButtonRuns(press) } as unknown as Record<string, unknown>)}
    >
      {STARTER_SET_BUTTON_LABEL}
    </Button>
  );
}
