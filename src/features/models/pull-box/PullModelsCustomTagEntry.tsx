/**
 * Title: "Type a name" in the AI models box's filters column
 *
 * Purpose: The chip that, pressed, turns into a small field for typing any model name by hand, with
 * its Pull button and a close "×". It sits near the bottom of the filters column (plan 91 § 2a); it
 * used to share the old Filters row, and before that had a whole row of its own (plan 62, § 3e #4).
 *
 * Used for: PullModelsFiltersColumn.tsx, one of the column's stops.
 *
 * Solves: Keeps the typed-name pull (its field, its busy flag, its hook) in one piece the column can
 * place, instead of inside the box's own file, which is at its size limit.
 *
 * Does not: Decide the column's walk. The column hands in the Up/Down/Right moves for this stop
 * (`nav`) and is told which element the ring should land on (`bindStop`): the chip while closed, the
 * "×" while open (never disabled, so a landing always takes; the Pull button starts disabled).
 *
 * Focus: Open, the field, Pull and "×" are one horizontal Focusable, so Left and Right between them are
 * Steam's own. B while typing closes just the field and returns the ring to the chip, instead of
 * falling through to the box's own Cancel and losing what was typed (found 2026-09-20). Every press
 * goes through `onOKButton` as well as `onClick`: the box is a confirm box with its own OK, and Steam
 * delivers A through `onOKButton`, never a DOM click (Deck 2026-09-21).
 */
import { useRef, useState, type ChangeEvent } from "react";
import { Button, Focusable, TextField } from "@decky/ui";
import { isPlausibleOllamaPullTag } from "./mergePullModelCatalog";
import { usePullModelCustomTagPull } from "./usePullModelCustomTagPull";
import { focusAndReveal } from "./pullModelsBoxMemory";

type OkRuns = (fn: () => void) => (evt: { stopPropagation: () => void }) => void;

/** The chip while closed; the field, Pull and "×" while open. See the header for the walk and B. */
export function PullModelsCustomTagEntry(props: {
  pullBusy: boolean;
  onPullAccepted: () => void;
  focusAfterRedraw: (fn: () => void) => void;
  okButtonRuns: OkRuns;
  /** The column's moves for this stop: Up, Down and Right. */
  nav: Record<string, unknown>;
  /** The column's note of where the ring lands on this stop, and of the area that counts as it. */
  bindStop: (landing: HTMLElement | null, area: HTMLElement | null) => void;
}) {
  const { pullBusy, onPullAccepted, focusAfterRedraw, okButtonRuns, nav, bindStop } = props;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chipRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLElement | null>(null);
  const focusChip = (): boolean => focusAndReveal(chipRef.current);

  const { onPullCustomTag } = usePullModelCustomTagPull({
    customTagInput: input,
    customPullBusy: busy,
    pullBusy,
    onPullAccepted,
    focusCustomTagChip: focusChip,
    setCustomPullBusy: setBusy,
    setCustomTagInput: setInput,
    setCustomTagEntryOpen: setOpen,
    focusAfterRedraw,
  });

  const openField = () => {
    setOpen(true);
    focusAfterRedraw(() => focusAndReveal(closeRef.current));
  };
  const closeField = () => {
    setOpen(false);
    setInput("");
    focusAfterRedraw(() => focusChip());
  };
  const canPull = isPlausibleOllamaPullTag(input) && !busy && !pullBusy;
  const pull = () => {
    if (canPull) void onPullCustomTag();
  };
  const press = (fn: () => void) => (ev: { stopPropagation: () => void; preventDefault: () => void }) => {
    ev.stopPropagation();
    ev.preventDefault();
    fn();
  };

  if (!open) {
    return (
      <Button
        ref={(el: HTMLElement | null) => {
          chipRef.current = el;
          bindStop(el, el);
        }}
        className="bonsai-pullmodels-chip bonsai-pullmodels-custom-tag-chip"
        onClick={press(openField)}
        aria-label="Type a model name by hand"
        {...({ ...nav, onOKButton: okButtonRuns(openField) } as unknown as Record<string, unknown>)}
      >
        Type a name
      </Button>
    );
  }
  return (
    <div className="bonsai-pullmodels-custom-tag">
      <Focusable
        ref={(el: HTMLDivElement | null) => bindStop(closeRef.current, el)}
        flow-children="horizontal"
        className="bonsai-pullmodels-custom-tag-row"
        {...({
          onCancelButton: (e: unknown) => {
            closeField();
            (e as { preventDefault?: () => void })?.preventDefault?.();
            return true;
          },
        } as unknown as Record<string, unknown>)}
      >
        <TextField
          label=""
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          {...({ placeholder: "Model tag, e.g. llama3.2:3b" } as unknown as Record<string, unknown>)}
          style={{ flex: "1 1 auto", minWidth: 0 }}
        />
        <Button
          className="bonsai-pullmodels-chip bonsai-pullmodels-custom-pull-btn"
          disabled={!canPull}
          onClick={press(pull)}
          aria-label="Pull custom model tag"
          {...({ onMoveUp: nav.onMoveUp, onMoveDown: nav.onMoveDown, onOKButton: okButtonRuns(pull) } as unknown as Record<
            string,
            unknown
          >)}
        >
          {busy ? "…" : "Pull"}
        </Button>
        <Button
          ref={(el: HTMLElement | null) => {
            closeRef.current = el;
          }}
          className="bonsai-pullmodels-chip bonsai-pullmodels-custom-tag-close"
          onClick={press(closeField)}
          aria-label="Close typing a model name by hand"
          {...({ ...nav, onOKButton: okButtonRuns(closeField) } as unknown as Record<string, unknown>)}
        >
          ×
        </Button>
      </Focusable>
      {input.trim() && !isPlausibleOllamaPullTag(input) ? (
        <div className="bonsai-pullmodels-custom-tag-hint">Use lowercase letters, digits, . _ - and an optional :tag</div>
      ) : null}
    </div>
  );
}
