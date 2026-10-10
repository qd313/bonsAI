/**
 * Title: Show details: the open chip's details box
 *
 * Purpose: The box drawn under the Show details chips for whichever chip is open: its title, any
 * credit for the notes it used, file paths, bullet points and, for Developer details only, the raw
 * diagnostics.
 *
 * Used for: ContextChipLadder.tsx, which draws one of these under its chips.
 *
 * Solves: Keeps the box's drawing in one place of its own, apart from the ladder's walking and
 * scrolling rules, which kept the ladder file near its size limit (moved out unchanged, plan 87).
 *
 * Does not: Take focus or scroll anything. The ladder keeps the box's end in view
 * (useChipLadderReveal.ts); this only draws it. The `bonsai-chip-body` class on the root is how
 * the Text size setting scales the details text (plan 87 F6); keep it on the root.
 */
import {
  ATTRIBUTION_ACCENT,
  ATTRIBUTION_ACCENT_SOFT,
  chipAttribution,
  chipBodyBullets,
  chipBodyPaths,
  chipBodyTitle,
  chipDevJson,
  CREDITS_SHOWN,
  creditCardLabel,
  type CreditsView,
  SPOILER_HIDDEN_CREDITS_TEXT,
} from "../utils/contextChipsFromSnapshot";
import type { AskDiagnosticsSnapshot, ContextChip } from "../utils/inputTransparency";

/**
 * The panel below the chip row: title, credit/attribution block, file
 * paths, bullet points, and — for the Developer details chip only — raw
 * JSON dumps.
 *
 * In: the active chip, plus — only for the "developer" chip — the raw
 * ask_diagnostics payload to show underneath everything else.
 * Out: one detail panel. Every section is optional and only renders when
 * that chip actually has something of that kind to show.
 *
 * What can go wrong: none of the helper calls here can fail — chipBodyBullets(),
 * chipBodyPaths(), chipAttribution(), and chipDevJson() all just read
 * fields already computed onto the chip and default to empty.
 *
 * 1. Pull the possible sections off the chip: bullets, paths, attribution
 *    entries, and any raw JSON blob.
 * 2. Always show the title from chipBodyTitle().
 * 3. If there is attribution, show it first, as a highlighted block with
 *    source, license, and capture date.
 * 4. Then any file paths, one per line.
 * 5. Then bullet points, if there are any.
 * 6. Then the chip's own JSON dump, if it carries one.
 * 7. Finally, only on the developer chip, the separate ask_diagnostics
 *    dump — folded in here so "Show details" is the one place raw
 *    diagnostics live, instead of a second button next to it.
 */
export function ChipExpandedBody({
  chip,
  devDiagnostics,
  creditsView = CREDITS_SHOWN,
  bodyRef,
}: {
  chip: ContextChip;
  devDiagnostics?: AskDiagnosticsSnapshot | null;
  creditsView?: CreditsView;
  /** Hands the panel's own element back, so the ladder can scroll the end of a tall one into view. */
  bodyRef?: (el: HTMLDivElement | null) => void;
}) {
  const creditsHidden = creditsView.hidden;
  const bullets = chipBodyBullets(chip);
  const paths = chipBodyPaths(chip);
  const attribution = chipAttribution(chip);
  const devJson = chipDevJson(chip);
  return (
    <div
      ref={bodyRef}
      className="bonsai-chip-body"
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid rgba(100, 140, 180, 0.28)",
        background: "rgba(14, 22, 32, 0.55)",
        fontSize: 11,
        color: "#dce8f4",
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{chipBodyTitle(chip)}</div>
      {attribution.length > 0 ? (
        <div
          style={{
            marginBottom: 8,
            padding: "6px 8px",
            borderRadius: 6,
            borderLeft: `3px solid ${ATTRIBUTION_ACCENT}`,
            background: ATTRIBUTION_ACCENT_SOFT,
          }}
        >
          {creditsHidden ? (
            <div style={{ fontStyle: "italic", color: "#c9b892" }}>{SPOILER_HIDDEN_CREDITS_TEXT}</div>
          ) : null}
          {creditsHidden ? null : attribution.map((entry) => (
            <div key={`${entry.source}|${entry.license}`} style={{ marginBottom: 2 }}>
              <span style={{ fontWeight: 700, color: ATTRIBUTION_ACCENT }}>{entry.source}</span>
              {entry.license ? (
                <span style={{ fontSize: 10, color: "#c9b892" }}> · {entry.license}</span>
              ) : null}
              {entry.captured ? (
                <span style={{ fontSize: 10, color: "#c9b892" }}> · as of {entry.captured}</span>
              ) : null}
              {entry.cards.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                  {entry.cards.map((rawCard, cardIndex) => {
                    const card = creditCardLabel(rawCard, creditsView);
                    return (
                    <span
                      key={`${cardIndex}|${card}`}
                      title={card}
                      style={{
                        display: "inline-block",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 9,
                        padding: "1px 6px",
                        borderRadius: 999,
                        border: "1px solid rgba(214, 174, 116, 0.4)",
                        color: "#9fb7d5",
                      }}
                    >
                      {card}
                    </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {paths.map((p) => (
        <div key={p} style={{ fontSize: 10, color: "#9fb7d5", wordBreak: "break-all", marginBottom: 4 }}>
          {p}
        </div>
      ))}
      {bullets.length > 0 ? (
        <ul style={{ margin: "4px 0 0", paddingLeft: "1.1em" }}>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {devJson != null ? (
        <pre
          style={{
            marginTop: 8,
            fontSize: 9,
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.25)",
            padding: 6,
            borderRadius: 4,
          }}
        >
          {JSON.stringify(devJson, null, 2)}
        </pre>
      ) : null}
      {devDiagnostics != null ? (
        <>
          {/* Formerly a separate "Show diagnostics" button next to Show details (roadmap: "Fold
              Show diagnostics into Show details") — same raw ask_diagnostics dump, same gate on
              desktop verbose logging, now reached by opening this chip instead of a second button. */}
          <div style={{ fontWeight: 700, marginTop: 10, marginBottom: 6 }}>Ask diagnostics</div>
          <pre
            style={{
              fontSize: 9,
              maxHeight: 200,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "rgba(0,0,0,0.25)",
              padding: 6,
              borderRadius: 4,
            }}
          >
            {JSON.stringify(devDiagnostics, null, 2)}
          </pre>
        </>
      ) : null}
    </div>
  );
}
