import { type ReactNode } from "react";
import { CitedText, type CitedSource } from "../answer/Citations";

export function FormattedAnswer({
  text,
  cite,
}: {
  text: string;
  /** When set, `[S#]` markers become superscript links to these sources. */
  cite?: { anchorPrefix: string; sources: CitedSource[] };
}) {
  const plain = (str: string, key: string): ReactNode =>
    cite ? <CitedText key={key} text={str} anchorPrefix={cite.anchorPrefix} sources={cite.sources} /> : str;

  const renderInline = (str: string): ReactNode => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    // Match **bold**, *italic*, and `code`
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        parts.push(plain(str.substring(lastIndex, match.index), `t-${lastIndex}`));
      }

      if (match[1]) {
        parts.push(
          <strong key={`b-${match.index}`} className="font-semibold text-zinc-100">
            {match[1]}
          </strong>
        );
      } else if (match[2]) {
        parts.push(
          <em key={`i-${match.index}`} className="italic text-zinc-200">
            {match[2]}
          </em>
        );
      } else if (match[3]) {
        parts.push(
          <code
            key={`c-${match.index}`}
            className="bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-amber-300"
          >
            {match[3]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      parts.push(plain(str.substring(lastIndex), `t-${lastIndex}`));
    }

    return parts.length > 0 ? parts : plain(str, "t");
  };

  const lines = text.split("\n");
  const elements = [];
  let inList = false;
  let tableLines: string[] = [];

  const flushTable = () => {
    if (tableLines.length > 0) {
      const rows = tableLines.map(l => l.split("|").map(c => c.trim()).filter(c => c));
      if (rows.length > 1) {
        elements.push(
          <table key={`table-${elements.length}`} className="text-xs border-collapse border border-zinc-600 my-2">
            <thead>
              <tr className="bg-zinc-800">
                {rows[0].map((cell, i) => (
                  <th key={i} className="border border-zinc-600 px-2 py-1 text-zinc-200 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(2).map((row, ri) => (
                <tr key={ri} className="hover:bg-zinc-800/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-zinc-600 px-2 py-1 text-zinc-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      tableLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushTable();
      elements.push(<div key={`br-${i}`} className="h-2" />);
      inList = false;
      continue;
    }

    if (trimmed.startsWith("|")) {
      inList = false;
      tableLines.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    if (trimmed.startsWith("##")) {
      inList = false;
      const heading = trimmed.replace(/^##\s*/, "");
      elements.push(
        <h3 key={`h3-${i}`} className="text-zinc-200 font-semibold text-sm mt-3 mb-2">
          {renderInline(heading)}
        </h3>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        inList = true;
      }
      const item = trimmed.substring(2);
      elements.push(
        <li key={`li-${i}`} className="text-zinc-200 text-sm list-disc ml-4 mt-1">
          {renderInline(item)}
        </li>
      );
    } else {
      inList = false;
      elements.push(
        <p key={`p-${i}`} className="text-zinc-200 text-sm">
          {renderInline(trimmed)}
        </p>
      );
    }
  }

  flushTable();
  return <div className="space-y-2">{elements}</div>;
}
