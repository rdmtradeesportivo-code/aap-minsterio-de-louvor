"use client";

import { useState } from "react";
import { transposeKeyLabel, transposeText } from "@/lib/chords";
import { ChordSheet } from "@/components/chord-sheet";

export function SongTransposer({
  lyricsChords,
  defaultKey,
}: {
  lyricsChords: string;
  defaultKey: string | null;
}) {
  const [semitones, setSemitones] = useState(0);

  const currentKey = defaultKey ? transposeKeyLabel(defaultKey, semitones) : null;
  const transposedText = transposeText(lyricsChords, semitones);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <span className="text-sm font-medium text-slate-700">Tom:</span>
        <button
          type="button"
          onClick={() => setSemitones((s) => s - 1)}
          className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
          aria-label="Diminuir meio tom"
        >
          −
        </button>
        <span className="min-w-14 text-center text-sm font-semibold text-indigo-700">
          {currentKey ?? "—"}
        </span>
        <button
          type="button"
          onClick={() => setSemitones((s) => s + 1)}
          className="h-8 w-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
          aria-label="Aumentar meio tom"
        >
          +
        </button>
        {semitones !== 0 && (
          <button
            type="button"
            onClick={() => setSemitones(0)}
            className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
          >
            Voltar ao tom original {defaultKey ? `(${defaultKey})` : ""}
          </button>
        )}
      </div>
      <ChordSheet text={transposedText} />
    </div>
  );
}
