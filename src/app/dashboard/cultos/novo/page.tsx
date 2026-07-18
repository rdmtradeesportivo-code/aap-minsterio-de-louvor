import { redirect } from "next/navigation";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { createService } from "@/lib/actions/services";
import { ServiceForm } from "@/components/service-form";
import { Card } from "@/components/ui/card";

export default async function NovoCultoPage() {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    redirect("/dashboard/cultos");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Novo culto</h1>
      <Card className="p-6">
        <ServiceForm action={createService} submitLabel="Criar culto" />
      </Card>
    </div>
  );
}
