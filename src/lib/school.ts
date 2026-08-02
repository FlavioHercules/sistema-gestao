import { supabase } from "./supabase";
import type { Aluno, Nota, Turma, Disciplina, Atividade } from "./supabase";

// Limite máximo de faltas permitido na instituição (acima disso o aluno é reprovado por frequência)
export const LIMITE_MAX_FALTAS = 25;

// Interface estendida para incluir a relação de disciplina
export interface NotaComDisciplina extends Nota {
  disciplina?: {
    id: string;
    nome: string;
  };
}

export const fallbackTurmas: Turma[] = [
  // ==========================================
  // TURNO MATUTINO
  // ==========================================
  { id: "00000000-0000-0000-0001-000000000101", nome: "Informática 1º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000102", nome: "Informática 2º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000103", nome: "Informática 3º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000104", nome: "Agropecuária 1º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000105", nome: "Agropecuária 1º B (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000106", nome: "Agropecuária 1º C (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000107", nome: "Agropecuária 2º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000108", nome: "Agropecuária 2º B (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000109", nome: "Agropecuária 2º C (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000110", nome: "Agropecuária 3º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000111", nome: "Agropecuária 3º B (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000112", nome: "Agropecuária 3º C (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000113", nome: "Nutrição 1º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000114", nome: "Nutrição 2º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000115", nome: "Nutrição 3º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000116", nome: "Segurança do Trabalho 1º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000117", nome: "Segurança do Trabalho 2º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000118", nome: "Segurança do Trabalho 3º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000119", nome: "Edificações 1º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000120", nome: "Edificações 2º A (Matutino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0001-000000000121", nome: "Edificações 3º A (Matutino)", ano_letivo: 2025 },

  // ==========================================
  // TURNO VESPERTINO
  // ==========================================
  { id: "00000000-0000-0000-0002-000000000201", nome: "Informática 1º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000202", nome: "Informática 2º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000203", nome: "Informática 3º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000204", nome: "Agropecuária 1º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000205", nome: "Agropecuária 1º B (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000206", nome: "Agropecuária 1º C (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000207", nome: "Agropecuária 2º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000208", nome: "Agropecuária 2º B (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000209", nome: "Agropecuária 2º C (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000210", nome: "Agropecuária 3º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000211", nome: "Agropecuária 3º B (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000212", nome: "Agropecuária 3º C (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000213", nome: "Nutrição 1º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000214", nome: "Nutrição 2º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000215", nome: "Nutrição 3º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000216", nome: "Segurança do Trabalho 1º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000217", nome: "Segurança do Trabalho 2º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000218", nome: "Segurança do Trabalho 3º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000219", nome: "Edificações 1º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000220", nome: "Edificações 2º A (Vespertino)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0002-000000000221", nome: "Edificações 3º A (Vespertino)", ano_letivo: 2025 },

  // ==========================================
  // TURNO NOTURNO
  // ==========================================
  { id: "00000000-0000-0000-0003-000000000301", nome: "Informática 1º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000302", nome: "Informática 2º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000303", nome: "Informática 3º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000304", nome: "Agropecuária 1º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000305", nome: "Agropecuária 2º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000306", nome: "Agropecuária 3º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000307", nome: "Nutrição 1º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000308", nome: "Nutrição 2º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000309", nome: "Nutrição 3º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000310", nome: "Segurança do Trabalho 1º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000311", nome: "Segurança do Trabalho 2º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000312", nome: "Segurança do Trabalho 3º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000313", nome: "Edificações 1º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000314", nome: "Edificações 2º (Noturno)", ano_letivo: 2025 },
  { id: "00000000-0000-0000-0003-000000000315", nome: "Edificações 3º (Noturno)", ano_letivo: 2025 },
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
 * Busca as notas filtrando por Professor, Turma e Unidade.
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
    .eq("unidade", unidade);

  if (error) throw error;
  return (data ?? []) as Nota[];
}

/**
 * Busca TODAS as notas de uma turma inteira (com informações de disciplina) para a Secretaria.
 */
