import Link from "next/link";
import { listUpcomingServices } from "@/lib/data/services";
import { getCurrentProfile } from "@/lib/data/profile";
import { SERVICE_TYPE_LABELS } from "@/lib/types";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default async function DashboardHomePage() {
  const [{ profile }, upcoming] = await Promise.all([
    getCurrentProfile(),
    listUpcomingServices(5),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Olá, {profile.full_name?.split(" ")[0] || "!"}
        </h1>
        <p className="text-sm text-slate-500">Bem-vindo(a) ao app do ministério de louvor.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/repertorio"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-900">🎼 Repertório</p>
          <p className="mt-1 text-xs text-slate-500">Músicas, cifras e letras</p>
        </Link>
        <Link
          href="/dashboard/cultos"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-900">📅 Cultos</p>
          <p className="mt-1 text-xs text-slate-500">Roteiros e escalas</p>
        </Link>
        <Link
          href="/dashboard/equipe"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm"
        >
          <p className="text-sm font-semibold text-slate-900">👥 Equipe</p>
          <p className="mt-1 text-xs text-slate-500">Membros do ministério</p>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Próximos cultos
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum culto agendado. {" "}
            <Link href="/dashboard/cultos/novo" className="text-indigo-600 hover:underline">
              Criar um agora
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {upcoming.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/dashboard/cultos/${service.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{service.title}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(service.service_date)}
                      {service.service_time ? ` · ${service.service_time.slice(0, 5)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {SERVICE_TYPE_LABELS[service.type]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
