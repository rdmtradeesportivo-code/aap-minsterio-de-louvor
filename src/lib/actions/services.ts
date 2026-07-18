"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManage } from "@/lib/data/profile";
import type { ServiceType, TeamStatus } from "@/lib/types";

export interface ServiceFormState {
  error?: string;
}

function serviceFieldsFromForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const serviceDate = String(formData.get("service_date") ?? "").trim();
  const serviceTime = String(formData.get("service_time") ?? "").trim();
  const type = String(formData.get("type") ?? "culto") as ServiceType;
  const notes = String(formData.get("notes") ?? "").trim();

  return {
    title,
    service_date: serviceDate,
    service_time: serviceTime || null,
    type,
    notes: notes || null,
  };
}

export async function createService(
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const { profile, userId } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    return { error: "Você não tem permissão para criar cultos." };
  }

  const fields = serviceFieldsFromForm(formData);
  if (!fields.title || !fields.service_date) {
    return { error: "Título e data são obrigatórios." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({ ...fields, created_by: userId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível criar o culto." };
  }

  revalidatePath("/dashboard/cultos");
  redirect(`/dashboard/cultos/${data.id}`);
}

export async function updateService(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    return { error: "Você não tem permissão para editar cultos." };
  }

  const fields = serviceFieldsFromForm(formData);
  if (!fields.title || !fields.service_date) {
    return { error: "Título e data são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").update(fields).eq("id", serviceId);

  if (error) {
    return { error: "Não foi possível atualizar o culto." };
  }

  revalidatePath("/dashboard/cultos");
  revalidatePath(`/dashboard/cultos/${serviceId}`);
  redirect(`/dashboard/cultos/${serviceId}`);
}

export async function deleteService(serviceId: string) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    throw new Error("Sem permissão.");
  }

  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", serviceId);

  revalidatePath("/dashboard/cultos");
  redirect("/dashboard/cultos");
}

// ---- Roteiro (service_songs) -------------------------------------------

export async function addSongToService(serviceId: string, formData: FormData) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) return;

  const songId = String(formData.get("song_id") ?? "");
  const keyOverride = String(formData.get("key_override") ?? "").trim();
  if (!songId) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("service_songs")
    .select("id", { count: "exact", head: true })
    .eq("service_id", serviceId);

  await supabase.from("service_songs").insert({
    service_id: serviceId,
    song_id: songId,
    position: count ?? 0,
    key_override: keyOverride || null,
  });

  revalidatePath(`/dashboard/cultos/${serviceId}`);
}

export async function removeSongFromService(serviceSongId: string, serviceId: string) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("service_songs").delete().eq("id", serviceSongId);

  revalidatePath(`/dashboard/cultos/${serviceId}`);
}

export async function moveServiceSong(
  serviceId: string,
  serviceSongId: string,
  direction: "up" | "down"
) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) return;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("service_songs")
    .select("id, position")
    .eq("service_id", serviceId)
    .order("position", { ascending: true });

  if (!rows) return;

  const index = rows.findIndex((r) => r.id === serviceSongId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swap = rows[swapIndex];

  await Promise.all([
    supabase.from("service_songs").update({ position: swap.position }).eq("id", current.id),
    supabase.from("service_songs").update({ position: current.position }).eq("id", swap.id),
  ]);

  revalidatePath(`/dashboard/cultos/${serviceId}`);
}

// ---- Escala (service_team) ----------------------------------------------

export async function addTeamMember(serviceId: string, formData: FormData) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) return;

  const profileId = String(formData.get("profile_id") ?? "");
  const role = String(formData.get("role") ?? "").trim();
  if (!profileId || !role) return;

  const supabase = await createClient();
  await supabase.from("service_team").insert({
    service_id: serviceId,
    profile_id: profileId,
    role,
  });

  revalidatePath(`/dashboard/cultos/${serviceId}`);
}

export async function removeTeamMember(teamId: string, serviceId: string) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) return;

  const supabase = await createClient();
  await supabase.from("service_team").delete().eq("id", teamId);

  revalidatePath(`/dashboard/cultos/${serviceId}`);
}

export async function updateTeamStatus(
  teamId: string,
  serviceId: string,
  formData: FormData
) {
  const { userId, profile } = await getCurrentProfile();

  const supabase = await createClient();
  const { data: teamRow } = await supabase
    .from("service_team")
    .select("profile_id")
    .eq("id", teamId)
    .single();

  if (!teamRow) return;
  if (teamRow.profile_id !== userId && !canManage(profile.role)) return;

  const status = String(formData.get("status") ?? "") as TeamStatus;
  if (!["convidado", "confirmado", "recusado"].includes(status)) return;

  await supabase.from("service_team").update({ status }).eq("id", teamId);

  revalidatePath(`/dashboard/cultos/${serviceId}`);
}
