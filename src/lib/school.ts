import { supabase } from "./supabase";
import type { Aluno, Nota, Turma } from "./supabase";

// Limite máximo de faltas permitido na instituição (acima disso o aluno é reprovado por frequência)
export const LIMITE_MAX_FALTAS = 25;

export const fallbackTurmas: Turma[] = [
  { id: "00000000-0000-0000-0000-000000000001", nome: "Informática 1º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000002", nome: "Informática 2º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000003", nome: "Informática 3º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000004", nome: "Agropecuária 1º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000005", nome: "Agropecuária 2º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000006", nome: "Agropecuária 3º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000007", nome: "Nutrição 1º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000008", nome: "Nutrição 2º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000009", nome: "Nutrição 3º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000010", nome: "Segurança do Trabalho 1º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000011", nome: "Segurança do Trabalho 2º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000012", nome: "Segurança do Trabalho 3º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000013", nome: "Edificações 1º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000014", nome: "Edificações 2º", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0000-000000000015", nome: "Edificações 3º", ano_letivo: 2025 },
];

export async function getTurmas(): Promise<Turma[]> {
  const { data, error } = await supabase
    .from("turmas")
    .select("id,nome,ano_letivo")
    .order("nome", { ascending: true });

  if (error) {
    console.warn("Falha ao carregar turmas, usando fallback.", error.message);
    return fallbackTurmas;
  }

  return data && data.length > 0 ? (data as Turma[]) : fallbackTurmas;
}

export async function getTurmasByProfessor(professorId: string): Promise<Turma[]> {
  const { data, error } = await supabase
    .from("turma_professores")
    .select("turma: turmas(*)")
    .eq("professor_id", professorId);

  if (error) throw error;

  return ((data ?? []) as unknown as { turma: Turma }[])
    .map((row) => row.turma)
    .filter(Boolean);
}

export async function getAlunosByTurma(turmaId: string): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("turma_id", turmaId)
    .order("nome", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Aluno[];
}

/**
 * Busca as notas filtrando por Professor, Turma e OBRIGATORIAMENTE pela Unidade.
 */
export async function getNotasByProfessorAndTurma(
  professorId: string,
  turmaId: string,
  unidade: number = 1
): Promise<Nota[]> {
  const { data, error } = await supabase
    .from("notas")
    .select("*")
    .eq("professor_id", professorId)
    .eq("turma_id", turmaId)
    .eq("unidade", unidade); // <-- Filtra por unidade

  if (error) throw error;
  return (data ?? []) as Nota[];
}

export async function getNotasByAluno(alunoId: string) {
  const { data, error } = await supabase
    .from("notas")
    .select(`
      *,
      turma:turmas(*),
      professor:professores(*),
      disciplina:disciplinas(*)
    `)
    .eq("aluno_id", alunoId);

  if (error) {
    console.error("Erro ao buscar notas do aluno:", error);
    return [];
  }

  return data ?? [];
}

export interface SaveProfessorNoteInput {
  alunoId: string;
  professorId: string;
  turmaId: string;
  unidade?: number; // <-- Adicionado o parâmetro unidade
  nota1: number | null;
  nota2: number | null;
  nota3: number | null;
  faltas?: number | null;
  observacao: string | null;
}

/**
 * Salva/Atualiza as notas e faltas do aluno vinculadas à unidade letiva informada.
 */
export async function saveProfessorNote(payload: SaveProfessorNoteInput): Promise<{ notaId?: string }> {
  const {
    alunoId,
    professorId,
    turmaId,
    unidade = 1, // Padrão 1 se não fornecido
    nota1,
    nota2,
    nota3,
    faltas,
    observacao,
  } = payload;

  // Atualiza observação geral do aluno
  const { error: obsErr } = await supabase
    .from("alunos")
    .update({ observacao })
    .eq("id", alunoId);

  if (obsErr) throw obsErr;

  const notePayload = {
    aluno_id: alunoId,
    professor_id: professorId,
    turma_id: turmaId,
    unidade: unidade, // <-- Grava o número da unidade no banco
    nota_1: nota1,
    nota_2: nota2,
    nota_3: nota3,
    faltas: faltas ?? 0,
  };

  // Garante o Upsert sem conflitos por causa da unidade
  const { data, error } = await supabase
  .from("notas")
  .upsert(notePayload, { onConflict: "aluno_id,professor_id,turma_id,unidade" })
  .select("id")
  .maybeSingle();

  if (error) throw error;

  return { notaId: data?.id };
}

export function calculateMedia(values: Array<number | null | undefined>): number | null {
  const filled = values.filter((value): value is number => value != null && value !== undefined);
  if (filled.length === 0) return null;
  return filled.reduce((sum, value) => sum + value, 0) / filled.length;
}

export function checkReprovadoPorFaltas(faltas?: number | null): boolean {
  if (faltas == null) return false;
  return faltas > LIMITE_MAX_FALTAS;
}

export function getSituacaoFromMedia(
  media: number | null,
  faltas?: number | null
): "Aprovado" | "Recuperação" | "Reprovado" | "Reprovado por Faltas" | "Sem notas" {
  if (checkReprovadoPorFaltas(faltas)) return "Reprovado por Faltas";
  if (media == null) return "Sem notas";
  if (media >= 7) return "Aprovado";
  if (media >= 5) return "Recuperação";
  return "Reprovado";
}

export async function getAlunoData(alunoId: string) {
  const { data, error } = await supabase
    .from("alunos")
    .select("*, turma:turmas(*)")
    .eq("id", alunoId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}