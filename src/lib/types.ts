export type UserRole = "admin" | "lider" | "membro";

export type ServiceType = "culto" | "ensaio" | "evento";

export type TeamStatus = "convidado" | "confirmado" | "recusado";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  instruments: string[];
  phone: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  default_key: string | null;
  bpm: number | null;
  lyrics_chords: string;
  youtube_url: string | null;
  spotify_url: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  title: string;
  service_date: string;
  service_time: string | null;
  type: ServiceType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ServiceSong {
  id: string;
  service_id: string;
  song_id: string;
  position: number;
  key_override: string | null;
  notes: string | null;
  song?: Song;
}

export interface ServiceTeamMember {
  id: string;
  service_id: string;
  profile_id: string;
  role: string;
  status: TeamStatus;
  created_at: string;
  profile?: Profile;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  lider: "Líder de louvor",
  membro: "Membro",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  culto: "Culto",
  ensaio: "Ensaio",
  evento: "Evento",
};

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  convidado: "Convidado",
  confirmado: "Confirmado",
  recusado: "Recusado",
};
