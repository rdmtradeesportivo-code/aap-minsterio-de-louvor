import { getCurrentProfile } from "@/lib/data/profile";
import { logout } from "@/lib/actions/auth";
import { NavLinks } from "@/components/nav-links";
import { ROLE_LABELS } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                🎵 Ministério de Louvor
              </p>
              <p className="text-xs text-slate-500">
                {profile.full_name || "Sem nome"} ·{" "}
                <span className="font-medium">{ROLE_LABELS[profile.role]}</span>
              </p>
            </div>
            <form action={logout} className="sm:hidden">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Sair
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <NavLinks />
            <form action={logout} className="hidden sm:block">
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
