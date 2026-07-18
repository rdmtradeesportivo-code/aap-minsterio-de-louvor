import Link from "next/link";
import { Music4, CalendarDays, Users, ChevronRight, PlusCircle } from "lucide-react";
import { listUpcomingServices } from "@/lib/data/services";
import { getCurrentProfile } from "@/lib/data/profile";
import { SERVICE_TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

const QUICK_LINKS = [
  { href: "/dashboard/repertorio", label: "Repertório", description: "Músicas, cifras e letras", icon: Music4 },
  { href: "/dashboard/cultos", label: "Cultos", description: "Roteiros e escalas", icon: CalendarDays },
  { href: "/dashboard/equipe", label: "Equipe", description: "Membros do ministério", icon: Users },
];

export default async function DashboardHomePage() {
  const [{ profile }, upcoming] = await Promise.all([
    getCurrentProfile(),
    listUpcomingServices(5),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Olá, {profile.full_name?.split(" ")[0] || "!"} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">Bem-vindo(a) ao app do ministério de louvor.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card hover className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <link.icon className="h-5 w-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{link.label}</p>
              <p className="mt-1 text-xs text-slate-500">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Próximos cultos
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum culto agendado"
            description="Crie o primeiro culto para montar o roteiro e a escala."
            action={
              <Link href="/dashboard/cultos/novo" className={buttonVariants({ size: "sm" })}>
                <PlusCircle className="h-4 w-4" /> Criar culto
              </Link>
            }
          />
        ) : (
          <Card className="divide-y divide-slate-100">
            {upcoming.map((service) => (
              <Link
                key={service.id}
                href={`/dashboard/cultos/${service.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-violet-50/40"
              >
                <div>
                  <p className="font-semibold text-slate-900">{service.title}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(service.service_date)}
                    {service.service_time ? ` · ${service.service_time.slice(0, 5)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color="violet">{SERVICE_TYPE_LABELS[service.type]}</Badge>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
