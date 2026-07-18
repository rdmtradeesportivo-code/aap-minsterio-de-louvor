import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, SquarePlay, Music4 } from "lucide-react";
import { getSong } from "@/lib/data/songs";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { deleteSong } from "@/lib/actions/songs";
import { SongTransposer } from "@/components/song-transposer";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{song.title}</h1>
          <p className="text-sm text-slate-500">{song.artist || "Artista não informado"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {song.bpm && <Badge>{song.bpm} BPM</Badge>}
            {song.tags.map((tag) => (
              <Badge key={tag} color="violet">
                {tag}
              </Badge>
            ))}
          </div>
          {(song.youtube_url || song.spotify_url) && (
            <div className="mt-3 flex gap-4 text-sm">
              {song.youtube_url && (
                <a
                  href={song.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-medium text-violet-600 hover:text-violet-700"
                >
                  <SquarePlay className="h-4 w-4" /> YouTube
                </a>
              )}
              {song.spotify_url && (
                <a
                  href={song.spotify_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-medium text-violet-600 hover:text-violet-700"
                >
                  <Music4 className="h-4 w-4" /> Spotify
                </a>
              )}
            </div>
          )}
        </div>

        {manage && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/repertorio/${song.id}/editar`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Pencil className="h-4 w-4" /> Editar
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
        <EmptyState icon={Music4} title="Letra e cifra ainda não cadastradas" />
      )}
    </div>
  );
}
