/**
 * Title: Browse models' "On the PC" row
 *
 * Purpose: One row of the "On the PC" group in the AI models box: an answering model the PC (where the
 * AI runs) has installed, drawn with the table's own columns so it lines up with the Deck's rows. The
 * Try cell, with the place number and the up and down buttons, is handed in.
 *
 * Used for: PullModelsTryOrder.tsx (its pcGroup function), when the AI runs on a PC.
 *
 * Solves: Someone whose AI runs on a PC has few or no models on the Deck, so the Deck's rows could not
 * carry the places of the models that actually answer. These rows are the PC's own models, so the order
 * can still be changed from the box, and no mark on screen says a model is installed on a computer
 * where it is not: the Pull column reads "PC" and there is no star and no Remove button, because Pull
 * and Remove only ever act on this Deck.
 *
 * Does not: Pull, remove or star anything, or decide the order; the Try cell does the moving.
 */
import type { ReactNode } from "react";
import {
  formatGtaStars,
  formatPullModelTags,
  formatReleasedYmShort,
  formatSizeGb,
  type PullModelEntry,
} from "../data/pullModelCatalog";
import { PullModelLicenceSlot } from "./PullModelLicenceSlot";

export function PullModelsPcRow(props: {
  tag: string;
  entry: PullModelEntry | undefined;
  sizeGb: number | undefined;
  tryCell: ReactNode;
}) {
  const { tag, entry, sizeGb, tryCell } = props;
  return (
    <div
      className="bonsai-pullmodels-table-row bonsai-pullmodels-table-row--data bonsai-pullmodels-table-row--installed bonsai-pullmodels-table-row--pc"
      role="row"
    >
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--pull" role="cell">
        <span className="bonsai-pullmodels-place-none" title="Installed on the PC the AI runs on">
          PC
        </span>
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--model" role="cell">
        <span className="bonsai-pullmodels-model-line">
          <span className="bonsai-pullmodels-tag-name">
            <span className="bonsai-pullmodels-tag-name-text">{tag}</span>
          </span>
          {entry ? <PullModelLicenceSlot entry={entry} /> : <span className="bonsai-pullmodels-foss-slot" aria-hidden={true} />}
        </span>
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted" role="cell">
        {sizeGb != null && sizeGb > 0 ? formatSizeGb(sizeGb) : "?"}
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--date" role="cell">
        {entry ? formatReleasedYmShort(entry.releasedYm) : "—"}
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--muted bonsai-pullmodels-col--modes" role="cell">
        {entry ? formatPullModelTags(entry.tags) : "Other"}
      </div>
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--stars" role="cell">
        {entry ? formatGtaStars(entry.rating) : "—"}
      </div>
      {tryCell}
      <div className="bonsai-pullmodels-col bonsai-pullmodels-col--del" role="cell" />
    </div>
  );
}
