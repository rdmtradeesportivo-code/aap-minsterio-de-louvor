"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import type { Service } from "@/lib/types";
import type { ServiceFormState } from "@/lib/actions/services";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={service?.title}
          placeholder="Ex: Culto de Domingo à noite"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="service_date">Data *</Label>
          <Input
            id="service_date"
            name="service_date"
            type="date"
            defaultValue={service?.service_date}
            required
          />
        </div>
        <div>
          <Label htmlFor="service_time">Horário</Label>
          <Input
            id="service_time"
            name="service_time"
            type="time"
            defaultValue={service?.service_time ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" name="type" defaultValue={service?.type ?? "culto"}>
            <option value="culto">Culto</option>
            <option value="ensaio">Ensaio</option>
            <option value="evento">Evento</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={service?.notes ?? ""} />
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
