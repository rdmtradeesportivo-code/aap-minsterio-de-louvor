import { createClient } from "@/lib/supabase/server";
import type { Song } from "@/lib/types";

export async function listSongs(query?: string): Promise<Song[]> {
  const supabase = await createClient();
  let request = supabase.from("songs").select("*").order("title", { ascending: true });

  if (query) {
    const safe = query.replace(/[,%]/g, "").trim();
    if (safe) {
      request = request.or(`title.ilike.%${safe}%,artist.ilike.%${safe}%`);
    }
  }

  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function getSong(id: string): Promise<Song | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("songs").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}
