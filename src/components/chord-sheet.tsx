import { buildChordRow, parseChordProLine } from "@/lib/chords";

export function ChordSheet({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-sm leading-relaxed text-slate-100">
      <pre className="whitespace-pre">
        {lines.map((line, i) => {
          const { lyric, chordPositions } = parseChordProLine(line);
          const chordRow = chordPositions.length > 0 ? buildChordRow(chordPositions) : null;

          return (
            <div key={i}>
              {chordRow && <div className="text-indigo-400">{chordRow}</div>}
              <div>{lyric.length > 0 ? lyric : " "}</div>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
