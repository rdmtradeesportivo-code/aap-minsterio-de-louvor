import { redirect } from "next/navigation";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { createSong } from "@/lib/actions/songs";
import { SongForm } from "@/components/song-form";
import { Card } from "@/components/ui/card";

export default async function NovaMusicaPage() {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    redirect("/dashboard/repertorio");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nova música</h1>
      <Card className="p-6">
        <SongForm action={createSong} submitLabel="Salvar música" />
      </Card>
    </div>
  );
}
