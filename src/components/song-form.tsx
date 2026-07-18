"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { COMMON_KEYS } from "@/lib/chords";
import type { Song } from "@/lib/types";
import type { SongFormState } from "@/lib/actions/songs";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
          <Label htmlFor="title">Título *</Label>
          <Input id="title" name="title" defaultValue={song?.title} required />
        </div>

        <div>
          <Label htmlFor="artist">Artista / Compositor</Label>
          <Input id="artist" name="artist" defaultValue={song?.artist ?? ""} />
        </div>

        <div>
          <Label htmlFor="default_key">Tom original</Label>
          <Input
            id="default_key"
            name="default_key"
            list="key-options"
            defaultValue={song?.default_key ?? ""}
            placeholder="Ex: G, Am, D#"
          />
          <datalist id="key-options">
            {COMMON_KEYS.map((key) => (
              <option key={key} value={key} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor="bpm">BPM</Label>
          <Input id="bpm" name="bpm" type="number" min={0} max={400} defaultValue={song?.bpm ?? ""} />
        </div>

        <div>
          <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            name="tags"
            defaultValue={song?.tags?.join(", ") ?? ""}
            placeholder="Ex: adoração, ceia, rápida"
          />
        </div>

        <div>
          <Label htmlFor="youtube_url">Link do YouTube</Label>
          <Input id="youtube_url" name="youtube_url" type="url" defaultValue={song?.youtube_url ?? ""} />
        </div>

        <div>
          <Label htmlFor="spotify_url">Link do Spotify</Label>
          <Input id="spotify_url" name="spotify_url" type="url" defaultValue={song?.spotify_url ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="lyrics_chords">Letra com cifra</Label>
        <p className="mb-2 text-xs text-slate-500">
          Escreva os acordes entre colchetes junto da letra. Ex:{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-violet-700">
            Ao [G]Senhor eu vou [D]louvar
          </code>
        </p>
        <Textarea
          id="lyrics_chords"
          name="lyrics_chords"
          rows={16}
          defaultValue={song?.lyrics_chords ?? ""}
          className="font-mono"
        />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
