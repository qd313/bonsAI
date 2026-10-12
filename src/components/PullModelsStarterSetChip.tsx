/**
 * Title: Browse models' "Install the starter set" button
 *
 * Purpose: One button near the bottom of the AI models box's filters column (under "Type a name") that asks
 * first, with the size, and then downloads the starter set: the small model that can chat, read
 * screenshots and help in Strategy mode. It is the one-press way to get started on a Deck with no
 * models, now that the Ollama tab's "Install options..." button is gone.
 *
 * Used for: PullModelsFiltersColumn.tsx, drawn only while the starter model is not installed yet.
 *
 * Solves: Without it a person looking for models on a fresh Deck had to find the right model in the
 * table and queue it by hand.
 *
 * Does not: install anything itself. askThenInstallStarterSet() (localOllamaStarterSet.tsx) shows the
 * download notice and starts the same setup run the old Tier 1 button started. Hiding the button
 * once the model is installed is the only decision made here.
 *
 * Focus: one stop of the filters column; the column hands in its moves (`nav`: Up and Down to the
 * neighbouring stops, Right to the list) and is told where the ring lands (`bindStop`), so a chip that
 * is not drawn is skipped by the walk. A press goes through
 * `onOKButton` as well as `onClick`, as every control on this screen must (the screen is a confirm
 * box with its own OK). The box is the shell's usual download notice, so closing it hands the ring
 * back through the same nested-box handoff as the screen's other download boxes.
 */
import { Button } from "@decky/ui";
import { TIER1_ESSENTIALS_TAG } from "../data/deckEssentialsTags";
import { isTagInstalled } from "../utils/pullModelFilters";
import { askThenInstallStarterSet, STARTER_SET_BUTTON_LABEL } from "../hooks/localOllamaStarterSet";

export function PullModelsStarterSetChip(props: {
  installedTags: Set<string>;
  nav: Record<string, unknown>;
  bindStop: (el: HTMLElement | null) => void;
  okButtonRuns: (fn: () => void) => (evt: { stopPropagation: () => void }) => void;
}) {
  const { installedTags, nav, bindStop, okButtonRuns } = props;
  if (isTagInstalled(TIER1_ESSENTIALS_TAG, installedTags)) return null;
  const press = () => {
    void askThenInstallStarterSet();
  };
  return (
    <Button
      ref={bindStop}
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
