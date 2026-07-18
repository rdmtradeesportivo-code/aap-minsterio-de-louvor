// Utilitário para cifras no formato ChordPro-lite: acordes entre colchetes
// inline com a letra, ex.: "Ao [G]Senhor eu vou [D]louvar".

const SHARP_NOTES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];
const FLAT_NOTES = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
];

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, Db: 1,
  D: 2,
  "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5,
  "F#": 6, Gb: 6,
  G: 7,
  "G#": 8, Ab: 8,
  A: 9,
  "A#": 10, Bb: 10,
  B: 11, Cb: 11,
};

export const COMMON_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
];

function transposeNote(note: string, semitones: number, preferFlat: boolean): string {
  const idx = NOTE_TO_INDEX[note];
  if (idx === undefined) return note;
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  return preferFlat ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
}

function transposeChordPart(part: string, semitones: number, bassOnly = false): string {
  const match = part.match(/^([A-G])([#b]?)(.*)$/);
  if (!match) return part;
  const [, letter, accidental, suffix] = match;
  const note = letter + accidental;
  const preferFlat = accidental === "b";
  const transposedNote = transposeNote(note, semitones, preferFlat);
  return bassOnly ? transposedNote : transposedNote + suffix;
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const trimmed = chord.trim();
  const [main, bass] = trimmed.split("/");
  const transposedMain = transposeChordPart(main, semitones);
  if (bass) {
    return `${transposedMain}/${transposeChordPart(bass, semitones, true)}`;
  }
  return transposedMain;
}

/** Transpõe todos os acordes [Entre Colchetes] de um texto ChordPro-lite. */
export function transposeText(text: string, semitones: number): string {
  if (semitones === 0) return text;
  return text.replace(/\[([^\]]+)\]/g, (_, chord: string) => `[${transposeChord(chord, semitones)}]`);
}

function keyRootIndex(key: string): number | null {
  const match = key.trim().match(/^([A-G])([#b]?)/);
  if (!match) return null;
  return NOTE_TO_INDEX[match[1] + match[2]] ?? null;
}

/** Diferença em semitons necessária para ir de `fromKey` até `toKey`. */
export function semitoneDiff(fromKey: string, toKey: string): number {
  const from = keyRootIndex(fromKey);
  const to = keyRootIndex(toKey);
  if (from === null || to === null) return 0;
  return to - from;
}

export function transposeKeyLabel(key: string, semitones: number): string {
  if (!key) return key;
  const match = key.trim().match(/^([A-G])([#b]?)(.*)$/);
  if (!match) return key;
  const [, letter, accidental, suffix] = match;
  const note = letter + accidental;
  const preferFlat = accidental === "b";
  return transposeNote(note, semitones, preferFlat) + suffix;
}

export interface ChordProLine {
  lyric: string;
  chordPositions: { pos: number; chord: string }[];
}

/** Faz o parse de uma linha ChordPro-lite em letra + posições de acorde. */
export function parseChordProLine(line: string): ChordProLine {
  const chordRegex = /\[([^\]]+)\]/g;
  let lyric = "";
  const chordPositions: { pos: number; chord: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = chordRegex.exec(line)) !== null) {
    lyric += line.slice(lastIndex, match.index);
    chordPositions.push({ pos: lyric.length, chord: match[1] });
    lastIndex = chordRegex.lastIndex;
  }
  lyric += line.slice(lastIndex);

  return { lyric, chordPositions };
}

/** Monta a linha de acordes alinhada por posição de caractere sobre a letra. */
export function buildChordRow(chordPositions: { pos: number; chord: string }[]): string {
  let row = "";
  for (const { pos, chord } of chordPositions) {
    if (row.length < pos) {
      row += " ".repeat(pos - row.length);
    } else if (row.length > pos) {
      row += " ";
    }
    row += chord;
  }
  return row;
}
