import { notFound, redirect } from "next/navigation";
import { getService } from "@/lib/data/services";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { updateService } from "@/lib/actions/services";
import { ServiceForm } from "@/components/service-form";
import { Card } from "@/components/ui/card";

export default async function EditarCultoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [service, { profile }] = await Promise.all([getService(id), getCurrentProfile()]);

  if (!service) {
    notFound();
  }
  if (!canManage(profile.role)) {
    redirect(`/dashboard/cultos/${id}`);
  }

  const updateServiceWithId = updateService.bind(null, service.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar culto</h1>
      <Card className="p-6">
        <ServiceForm action={updateServiceWithId} service={service} submitLabel="Salvar alterações" />
      </Card>
    </div>
  );
}
