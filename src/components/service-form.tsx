"use client";

import { useActionState } from "react";
import type { Service } from "@/lib/types";
import type { ServiceFormState } from "@/lib/actions/services";

type ServiceAction = (
  state: ServiceFormState,
  formData: FormData
) => Promise<ServiceFormState>;

export function ServiceForm({
  action,
  service,
  submitLabel,
}: {
  action: ServiceAction;
  service?: Service;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700">
          Título *
        </label>
        <input
          id="title"
          name="title"
          defaultValue={service?.title}
          placeholder="Ex: Culto de Domingo à noite"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="service_date" className="block text-sm font-medium text-slate-700">
            Data *
          </label>
          <input
            id="service_date"
            name="service_date"
            type="date"
            defaultValue={service?.service_date}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="service_time" className="block text-sm font-medium text-slate-700">
            Horário
          </label>
          <input
            id="service_time"
            name="service_time"
            type="time"
            defaultValue={service?.service_time ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-700">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue={service?.type ?? "culto"}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="culto">Culto</option>
            <option value="ensaio">Ensaio</option>
            <option value="evento">Evento</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Observações
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={service?.notes ?? ""}
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
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
