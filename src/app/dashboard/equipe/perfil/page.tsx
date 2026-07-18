import { getCurrentProfile } from "@/lib/data/profile";
import { ProfileForm } from "@/components/profile-form";
import { Card } from "@/components/ui/card";

export default async function MeuPerfilPage() {
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Meu perfil</h1>
      <Card className="max-w-md p-6">
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
