/** Must match backend `strategy_guide_parse.STRATEGY_FOLLOWUP_PREFIX`. */
export const STRATEGY_FOLLOWUP_PREFIX = "[Strategy follow-up]";

/**
 * `bonsai-strategy-branches` option id reserved by the plugin: choosing it fills the composer with
 * {@link CUSTOM_RESOLUTION_INPUT_PREFIX} and focuses the field (no automatic Ask). Models must use `"d"`.
 */
export const STRATEGY_BRANCH_CUSTOM_RESOLUTION_ID = "d";

export const CUSTOM_RESOLUTION_INPUT_PREFIX = "My resolution is: ";

const CUSTOM_RES_LABEL_RE =
  /enter your own|type my( resolution)?|own resolution|custom( resolution)?|other resolution|other display|my resolution/i;

/**
 * `id: "d"` is used for many strategy games; only treat it as the **resolution** escape hatch when the label
 * matches the display-target phrasing, or the id is an explicit `custom` / `enter_own` alias.
 */
export function isStrategyCustomResolutionBranch(opt: { id: string; label: string }): boolean {
  const id = (opt.id ?? "").trim().toLowerCase();
  if (id === "custom" || id === "enter_own") {
    return true;
  }
  if (id !== STRATEGY_BRANCH_CUSTOM_RESOLUTION_ID) {
    return false;
  }
  return CUSTOM_RES_LABEL_RE.test((opt.label ?? "").trim());
}
