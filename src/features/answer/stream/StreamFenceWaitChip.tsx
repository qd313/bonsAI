/**
 * Title: "Still writing…" chip
 *
 * Purpose: A small pulsing status chip shown while an answer is still
 * arriving and the AI is in the middle of something that should not be
 * shown half-finished — a code block that has not been closed yet, or a
 * spoiler-hidden section. Without this chip, a code block still being
 * written would flicker as it grows; this chip stands in its place until
 * the block is finished.
 *
 * Used for: The chat transcript, only while an answer is still streaming
 * in.
 *
 * Solves: Gives a visible sign that the AI is still working, for the two
 * moments where showing the raw, unfinished text underneath would look
 * broken or give away a spoiler early.
 *
 * Does not: Read the markdown itself, decide when a code block or spoiler
 * has actually finished, or track anything about the ongoing reply — the
 * caller decides when to show this chip and when to swap it for the real
 * content.
 */
export type StreamFenceWaitChipProps = {
  label: string;
  kind: "fence" | "spoiler";
  pulseBubble?: boolean;
};

/**
 * Pulse + spinner while a code fence is open (F2). Spoiler variant uses mask copy only (S1).
 */
export function StreamFenceWaitChip(props: StreamFenceWaitChipProps) {
  const { label, kind } = props;
  const isFence = kind === "fence";

  return (
    <div
      className={`bonsai-stream-fence-wait${isFence ? " bonsai-stream-fence-wait--code" : " bonsai-stream-fence-wait--spoiler"}`}
      data-bonsai-stream-wait={kind}
      role="status"
    >
      {isFence ? <span className="bonsai-stream-fence-wait-spin" aria-hidden /> : null}
      <span className="bonsai-stream-fence-wait-label">{label}</span>
    </div>
  );
}
