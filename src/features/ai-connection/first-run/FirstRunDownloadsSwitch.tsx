/**
 * Title: The Internet downloads switch on the first-time setup screen
 *
 * Purpose: The real Internet downloads permission, in the Permissions tab's own title and description, drawn as
 * the picked drawing's 40-point row (board 5, tab 4, round 4 B): the words on the left, a switch on the right,
 * blue when on. It starts as the permission is (off on a fresh install) and nothing turns it on but the person's
 * own press; the screen saves each press at once through the download notice's permission save
 * (setInternetDownloadsFromSwitch, plan 104's path), and a failed save puts the switch back with a message.
 *
 * Used for: FirstRunWhereAiRunsModal.tsx.
 *
 * Solves: The maintainer's note on the checklist drawing: "copy the permission that is auto-enabled to this
 * screen. User toggles it and hits a confirm OK". Steam's own switch row is taller than the drawn one and the
 * screen has about 11 points to spare (firstRunBoxLayout.ts), so this is the drawn row, built from the popup's
 * own button.
 *
 * Does not: Save anything itself (the screen does, so it can keep OK grey until the save has come back), or show
 * under Steam's parental lock as anything but off: there it is greyed and says why, in the same height.
 */
import React, { type CSSProperties } from "react";

import { textPx } from "../../../styles/textPx";
import type { SearchStopProps } from "../../search-tab/useSearchNav";
import { INTERNET_DOWNLOADS_PERMISSION_WORDS } from "../../permissions/PermissionsTab";
import { FIRST_RUN_BOX } from "./firstRunBoxLayout";
import { PopupButton } from "./FirstRunPopupParts";

/** Said under the title instead of the description while Steam's parental lock keeps downloads off. */
const KIDS_LOCK_SWITCH_LINE = "Parental controls keep internet downloads off.";

const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  boxSizing: "border-box",
  width: "100%",
  height: FIRST_RUN_BOX.switchHeightPx,
  minHeight: FIRST_RUN_BOX.switchHeightPx,
  margin: 0,
  padding: "0 12px",
  border: 0,
  borderRadius: 2,
  background: "#1f242b",
  color: "#dcdedf",
  textAlign: "left",
  fontSize: textPx(12.5),
};

/** The switch itself, 33 by 18 as drawn: grey off, Steam's blue on. */
function SwitchTrack({ on }: { on: boolean }): React.ReactElement {
  return (
    <span aria-hidden style={{ width: 33, height: 18, borderRadius: 9, background: on ? "#1a9fff" : "#32373d", position: "relative", flex: "none" }}>
      <span style={{ position: "absolute", top: 1, left: on ? 16 : 1, width: 16, height: 16, borderRadius: "50%", background: "#fdfeff" }} />
    </span>
  );
}

/** In: whether it is on, the parental lock, the stop, the press. Out: the row. */
export function FirstRunDownloadsSwitch({
  on,
  kidsLock,
  stop,
  onPress,
}: {
  on: boolean;
  kidsLock: boolean;
  stop: SearchStopProps;
  onPress: () => void;
}): React.ReactElement {
  const words = INTERNET_DOWNLOADS_PERMISSION_WORDS;
  return (
    <div data-bonsai-first-run-part="switch">
      <PopupButton
        stop={stop}
        look="row"
        rowStyle={ROW_STYLE}
        ariaLabel={words.title}
        ariaChecked={on}
        greyed={kidsLock}
        onPress={onPress}
        onGreyPress={onPress}
        label={
          <>
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
              <b style={{ fontWeight: 600, color: "#ffffff" }}>{words.title}</b>
              <small style={{ display: "block", fontSize: textPx(10.5), color: "#9fb7d5", marginTop: 1 }}>
                {kidsLock ? KIDS_LOCK_SWITCH_LINE : words.description}
              </small>
            </span>
            <SwitchTrack on={on} />
          </>
        }
      />
    </div>
  );
}
