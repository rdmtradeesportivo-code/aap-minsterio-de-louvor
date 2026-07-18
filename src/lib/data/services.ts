import { createClient } from "@/lib/supabase/server";
import type { Service, ServiceSong, ServiceTeamMember } from "@/lib/types";

export async function listServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("service_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listUpcomingServices(limit = 5): Promise<Service[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .gte("service_date", today)
    .order("service_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getService(id: string): Promise<Service | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function listServiceSongs(serviceId: string): Promise<ServiceSong[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_songs")
    .select("*, song:songs(*)")
    .eq("service_id", serviceId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceSong[];
}

export async function listServiceTeam(serviceId: string): Promise<ServiceTeamMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_team")
    .select("*, profile:profiles(*)")
    .eq("service_id", serviceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ServiceTeamMember[];
}
