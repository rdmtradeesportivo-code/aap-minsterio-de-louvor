import { buildChordRow, parseChordProLine } from "@/lib/chords";

export function ChordSheet({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="overflow-hidden rounded-2xl bg-[#1a1625] shadow-lg shadow-violet-950/10 ring-1 ring-white/5">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
      </div>
      <div className="overflow-x-auto p-5">
        <pre className="whitespace-pre font-mono text-sm leading-relaxed text-slate-200">
          {lines.map((line, i) => {
            const { lyric, chordPositions } = parseChordProLine(line);
            const chordRow = chordPositions.length > 0 ? buildChordRow(chordPositions) : null;

            return (
              <div key={i}>
                {chordRow && <div className="font-semibold text-violet-300">{chordRow}</div>}
                <div>{lyric.length > 0 ? lyric : " "}</div>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
