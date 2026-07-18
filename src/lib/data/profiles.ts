import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
