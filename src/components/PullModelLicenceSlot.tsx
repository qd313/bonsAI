/**
 * Title: Pull models licence slot
 *
 * Purpose: In the "Add models" list, each row has a small fixed-width slot after the model name
 * that holds the licence pill: "FOSS" for an open-source model, or the licence's own short name for
 * another kind. A model with no pill leaves the slot empty but still takes the same room, so the
 * names in the column do not shift from row to row. This draws that one slot.
 *
 * Used for: PullModelsModal.tsx, once per model row.
 *
 * Solves: Keeps the modal's own file from growing past its size limit by holding this small,
 * self-contained piece, moved out unchanged.
 *
 * Does not: Decide what the pill says; `pullModelLicencePillText()` in the catalog file does.
 */
import React from "react";
import type { PullModelEntry } from "../data/pullModelCatalog";
import { pullModelLicencePillText } from "../data/pullModelLicencePill";

export const PullModelLicenceSlot: React.FC<{ entry: PullModelEntry }> = ({ entry }) => {
  const pillText = pullModelLicencePillText(entry);
  return (
    <span className="bonsai-pullmodels-foss-slot" aria-hidden={pillText === null}>
      {pillText !== null ? (
        <span
          className={`bonsai-pullmodels-chip bonsai-pullmodels-chip--foss bonsai-pullmodels-chip--foss-inline${
            pillText === "FOSS" ? "" : " bonsai-pullmodels-chip--licence-name"
          }`}
        >
          {pillText}
        </span>
      ) : null}
    </span>
  );
};
