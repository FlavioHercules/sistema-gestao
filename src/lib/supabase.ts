import { createClient } from "@supabase/supabase-js";

// Busca das variáveis do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ ATENÇÃO: As variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não foram encontradas no ambiente!"
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", // evita o crash fatal no import
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// ----- Domain types matching the database schema -----
// (Seus tipos continuam iguais aqui abaixo...)

// ----- Domain types matching the database schema -----

export type TipoUsuario = "secretaria" | "professor" | "aluno";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: TipoUsuario;
  professor_id?: string | null;
  aluno_id?: string | null;
  created_at?: string;
}

export interface Professor {
  id: string;
  nome: string;
  disciplina: string;
  usuario_id?: string | null;
  created_at?: string;
}

export interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  created_at?: string;
}

export interface TurmaProfessor {
  turma_id: string;
  professor_id: string;
  turma?: Turma;
  professor?: Professor;
}

export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  turma_id: string | null;
  usuario_id?: string | null;
  data_nascimento?: string | null;
  observacao?: string | null;
  turma?: Turma | null;
  created_at?: string;
}

export interface Nota {
  id: string;
  aluno_id: string;
  professor_id: string;
  turma_id: string | null;
  nota_1: number | null;
  nota_2: number | null;
  nota_3: number | null;
  media: number | null;
  created_at?: string;
  updated_at?: string;
  aluno?: Aluno;
  professor?: Professor;
  turma?: Turma | null;
  faltas?: number | null;
}

export interface AuthSession {
  user: Usuario | null;
  professor: Professor | null;
  loading: boolean;
}
