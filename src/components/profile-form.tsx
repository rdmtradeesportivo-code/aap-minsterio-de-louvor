"use client";

import { useActionState } from "react";
import { updateOwnProfile } from "@/lib/actions/profiles";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
          Nome completo
        </label>
        <input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name}
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          Telefone
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
          placeholder="(00) 00000-0000"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="instruments" className="block text-sm font-medium text-slate-700">
          Instrumentos / funções (separados por vírgula)
        </label>
        <input
          id="instruments"
          name="instruments"
          defaultValue={profile.instruments.join(", ")}
          placeholder="Ex: Vocal, Violão"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