export async function getNotasByTurma(
  turmaId: string,
  unidade: number = 1
): Promise<NotaComDisciplina[]> {
  const { data, error } = await supabase
    .from("notas")
    .select(`
      *,
      disciplina:disciplinas(id, nome)
    `)
    .eq("turma_id", turmaId)
    .eq("unidade", unidade);

  if (error) {
    console.error("Erro ao buscar notas da turma:", error);
    throw error;
  }

  return (data ?? []) as NotaComDisciplina[];
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

// ==========================================
// FUNÇÕES DE HORÁRIOS (ATUALIZADAS PARA FOTO/ARQUIVO)
// ==========================================

export async function getHorariosByTurma(turmaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("horarios")
    .select("arquivo_url")
    .eq("turma_id", turmaId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar grade da turma:", error);
    return null;
  }

  return data?.arquivo_url ?? null;
}

export async function getHorariosByProfessor(professorId: string): Promise<string | null> {
  // Mantido para compatibilidade, caso algum componente chame
  return null;
}

export async function getHorariosByAluno(alunoId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("alunos")
    .select("turma_id")
    .eq("id", alunoId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar turma do aluno:", error);
    return null;
  }

  if (!data?.turma_id) {
    return null;
  }

  return getHorariosByTurma(data.turma_id);
}

export async function getAtividadesByTurma(turmaId: string): Promise<Atividade[]> {
  const { data, error } = await supabase
    .from("atividades")
    .select(`
      *,
      professor:professores(id, nome),
      disciplina:disciplinas(id, nome),
      turma:turmas(id, nome)
    `)
    .eq("turma_id", turmaId)
    .order("prazo", { ascending: true });

  if (error) {
    console.error("Erro ao buscar atividades da turma:", error);
    return [];
  }

  return (data ?? []) as Atividade[];
}

export async function getAtividadesByAluno(alunoId: string, turmaId?: string): Promise<Atividade[]> {
  if (turmaId) {
    const list = await getAtividadesByTurma(turmaId);
    if (list.length > 0) return list;
  }

  const { data, error } = await supabase
    .from("alunos")
    .select("turma_id")
    .eq("id", alunoId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar turma do aluno:", error);
  }

  if (data?.turma_id) {
    const list = await getAtividadesByTurma(data.turma_id);
    if (list.length > 0) return list;
  }

  // FALLBACK DE SEGURANÇA: Se a turma específica não retornar nada,
  // trazemos todas as atividades cadastradas para garantir que o aluno veja os dados de teste.
  console.warn("Nenhuma atividade encontrada pelo ID da turma do aluno. Buscando todas as atividades como fallback...");
  const { data: allData, error: allError } = await supabase
    .from("atividades")
    .select(`
      *,
      professor:professores(id, nome),
      disciplina:disciplinas(id, nome),
      turma:turmas(id, nome)
    `)
    .order("prazo", { ascending: true });

  if (allError) {
    console.error("Erro no fallback de atividades:", allError);
    return [];
  }

  return (allData ?? []) as Atividade[];
}

export interface CreateAtividadeInput {
  turmaId: string;
  professorId: string;
  titulo: string;
  descricao: string;
  tipo: "atividade" | "simulado";
  prazo?: string | null;
  disciplinaId?: string | null;
}

export async function createAtividade(payload: CreateAtividadeInput) {
  const { data, error } = await supabase
    .from("atividades")
    .insert({
      turma_id: payload.turmaId,
      professor_id: payload.professorId,
      disciplina_id: payload.disciplinaId ?? null,
      titulo: payload.titulo,
      descricao: payload.descricao,
      tipo: payload.tipo,
      prazo: payload.prazo ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { id: data?.id };
}

export interface SaveProfessorNoteInput {
  alunoId: string;
  professorId: string;
  turmaId: string;
  disciplinaId: string;
  unidade?: number;
  nota1: number | null;
  nota2: number | null;
  nota3: number | null;
  faltas?: number | null;
  observacao: string | null;
}

/**
 * Salva/Atualiza as notas, faltas e observação do aluno
 */
export async function saveProfessorNote(payload: SaveProfessorNoteInput): Promise<{ notaId?: string }> {
  const {
    alunoId,
    professorId,
    turmaId,
    disciplinaId,
    unidade = 1,
    nota1,
    nota2,
    nota3,
    faltas,
    observacao,
  } = payload;

  // Atualiza observação opcional do cadastro geral do aluno
  await supabase
    .from("alunos")
    .update({ observacao })
    .eq("id", alunoId);

  // Prepara os dados incluindo disciplina_id e observacao
  const notePayload = {
    aluno_id: alunoId,
    professor_id: professorId,
    turma_id: turmaId,
    disciplina_id: disciplinaId,
    unidade: unidade,
    nota_1: nota1,
    nota_2: nota2,
    nota_3: nota3,
    faltas: faltas ?? 0,
    observacao: observacao,
  };

  const { data, error } = await supabase
    .from("notas")
    .upsert(notePayload, { onConflict: "aluno_id,professor_id,turma_id,unidade" })
    .select("id")
    .maybeSingle();

  if (error) throw error;

  return { notaId: data?.id };
}

/**
 * Busca a disciplina que um professor leciona em uma determinada turma
 */
export async function getDisciplinaDoProfessor(professorId: string, turmaId: string) {
  const { data, error } = await supabase
    .from("professor_turma_disciplina")
    .select("disciplina_id, disciplinas(*)")
    .eq("professor_id", professorId)
    .eq("turma_id", turmaId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar disciplina do professor:", error);
    return null;
  }

  return data?.disciplina_id ?? null;
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