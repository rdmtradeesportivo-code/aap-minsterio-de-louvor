import Link from "next/link";
import { ChevronUp, ChevronDown, X, ListMusic } from "lucide-react";
import {
  addSongToService,
  moveServiceSong,
  removeSongFromService,
} from "@/lib/actions/services";
import { COMMON_KEYS } from "@/lib/chords";
import type { ServiceSong, Song } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function RoteiroSection({
  serviceId,
  serviceSongs,
  availableSongs,
  manage,
}: {
  serviceId: string;
  serviceSongs: ServiceSong[];
  availableSongs: Song[];
  manage: boolean;
}) {
  const usedSongIds = new Set(serviceSongs.map((s) => s.song_id));
  const remainingSongs = availableSongs.filter((s) => !usedSongIds.has(s.id));

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Roteiro</h2>

      {serviceSongs.length === 0 ? (
        <EmptyState icon={ListMusic} title="Nenhuma música no roteiro ainda" />
      ) : (
        <Card className="divide-y divide-slate-100">
          <ol>
            {serviceSongs.map((item, index) => (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-600">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <Link
                    href={`/dashboard/repertorio/${item.song_id}`}
                    className="font-medium text-slate-900 hover:text-violet-700"
                  >
                    {item.song?.title ?? "Música removida"}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Tom: {item.key_override || item.song?.default_key || "—"}
                  </p>
                </div>
                {manage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={moveServiceSong.bind(null, serviceId, item.id, "up")}>
                      <button
                        type="submit"
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        aria-label="Mover para cima"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={moveServiceSong.bind(null, serviceId, item.id, "down")}>
                      <button
                        type="submit"
                        disabled={index === serviceSongs.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        aria-label="Mover para baixo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={removeSongFromService.bind(null, item.id, serviceId)}>
                      <button
                        type="submit"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {manage && remainingSongs.length > 0 && (
        <Card className="p-4">
          <form action={addSongToService.bind(null, serviceId)} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="song_id">Adicionar música</Label>
              <Select id="song_id" name="song_id" required className="min-w-48">
                {remainingSongs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="key_override">Tom neste culto</Label>
              <Input
                id="key_override"
                name="key_override"
                list="key-options-roteiro"
                placeholder="opcional"
                className="w-28"
              />
              <datalist id="key-options-roteiro">
                {COMMON_KEYS.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        </Card>
      )}
    </section>
  );
}
