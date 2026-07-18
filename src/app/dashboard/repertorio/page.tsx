import Link from "next/link";
import { Music4, Search, Plus, ChevronRight } from "lucide-react";
import { listSongs } from "@/lib/data/songs";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function RepertorioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [{ profile }, songs] = await Promise.all([
    getCurrentProfile(),
    listSongs(q),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Repertório</h1>
          <p className="text-sm text-slate-500">{songs.length} música(s)</p>
        </div>
        {canManage(profile.role) && (
          <Link href="/dashboard/repertorio/nova" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Nova música
          </Link>
        )}
      </div>

      <form className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título ou artista..."
          className="pl-9"
        />
      </form>

      {songs.length === 0 ? (
        <EmptyState icon={Music4} title="Nenhuma música encontrada" />
      ) : (
        <Card className="divide-y divide-slate-100">
          {songs.map((song) => (
            <Link
              key={song.id}
              href={`/dashboard/repertorio/${song.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-violet-50/40"
            >
              <div>
                <p className="font-semibold text-slate-900">{song.title}</p>
                <p className="text-sm text-slate-500">{song.artist || "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                {song.default_key && <Badge color="violet">Tom {song.default_key}</Badge>}
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
