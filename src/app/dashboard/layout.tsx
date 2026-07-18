import { Music4, LogOut } from "lucide-react";
import { getCurrentProfile } from "@/lib/data/profile";
import { logout } from "@/lib/actions/auth";
import { NavLinks } from "@/components/nav-links";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/types";

const ROLE_COLOR = {
  admin: "violet",
  lider: "amber",
  membro: "slate",
} as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Music4 className="h-4 w-4 text-white" strokeWidth={2.25} />
            </div>
            <span className="hidden text-sm font-bold text-slate-900 sm:inline">
              Ministério de Louvor
            </span>
          </div>

          <NavLinks />

          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={profile.full_name || "?"} className="h-8 w-8" />
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800">
                  {profile.full_name || "Sem nome"}
                </p>
                <Badge color={ROLE_COLOR[profile.role]} className="mt-0.5 px-1.5 py-0 text-[10px]">
                  {ROLE_LABELS[profile.role]}
                </Badge>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Sair"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
