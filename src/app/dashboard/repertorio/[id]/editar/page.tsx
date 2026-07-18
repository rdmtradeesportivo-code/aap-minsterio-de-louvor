import { notFound, redirect } from "next/navigation";
import { getSong } from "@/lib/data/songs";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { updateSong } from "@/lib/actions/songs";
import { SongForm } from "@/components/song-form";

export default async function EditarMusicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [song, { profile }] = await Promise.all([getSong(id), getCurrentProfile()]);

  if (!song) {
    notFound();
  }
  if (!canManage(profile.role)) {
    redirect(`/dashboard/repertorio/${id}`);
  }

  const updateSongWithId = updateSong.bind(null, song.id);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">Editar música</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SongForm action={updateSongWithId} song={song} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
