import { redirect } from "next/navigation";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { createSong } from "@/lib/actions/songs";
import { SongForm } from "@/components/song-form";

export default async function NovaMusicaPage() {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    redirect("/dashboard/repertorio");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">Nova música</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <SongForm action={createSong} submitLabel="Salvar música" />
      </div>
    </div>
  );
}
