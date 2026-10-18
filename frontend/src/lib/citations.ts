/**
 * Inline citation markers. The backend validates every citation and rewrites
 * the survivors canonically as `[S1]`, `[S2]`...; each handle matches the
 * `handle` of one entry in the answer's `sources`.
 */
export type Segment = { kind: "text"; text: string } | { kind: "cite"; handle: string };

const MARKER = /\[(S\d+)\]/g;

/** Split answer text into plain text and citation markers, in order. */
export function splitCitations(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    out.push({ kind: "cite", handle: m[1] });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The number shown for a handle: "S3" -> "3". */
export function handleNumber(handle: string): string {
  return handle.replace(/^S/, "");
}

/** A DOM id for a source, unique per answer thanks to `prefix`. */
export function sourceAnchor(prefix: string, handle: string): string {
  return `${prefix}-src-${handle}`;
}

/** Preserve ambiguity: callers may resolve a handle only with one matching source. */
export function indexSources<T extends { handle?: string | null; chunk_id: string }>(sources: readonly T[]): Map<string, T[]> {
  const lookup = new Map<string, T[]>();
  for (const source of sources) if (source.handle && source.chunk_id !== 'none') {
    const matches = lookup.get(source.handle) ?? [];
    matches.push(source); lookup.set(source.handle, matches);
  }
  return lookup;
}

/** Annotate literal claim text without changing the existing citation parser. */
export function unsupportedSegments(text: string, claims?: readonly { text: string; supported?: boolean }[]) {
  const ranges: { start: number; end: number }[] = [];
  for (const claim of claims ?? []) {
    if (claim.supported !== false || !claim.text) continue;
    const start = text.indexOf(claim.text);
    // Repeated text is ambiguous; the separate unsupported-claim list still explains it.
    if (start >= 0 && text.indexOf(claim.text, start + claim.text.length) < 0) ranges.push({ start, end: start + claim.text.length });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: { text: string; unsupported: boolean }[] = [];
  let end = 0;
  for (const range of ranges) {
    if (range.start < end) continue;
    if (range.start > end) out.push({ text: text.slice(end, range.start), unsupported: false });
    out.push({ text: text.slice(range.start, range.end), unsupported: true }); end = range.end;
  }
  if (end < text.length) out.push({ text: text.slice(end), unsupported: false });
  return out;
}
