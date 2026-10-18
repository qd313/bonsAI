/**
 * Title: Pull models licence slot
 *
 * Purpose: In the "Add models" list, each row has a small fixed-width slot after the model name
 * that holds the licence pill: a green "FOSS" for an open-source model, or an amber two-word pill
 * ("Research only", "Open weight", ...) naming why the model is not open source (plan 96 F18). The
 * slot keeps the same width on every row, so the names in the column do not shift. This draws that
 * one slot.
 *
 * Used for: PullModelsModal.tsx, once per model row.
 *
 * Solves: Keeps the modal's own file from growing past its size limit by holding this small,
 * self-contained piece, moved out unchanged.
 *
 * Does not: Decide what the pill says; `pullModelLicencePillText()` in the catalog file does.
 */
import React from "react";
import type { PullModelEntry } from "../pullModelCatalog";
import { pullModelLicencePillText } from "../pullModelLicencePill";

export const PullModelLicenceSlot: React.FC<{ entry: PullModelEntry }> = ({ entry }) => {
  const pillText = pullModelLicencePillText(entry);
  return (
    <span className="bonsai-pullmodels-foss-slot">
      <span
        className={`bonsai-pullmodels-chip bonsai-pullmodels-chip--foss bonsai-pullmodels-chip--foss-inline${
          pillText === "FOSS" ? "" : " bonsai-pullmodels-chip--licence-name"
        }`}
      >
        {pillText}
      </span>
    </span>
  );
};
