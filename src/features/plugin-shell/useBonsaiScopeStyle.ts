/**
 * Title: The panel's accent + UI-scale style
 *
 * Purpose: Turns the AI character settings into an accent color, merges it with the UI-scale
 * profile's own style, and publishes the merged style for other scopes (a Decky modal, for
 * instance) to read.
 *
 * Used for: `index.tsx`, on `BonsaiPluginShell`'s `scopeStyle` prop.
 *
 * Solves: Nothing new — the same chain of memos `Content` used to carry inline, moved out
 * because only the final merged style is needed anywhere else.
 *
 * Does not: Decide what accent a character preset maps to (`characterUiAccent.ts` does that),
 * or what the UI-scale profile's own style is (`useUiScaleProfile` does that).
 */
import { useEffect, useMemo } from "react";

import {
  buildBonsaiScopeAccentInlineStyle,
  resolveUiAccentFromCharacterSettings,
} from "../../data/characterUiAccent";
import { publishUiScaleScopeStyle } from "../../utils/uiScaleScopeBridge";

export type UseBonsaiScopeStyleArgs = {
  aiCharacterEnabled: boolean;
  aiCharacterRandom: boolean;
  aiCharacterPresetId: string;
  aiCharacterCustomText: string;
  uiScaleScopeStyle: React.CSSProperties;
};

/*
 * In: the four AI-character settings that decide the accent, and the UI-scale profile's own
 * style to merge over it.
 * Out: the merged style, also published for any other scope to read.
 * What can go wrong: the publish effect must stay paired with the memo that feeds it — a scope
 * elsewhere reading a stale style is what `publishUiScaleScopeStyle` exists to prevent.
 */
export function useBonsaiScopeStyle({
  aiCharacterEnabled,
  aiCharacterRandom,
  aiCharacterPresetId,
  aiCharacterCustomText,
  uiScaleScopeStyle,
}: UseBonsaiScopeStyleArgs): React.CSSProperties {
  const uiAccent = useMemo(
    () =>
      resolveUiAccentFromCharacterSettings({
        ai_character_enabled: aiCharacterEnabled,
        ai_character_random: aiCharacterRandom,
        ai_character_preset_id: aiCharacterPresetId,
        ai_character_custom_text: aiCharacterCustomText,
      }),
    [aiCharacterEnabled, aiCharacterRandom, aiCharacterPresetId, aiCharacterCustomText]
  );
  const bonsaiScopeAccentStyle = useMemo(() => buildBonsaiScopeAccentInlineStyle(uiAccent), [uiAccent]);
  const bonsaiScopeStyle = useMemo(
    () => ({ ...bonsaiScopeAccentStyle, ...uiScaleScopeStyle }),
    [bonsaiScopeAccentStyle, uiScaleScopeStyle],
  );

  useEffect(() => {
    publishUiScaleScopeStyle(bonsaiScopeStyle);
  }, [bonsaiScopeStyle]);

  return bonsaiScopeStyle;
}
