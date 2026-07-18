import Link from "next/link";
import { listSongs } from "@/lib/data/songs";
import { getCurrentProfile, canManage } from "@/lib/data/profile";

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
          <h1 className="text-lg font-bold text-slate-900">Repertório</h1>
          <p className="text-sm text-slate-500">{songs.length} música(s)</p>
        </div>
        {canManage(profile.role) && (
          <Link
            href="/dashboard/repertorio/nova"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + Nova música
          </Link>
        )}
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por título ou artista..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Buscar
        </button>
      </form>

      {songs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Nenhuma música encontrada.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/dashboard/repertorio/${song.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{song.title}</p>
                  <p className="text-sm text-slate-500">{song.artist || "—"}</p>
                </div>
                {song.default_key && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    Tom {song.default_key}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
