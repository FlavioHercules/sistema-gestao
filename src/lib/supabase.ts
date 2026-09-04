
import { createClient } from "@supabase/supabase-js";

// ============================================================
// SUPABASE CLIENT
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ ATENÇÃO: As variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não foram encontradas no ambiente!"
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// ============================================================
// TIPOS DE USUÁRIO
// ============================================================

export type TipoUsuario =
  | "secretaria"
  | "coordenacao"
  | "professor"
  | "aluno";

// ============================================================
// USUÁRIO
// ============================================================

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: TipoUsuario;

  /**
   * ID do registro do professor em professores_oficial.
   */
  professor_id?: string | null;

  /**
   * ID do registro do aluno.
   */
  aluno_id?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ============================================================
// PROFESSOR
// ============================================================
//
// A tabela oficial de professores é:
//
// professores_oficial
//
// O campo usuario_id faz a ligação com usuarios.
//
// Não utilizar a tabela "professores" para novos cadastros.
//

export interface Professor {
  id: string;
  nome: string;

  email?: string | null;

  area_formacao?: string | null;

  /**
   * ID do usuário responsável pelo login.
   */
  usuario_id?: string | null;

  created_at?: string;
  updated_at?: string;
}

// Alias explícito para deixar claro que representa
// o professor oficial do sistema.
export type ProfessorOficial = Professor;

// ============================================================
// DISCIPLINA
// ============================================================

export interface Disciplina {
  id: string;
  nome: string;

  carga_horaria?: number | null;

  curso?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ============================================================
// TURMA
// ============================================================

export interface Turma {
  id: string;
  nome: string;

  ano_letivo: number;

  curso?: string | null;

  serie?: string | null;

  ano?: string | null;

  created_at?: string;
  updated_at?: string;
}

// ============================================================
// TURMA + PROFESSOR
// ============================================================

export interface TurmaProfessor {
  turma_id: string;
  professor_id: string;

  turma?: Turma;

  professor?: Professor;
}

// ============================================================
// HORÁRIO
// ============================================================

export interface Horario {
  id: string;

  turma_id: string;

  arquivo_url?: string | null;

  created_at?: string;

  updated_at?: string;

  turma?: Turma;
}

// ============================================================
// ALUNO
// ============================================================

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

  updated_at?: string;
}

// ============================================================
// ATIVIDADE
// ============================================================

export interface Atividade {
  id: string;

  turma_id: string;

  /**
   * ID do professor em professores_oficial.
   */
  professor_id: string;

  disciplina_id?: string | null;

  titulo: string;

  descricao?: string | null;

  tipo: "atividade" | "simulado";

  prazo?: string | null;

  created_at?: string;

  updated_at?: string;

  professor?: Professor | null;

  disciplina?: Disciplina | null;

  turma?: Turma | null;
}

// ============================================================
// NOTA
// ============================================================

export interface Nota {
  id: string;

  aluno_id: string;

  /**
   * ID do professor em professores_oficial.
   */
  professor_id: string;

  turma_id: string | null;

  disciplina_id?: string | null;

  unidade?: number;

  nota_1: number | null;

  nota_2: number | null;

  nota_3: number | null;

  media: number | null;

  observacao?: string | null;

  faltas?: number | null;

  created_at?: string;

  updated_at?: string;

  aluno?: Aluno;

  professor?: Professor | null;

  turma?: Turma | null;

  disciplina?: Disciplina | null;
}

// ============================================================
// SESSÃO DA APLICAÇÃO
// ============================================================

export interface AuthSession {
  user: Usuario | null;

  /**
   * Perfil pedagógico do professor.
   *
   * Agora vem de professores_oficial.
   */
  professor: Professor | null;

  aluno: Aluno | null;

  loading: boolean;
}

