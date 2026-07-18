import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, listServiceSongs, listServiceTeam } from "@/lib/data/services";
import { listSongs } from "@/lib/data/songs";
import { listProfiles } from "@/lib/data/profiles";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { deleteService } from "@/lib/actions/services";
import { SERVICE_TYPE_LABELS } from "@/lib/types";
import { DeleteButton } from "@/components/delete-button";
import { RoteiroSection } from "@/components/roteiro-section";
import { EscalaSection } from "@/components/escala-section";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export default async function CultoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [service, { profile, userId }] = await Promise.all([
    getService(id),
    getCurrentProfile(),
  ]);

  if (!service) {
    notFound();
  }

  const [serviceSongs, team, allSongs, allProfiles] = await Promise.all([
    listServiceSongs(id),
    listServiceTeam(id),
    listSongs(),
    listProfiles(),
  ]);

  const manage = canManage(profile.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {SERVICE_TYPE_LABELS[service.type]}
          </span>
          <h1 className="mt-2 text-xl font-bold text-slate-900">{service.title}</h1>
          <p className="text-sm text-slate-500">
            {formatDate(service.service_date)}
            {service.service_time ? ` · ${service.service_time.slice(0, 5)}` : ""}
          </p>
          {service.notes && <p className="mt-2 max-w-prose text-sm text-slate-600">{service.notes}</p>}
        </div>

        {manage && (
          <div className="flex gap-2">
            <Link
              href={`/dashboard/cultos/${service.id}/editar`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Editar
            </Link>
            <DeleteButton
              action={deleteService.bind(null, service.id)}
              confirmMessage={`Excluir "${service.title}"?`}
            />
          </div>
        )}
      </div>

      <RoteiroSection
        serviceId={service.id}
        serviceSongs={serviceSongs}
        availableSongs={allSongs}
        manage={manage}
      />

      <EscalaSection
        serviceId={service.id}
        team={team}
        allProfiles={allProfiles}
        manage={manage}
        currentUserId={userId}
      />
    </div>
  );
}
