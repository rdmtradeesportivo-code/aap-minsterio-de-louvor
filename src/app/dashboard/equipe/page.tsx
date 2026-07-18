import Link from "next/link";
import { listProfiles } from "@/lib/data/profiles";
import { getCurrentProfile } from "@/lib/data/profile";
import { updateProfileRole } from "@/lib/actions/profiles";
import { ROLE_LABELS } from "@/lib/types";

export default async function EquipePage() {
  const [{ profile: me }, members] = await Promise.all([
    getCurrentProfile(),
    listProfiles(),
  ]);

  const isAdmin = me.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-slate-900">Equipe</h1>
        <Link
          href="/dashboard/equipe/perfil"
          className="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Editar meu perfil
        </Link>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{member.full_name || "Sem nome"}</p>
              <p className="text-xs text-slate-500">
                {member.instruments.length > 0 ? member.instruments.join(", ") : "Sem instrumento definido"}
                {member.phone ? ` · ${member.phone}` : ""}
              </p>
            </div>

            {isAdmin && member.id !== me.id ? (
              <form action={updateProfileRole.bind(null, member.id)} className="flex items-center gap-1">
                <select
                  name="role"
                  defaultValue={member.role}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                >
                  <option value="membro">Membro</option>
                  <option value="lider">Líder de louvor</option>
                  <option value="admin">Administrador</option>
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  OK
                </button>
              </form>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {ROLE_LABELS[member.role]}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
