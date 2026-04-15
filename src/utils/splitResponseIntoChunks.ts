/** Keep responses readable in Decky by splitting dense output into panel-sized chunks. */
export function splitResponseIntoChunks(text: string): string[] {
  const byParagraph = text.split(/\n\n+/).filter((p) => p.trim());
  if (byParagraph.length > 1) return byParagraph;

  const byLine = text.split(/\n/).filter((l) => l.trim());
  if (byLine.length > 1) return byLine;

  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 300) {
    let cut = rest.lastIndexOf(". ", 300);
    if (cut < 100) cut = rest.lastIndexOf(" ", 300);
    if (cut < 100) cut = 300;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest.trim()) chunks.push(rest.trim());
  return chunks.length > 0 ? chunks : [text];
}
