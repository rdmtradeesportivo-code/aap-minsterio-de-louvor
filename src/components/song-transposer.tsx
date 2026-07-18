"use client";

import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
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
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <span className="pl-1 text-sm font-medium text-slate-600">Tom:</span>
        <button
          type="button"
          onClick={() => setSemitones((s) => s - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:scale-95"
          aria-label="Diminuir meio tom"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-14 text-center text-base font-bold text-violet-700">
          {currentKey ?? "—"}
        </span>
        <button
          type="button"
          onClick={() => setSemitones((s) => s + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:scale-95"
          aria-label="Aumentar meio tom"
        >
          <Plus className="h-4 w-4" />
        </button>
        {semitones !== 0 && (
          <button
            type="button"
            onClick={() => setSemitones(0)}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Tom original {defaultKey ? `(${defaultKey})` : ""}
          </button>
        )}
      </div>
      <ChordSheet text={transposedText} />
    </div>
  );
}
