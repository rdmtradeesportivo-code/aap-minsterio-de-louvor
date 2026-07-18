import Link from "next/link";
import { UserCog } from "lucide-react";
import { listProfiles } from "@/lib/data/profiles";
import { getCurrentProfile } from "@/lib/data/profile";
import { updateProfileRole } from "@/lib/actions/profiles";
import { ROLE_LABELS } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";

const ROLE_COLOR = {
  admin: "violet",
  lider: "amber",
  membro: "slate",
} as const;

export default async function EquipePage() {
  const [{ profile: me }, members] = await Promise.all([
    getCurrentProfile(),
    listProfiles(),
  ]);

  const isAdmin = me.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Equipe</h1>
        <Link href="/dashboard/equipe/perfil" className={buttonVariants({ variant: "secondary" })}>
          <UserCog className="h-4 w-4" /> Editar meu perfil
        </Link>
      </div>

      <Card className="divide-y divide-slate-100">
        {members.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Avatar name={member.full_name || "?"} className="h-9 w-9 text-sm" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900">{member.full_name || "Sem nome"}</p>
              <p className="text-xs text-slate-500">
                {member.instruments.length > 0 ? member.instruments.join(", ") : "Sem instrumento definido"}
                {member.phone ? ` · ${member.phone}` : ""}
              </p>
            </div>

            {isAdmin && member.id !== me.id ? (
              <form action={updateProfileRole.bind(null, member.id)} className="flex items-center gap-1.5">
                <Select name="role" defaultValue={member.role} className="w-auto py-1.5 text-xs">
                  <option value="membro">Membro</option>
                  <option value="lider">Líder de louvor</option>
                  <option value="admin">Administrador</option>
                </Select>
                <Button type="submit" variant="outline" size="sm">
                  OK
                </Button>
              </form>
            ) : (
              <Badge color={ROLE_COLOR[member.role]}>{ROLE_LABELS[member.role]}</Badge>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
