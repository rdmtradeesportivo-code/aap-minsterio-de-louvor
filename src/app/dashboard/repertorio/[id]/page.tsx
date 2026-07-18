import Link from "next/link";
import { notFound } from "next/navigation";
import { getSong } from "@/lib/data/songs";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { deleteSong } from "@/lib/actions/songs";
import { SongTransposer } from "@/components/song-transposer";
import { DeleteButton } from "@/components/delete-button";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [song, { profile }] = await Promise.all([getSong(id), getCurrentProfile()]);

  if (!song) {
    notFound();
  }

  const manage = canManage(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{song.title}</h1>
          <p className="text-sm text-slate-500">{song.artist || "Artista não informado"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {song.bpm && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {song.bpm} BPM
              </span>
            )}
            {song.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {tag}
              </span>
            ))}
          </div>
          {(song.youtube_url || song.spotify_url) && (
            <div className="mt-2 flex gap-3 text-sm">
              {song.youtube_url && (
                <a href={song.youtube_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  YouTube ↗
                </a>
              )}
              {song.spotify_url && (
                <a href={song.spotify_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  Spotify ↗
                </a>
              )}
            </div>
          )}
        </div>

        {manage && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/repertorio/${song.id}/editar`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Editar
            </Link>
            <DeleteButton
              action={deleteSong.bind(null, song.id)}
              confirmMessage={`Excluir "${song.title}" do repertório?`}
            />
          </div>
        )}
      </div>

      {song.lyrics_chords ? (
        <SongTransposer lyricsChords={song.lyrics_chords} defaultKey={song.default_key} />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Letra e cifra ainda não cadastradas.
        </p>
      )}
    </div>
  );
}
