import Link from "next/link";
import {
  addSongToService,
  moveServiceSong,
  removeSongFromService,
} from "@/lib/actions/services";
import { COMMON_KEYS } from "@/lib/chords";
import type { ServiceSong, Song } from "@/lib/types";

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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Roteiro</h2>

      {serviceSongs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Nenhuma música no roteiro ainda.
        </p>
      ) : (
        <ol className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {serviceSongs.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 shrink-0 text-sm font-semibold text-slate-400">
                {index + 1}
              </span>
              <div className="flex-1">
                <Link
                  href={`/dashboard/repertorio/${item.song_id}`}
                  className="font-medium text-slate-900 hover:text-indigo-600"
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
                      className="h-7 w-7 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Mover para cima"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={moveServiceSong.bind(null, serviceId, item.id, "down")}>
                    <button
                      type="submit"
                      disabled={index === serviceSongs.length - 1}
                      className="h-7 w-7 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label="Mover para baixo"
                    >
                      ↓
                    </button>
                  </form>
                  <form action={removeSongFromService.bind(null, item.id, serviceId)}>
                    <button
                      type="submit"
                      className="h-7 w-7 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50"
                      aria-label="Remover"
                    >
                      ×
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {manage && remainingSongs.length > 0 && (
        <form
          action={addSongToService.bind(null, serviceId)}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
        >
          <div>
            <label htmlFor="song_id" className="block text-xs font-medium text-slate-600">
              Adicionar música
            </label>
            <select
              id="song_id"
              name="song_id"
              required
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {remainingSongs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="key_override" className="block text-xs font-medium text-slate-600">
              Tom neste culto
            </label>
            <input
              id="key_override"
              name="key_override"
              list="key-options-roteiro"
              placeholder="opcional"
              className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <datalist id="key-options-roteiro">
              {COMMON_KEYS.map((key) => (
                <option key={key} value={key} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Adicionar
          </button>
        </form>
      )}
    </section>
  );
}
