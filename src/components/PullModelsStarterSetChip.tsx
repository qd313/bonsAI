/**
 * Title: Browse models' "Install the starter set" button
 *
 * Purpose: One button on the top row of Browse models (next to Filters and "Type a name") that asks
 * first, with the size, and then downloads the starter set: the small model that can chat, read
 * screenshots and help in Strategy mode. It is the one-press way to get started on a Deck with no
 * models, now that the Ollama tab's "Install options..." button is gone.
 *
 * Used for: PullModelsModal.tsx's top row, drawn only while the starter model is not installed yet.
 *
 * Solves: Without it a person looking for models on a fresh Deck had to find the right model in the
 * table and queue it by hand.
 *
 * Does not: install anything itself. askThenInstallStarterSet() (localOllamaStarterSet.tsx) shows the
 * download notice and starts the same setup run the old Tier 1 button started. Hiding the button
 * once the model is installed is the only decision made here.
 *
 * Focus: a sibling in the top row's horizontal Focusable, so Left/Right come from Steam's own flow;
 * Down is the screen's own hand-wired move into the table (`onMoveDown`). A press goes through
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
  onMoveDown: () => boolean;
  okButtonRuns: (fn: () => void) => (evt: { stopPropagation: () => void }) => void;
}) {
  const { installedTags, onMoveDown, okButtonRuns } = props;
  if (isTagInstalled(TIER1_ESSENTIALS_TAG, installedTags)) return null;
  const press = () => {
    void askThenInstallStarterSet();
  };
  return (
    <Button
      className="bonsai-pullmodels-chip bonsai-pullmodels-starter-set-chip"
      onClick={(ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        press();
      }}
      aria-label={STARTER_SET_BUTTON_LABEL}
      {...({ onMoveDown, onOKButton: okButtonRuns(press) } as unknown as Record<string, unknown>)}
    >
      {STARTER_SET_BUTTON_LABEL}
    </Button>
  );
}
