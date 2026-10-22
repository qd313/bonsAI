/**
 * Title: Which build is installed
 *
 * Purpose: Asks the back end once, when the About tab opens, which build of the
 * plugin is installed (the first 12 characters of the fingerprint of dist/index.js)
 * and hands it back as text for the title line: "build 8bdfff8b7f5e", or
 * "build unknown" when the back end could not read the file.
 *
 * Used for: The About tab's title line (AboutTab.tsx).
 *
 * Solves: "Version 0.5.0" alone cannot tell two builds apart on the Deck.
 *
 * Does not: Show anything before the answer arrives, or when the call fails (the
 * title then reads just the version, as before).
 */
import { useEffect, useState } from "react";

import { callDeckyWithTimeout } from "../../shared/deckyCall";

type BuildInfo = { build?: string; modified?: number | null };

/**
 * In: nothing. Out: "build <12 hex>" / "build unknown", or "" until the back end answers
 * (and for good if the call fails).
 */
export function useBuildInfoLabel(): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    let alive = true;
    callDeckyWithTimeout<[], BuildInfo>("get_build_info", [])
      .then((info) => {
        if (alive && info && typeof info.build === "string" && info.build) setLabel(`build ${info.build}`);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return label;
}
