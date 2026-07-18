"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { updateOwnProfile } from "@/lib/actions/profiles";
import type { Profile } from "@/lib/types";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
      </div>

      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="(00) 00000-0000" />
      </div>

      <div>
        <Label htmlFor="instruments">Instrumentos / funções (separados por vírgula)</Label>
        <Input
          id="instruments"
          name="instruments"
          defaultValue={profile.instruments.join(", ")}
          placeholder="Ex: Vocal, Violão"
        />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
