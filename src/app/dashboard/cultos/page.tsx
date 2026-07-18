import Link from "next/link";
import { listServices } from "@/lib/data/services";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { SERVICE_TYPE_LABELS } from "@/lib/types";

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
        <h1 className="text-lg font-bold text-slate-900">Cultos e ensaios</h1>
        {canManage(profile.role) && (
          <Link
            href="/dashboard/cultos/novo"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + Novo culto
          </Link>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Próximos
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nenhum culto agendado.
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

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Anteriores
          </h2>
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {past.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/dashboard/cultos/${service.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{service.title}</p>
                    <p className="text-sm text-slate-500">{formatDate(service.service_date)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {SERVICE_TYPE_LABELS[service.type]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
