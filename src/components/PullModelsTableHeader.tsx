/**
 * Title: Browse models' column-header row
 *
 * Purpose: The sticky row of column names above the models table in the AI models box (Pull, Model,
 * Size, Date, Modes, Deck fit and Del).
 *
 * Used for: PullModelsModal.tsx, drawn once at the top of the table.
 *
 * Solves: Moves a 16-line block of fixed markup out of the big screen file so the screen file has
 * room for the try-order column the box is about to get without growing past its recorded limit.
 *
 * Does not: hold any state or focus stop. It is words only; the column widths come from the box's
 * stylesheet (gamepadAndPullModels.ts).
 */
import type { Ref } from "react";
import { PULL_MODEL_RATING_COLUMN_LABEL } from "../data/pullModelCatalog";

export function PullModelsTableHeader(props: { headerRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={props.headerRef} className="bonsai-pullmodels-table-row bonsai-pullmodels-table-row--head" role="row">
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--pull" role="columnheader">Pull</div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="columnheader">Model</div>
      <div className="bonsai-pullmodels-col" role="columnheader">Size</div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--date" role="columnheader">Date</div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--modes" role="columnheader">Modes</div>
      <div
        className="bonsai-pullmodels-col bonsai-pullmodels-col--rating"
        role="columnheader"
        title="Curated Steam Deck quality — more stars = stronger pick"
      >
        {PULL_MODEL_RATING_COLUMN_LABEL}
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="columnheader">Del</div>
    </div>
  );
}
