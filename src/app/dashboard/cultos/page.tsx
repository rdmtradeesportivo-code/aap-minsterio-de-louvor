import Link from "next/link";
import { CalendarDays, Plus, ChevronRight } from "lucide-react";
import { listServices } from "@/lib/data/services";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { SERVICE_TYPE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default async function CultosPage() {
  const [{ profile }, services] = await Promise.all([
    getCurrentProfile(),
    listServices(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = services.filter((s) => s.service_date >= today).reverse();
  const past = services.filter((s) => s.service_date < today);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cultos e ensaios</h1>
        {canManage(profile.role) && (
          <Link href="/dashboard/cultos/novo" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Novo culto
          </Link>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Próximos</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhum culto agendado" />
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

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Anteriores</h2>
          <Card className="divide-y divide-slate-100">
            {past.map((service) => (
              <Link
                key={service.id}
                href={`/dashboard/cultos/${service.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-violet-50/40"
              >
                <div>
                  <p className="font-semibold text-slate-900">{service.title}</p>
                  <p className="text-sm text-slate-500">{formatDate(service.service_date)}</p>
                </div>
                <Badge>{SERVICE_TYPE_LABELS[service.type]}</Badge>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
