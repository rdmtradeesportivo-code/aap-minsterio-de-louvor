import { X, UsersRound } from "lucide-react";
import { addTeamMember, removeTeamMember, updateTeamStatus } from "@/lib/actions/services";
import { TEAM_STATUS_LABELS } from "@/lib/types";
import type { Profile, ServiceTeamMember } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_COLOR: Record<string, "green" | "red" | "amber"> = {
  confirmado: "green",
  recusado: "red",
  convidado: "amber",
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
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Escala da equipe
      </h2>

      {team.length === 0 ? (
        <EmptyState icon={UsersRound} title="Ninguém escalado ainda" />
      ) : (
        <Card className="divide-y divide-slate-100">
          {team.map((member) => {
            const isSelf = member.profile_id === currentUserId;
            const name = member.profile?.full_name || "Sem nome";
            return (
              <div key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Avatar name={name} className="h-8 w-8" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{member.role}</p>
                </div>

                <Badge color={STATUS_COLOR[member.status] ?? "slate"}>
                  {TEAM_STATUS_LABELS[member.status]}
                </Badge>

                {(isSelf || manage) && (
                  <form
                    action={updateTeamStatus.bind(null, member.id, serviceId)}
                    className="flex items-center gap-1.5"
                  >
                    <Select
                      name="status"
                      defaultValue={member.status}
                      className="w-auto py-1.5 text-xs"
                    >
                      <option value="convidado">Convidado</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="recusado">Recusado</option>
                    </Select>
                    <Button type="submit" variant="outline" size="sm">
                      OK
                    </Button>
                  </form>
                )}

                {manage && (
                  <form action={removeTeamMember.bind(null, member.id, serviceId)}>
                    <button
                      type="submit"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remover da escala"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {manage && (
        <Card className="p-4">
          <form action={addTeamMember.bind(null, serviceId)} className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="profile_id">Membro</Label>
              <Select id="profile_id" name="profile_id" required className="min-w-40">
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || "Sem nome"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Função</Label>
              <Input id="role" name="role" required placeholder="Ex: Vocal, Violão, Bateria" />
            </div>
            <Button type="submit">Escalar</Button>
          </form>
        </Card>
      )}
    </section>
  );
}
