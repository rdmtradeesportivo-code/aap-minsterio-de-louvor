import { addTeamMember, removeTeamMember, updateTeamStatus } from "@/lib/actions/services";
import { TEAM_STATUS_LABELS } from "@/lib/types";
import type { Profile, ServiceTeamMember } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  confirmado: "bg-green-50 text-green-700",
  recusado: "bg-red-50 text-red-700",
  convidado: "bg-amber-50 text-amber-700",
};

export function EscalaSection({
  serviceId,
  team,
  allProfiles,
  manage,
  currentUserId,
}: {
  serviceId: string;
  team: ServiceTeamMember[];
  allProfiles: Profile[];
  manage: boolean;
  currentUserId: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Escala da equipe
      </h2>

      {team.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Ninguém escalado ainda.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {team.map((member) => {
            const isSelf = member.profile_id === currentUserId;
            return (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {member.profile?.full_name || "Sem nome"}
                  </p>
                  <p className="text-xs text-slate-500">{member.role}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[member.status]}`}
                >
                  {TEAM_STATUS_LABELS[member.status]}
                </span>

                {(isSelf || manage) && (
                  <form
                    action={updateTeamStatus.bind(null, member.id, serviceId)}
                    className="flex items-center gap-1"
                  >
                    <select
                      name="status"
                      defaultValue={member.status}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="convidado">Convidado</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="recusado">Recusado</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      OK
                    </button>
                  </form>
                )}

                {manage && (
                  <form action={removeTeamMember.bind(null, member.id, serviceId)}>
                    <button
                      type="submit"
                      className="h-7 w-7 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50"
                      aria-label="Remover da escala"
                    >
                      ×
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {manage && (
        <form
          action={addTeamMember.bind(null, serviceId)}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
        >
          <div>
            <label htmlFor="profile_id" className="block text-xs font-medium text-slate-600">
              Membro
            </label>
            <select
              id="profile_id"
              name="profile_id"
              required
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || "Sem nome"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="role" className="block text-xs font-medium text-slate-600">
              Função
            </label>
            <input
              id="role"
              name="role"
              required
              placeholder="Ex: Vocal, Violão, Bateria"
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Escalar
          </button>
        </form>
      )}
    </section>
  );
}
