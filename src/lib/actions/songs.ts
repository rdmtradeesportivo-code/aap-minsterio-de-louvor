"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canManage } from "@/lib/data/profile";

export interface SongFormState {
  error?: string;
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function songFieldsFromForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const artist = String(formData.get("artist") ?? "").trim();
  const defaultKey = String(formData.get("default_key") ?? "").trim();
  const bpmRaw = String(formData.get("bpm") ?? "").trim();
  const lyricsChords = String(formData.get("lyrics_chords") ?? "");
  const youtubeUrl = String(formData.get("youtube_url") ?? "").trim();
  const spotifyUrl = String(formData.get("spotify_url") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");

  return {
    title,
    artist: artist || null,
    default_key: defaultKey || null,
    bpm: bpmRaw ? Number.parseInt(bpmRaw, 10) : null,
    lyrics_chords: lyricsChords,
    youtube_url: youtubeUrl || null,
    spotify_url: spotifyUrl || null,
    tags: parseTags(tagsRaw),
  };
}

export async function createSong(
  _prevState: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const { profile, userId } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    return { error: "Você não tem permissão para cadastrar músicas." };
  }

  const fields = songFieldsFromForm(formData);
  if (!fields.title) {
    return { error: "O título é obrigatório." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("songs")
    .insert({ ...fields, created_by: userId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível salvar a música." };
  }

  revalidatePath("/dashboard/repertorio");
  redirect(`/dashboard/repertorio/${data.id}`);
}

export async function updateSong(
  songId: string,
  _prevState: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    return { error: "Você não tem permissão para editar músicas." };
  }

  const fields = songFieldsFromForm(formData);
  if (!fields.title) {
    return { error: "O título é obrigatório." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("songs").update(fields).eq("id", songId);

  if (error) {
    return { error: "Não foi possível atualizar a música." };
  }

  revalidatePath("/dashboard/repertorio");
  revalidatePath(`/dashboard/repertorio/${songId}`);
  redirect(`/dashboard/repertorio/${songId}`);
}

export async function deleteSong(songId: string) {
  const { profile } = await getCurrentProfile();
  if (!canManage(profile.role)) {
    throw new Error("Sem permissão.");
  }

  const supabase = await createClient();
  await supabase.from("songs").delete().eq("id", songId);

  revalidatePath("/dashboard/repertorio");
  redirect("/dashboard/repertorio");
}
