"use client";

import { useActionState } from "react";
import { COMMON_KEYS } from "@/lib/chords";
import type { Song } from "@/lib/types";
import type { SongFormState } from "@/lib/actions/songs";

type SongAction = (
  state: SongFormState,
  formData: FormData
) => Promise<SongFormState>;

export function SongForm({
  action,
  song,
  submitLabel,
}: {
  action: SongAction;
  song?: Song;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Título *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={song?.title}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="artist" className="block text-sm font-medium text-slate-700">
            Artista / Compositor
          </label>
          <input
            id="artist"
            name="artist"
            defaultValue={song?.artist ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="default_key" className="block text-sm font-medium text-slate-700">
            Tom original
          </label>
          <input
            id="default_key"
            name="default_key"
            list="key-options"
            defaultValue={song?.default_key ?? ""}
            placeholder="Ex: G, Am, D#"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <datalist id="key-options">
            {COMMON_KEYS.map((key) => (
              <option key={key} value={key} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="bpm" className="block text-sm font-medium text-slate-700">
            BPM
          </label>
          <input
            id="bpm"
            name="bpm"
            type="number"
            min={0}
            max={400}
            defaultValue={song?.bpm ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-slate-700">
            Tags (separadas por vírgula)
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={song?.tags?.join(", ") ?? ""}
            placeholder="Ex: adoração, ceia, rápida"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="youtube_url" className="block text-sm font-medium text-slate-700">
            Link do YouTube
          </label>
          <input
            id="youtube_url"
            name="youtube_url"
            type="url"
            defaultValue={song?.youtube_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="spotify_url" className="block text-sm font-medium text-slate-700">
            Link do Spotify
          </label>
          <input
            id="spotify_url"
            name="spotify_url"
            type="url"
            defaultValue={song?.spotify_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="lyrics_chords" className="block text-sm font-medium text-slate-700">
          Letra com cifra
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Escreva os acordes entre colchetes junto da letra. Ex:{" "}
          <code className="rounded bg-slate-100 px-1">
            Ao [G]Senhor eu vou [D]louvar
          </code>
        </p>
        <textarea
          id="lyrics_chords"
          name="lyrics_chords"
          rows={16}
          defaultValue={song?.lyrics_chords ?? ""}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
