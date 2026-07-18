"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data/profile";
import type { UserRole } from "@/lib/types";

export interface ProfileFormState {
  error?: string;
}

export async function updateOwnProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const { userId } = await getCurrentProfile();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const instrumentsRaw = String(formData.get("instruments") ?? "");
  const instruments = instrumentsRaw
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);

  if (!fullName) {
    return { error: "O nome é obrigatório." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null, instruments })
    .eq("id", userId);

  if (error) {
    return { error: "Não foi possível atualizar o perfil." };
  }

  revalidatePath("/dashboard/equipe");
  redirect("/dashboard/equipe");
}

export async function updateProfileRole(profileId: string, formData: FormData) {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "admin") return;

  const role = String(formData.get("role") ?? "") as UserRole;
  if (!["admin", "lider", "membro"].includes(role)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", profileId);

  revalidatePath("/dashboard/equipe");
}
