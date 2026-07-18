import { redirect } from "next/navigation";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import { createService } from "@/lib/actions/services";
import { ServiceForm } from "@/components/service-form";

export default async function NovoCultoPage() {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    redirect("/dashboard/cultos");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">Novo culto</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <ServiceForm action={createService} submitLabel="Criar culto" />
      </div>
    </div>
  );
}
