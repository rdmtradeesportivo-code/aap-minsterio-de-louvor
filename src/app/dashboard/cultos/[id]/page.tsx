import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getService, listServiceSongs, listServiceTeam } from "@/lib/data/services";
import { listSongs } from "@/lib/data/songs";
import { listProfiles } from "@/lib/data/profiles";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { deleteService } from "@/lib/actions/services";
import { SERVICE_TYPE_LABELS } from "@/lib/types";
import { DeleteButton } from "@/components/delete-button";
import { RoteiroSection } from "@/components/roteiro-section";
import { EscalaSection } from "@/components/escala-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

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
          <Badge color="violet">{SERVICE_TYPE_LABELS[service.type]}</Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{service.title}</h1>
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
              className={buttonVariants({ variant: "secondary" })}
            >
              <Pencil className="h-4 w-4" /> Editar
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
