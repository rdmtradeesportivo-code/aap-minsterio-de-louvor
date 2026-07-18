import { getCurrentProfile } from "@/lib/data/profile";
import { ProfileForm } from "@/components/profile-form";

export default async function MeuPerfilPage() {
  const { profile } = await getCurrentProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-slate-900">Meu perfil</h1>
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
