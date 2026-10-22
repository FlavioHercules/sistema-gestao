
import { supabase } from "./supabase";
import type {
  Usuario,
  Professor,
  Aluno,
} from "./supabase";

// ============================================================
// EDGE FUNCTION
// ============================================================

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "";

const functionUrl = `${supabaseUrl}/functions/v1/manage-users`;

// ============================================================
// HEADERS
// ============================================================

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${
      import.meta.env.VITE_SUPABASE_ANON_KEY || ""
    }`,
  };
}

function authedHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ============================================================
// BOOTSTRAP DA SECRETARIA
// ============================================================

/**
 * Cria a primeira conta de secretaria
 * quando ainda não existe nenhuma.
 */
export async function bootstrapSecretaria(payload: {
  nome: string;
  email: string;
  senha: string;
}) {
  try {
    const res = await fetch(
      `${functionUrl}?action=bootstrap`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const text = await res.text();

    let data: { error?: string } | null = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        error:
          text || "Resposta vazia da função.",
      };
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          "A Edge Function manage-users não está publicada no projeto Supabase ou foi criada com outro nome."
        );
      }

      throw new Error(
        data?.error ||
          `Falha ao criar conta de secretaria (${res.status}).`
      );
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `Erro ao chamar a função de bootstrap: ${err.message}`
      );
    }

    throw new Error(
      "Erro ao chamar a função de bootstrap."
    );
  }
}

// ============================================================
// CRIAR USUÁRIO
// ============================================================

export interface CreateUserPayload {
  nome: string;
  email: string;
  senha: string;
  curso?: string | null;

  tipo_usuario:
    | "secretaria"
    | "coordenacao"
    | "professor"
    | "aluno";

  /**
   * ID do professor em professores_oficial.
   */
  professor_id?: string | null;

  /**
   * ID do aluno em alunos.
   */
  aluno_id?: string | null;
}

/**
 * Cria um usuário através da Edge Function manage-users.
 *
 * Professor:
 * professor_id deve apontar para professores_oficial.id.
 *
 * Aluno:
 * aluno_id deve apontar para alunos.id.
 */
export async function createUser(
  payload: CreateUserPayload,
  token: string
) {
  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: authedHeaders(token),
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    let data: { error?: string } | null = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        error:
          text || "Resposta vazia da função.",
      };
    }

    if (!res.ok) {
      throw new Error(
        data?.error ||
          `Falha ao criar usuário (${res.status}).`
      );
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `Erro ao criar usuário: ${err.message}`
      );
    }

    throw new Error(
      "Erro ao criar usuário."
    );
  }
}

// ============================================================
// ATUALIZAR USUÁRIO
// ============================================================

export async function updateUser(
  payload: {
    id: string;
    nome?: string;
    senha?: string;

    /**
     * ID do professor em professores_oficial.
     */
    professor_id?: string | null;

    /**
     * ID do aluno em alunos.
     */
    aluno_id?: string | null;
  },
  token: string
) {
  try {
    const res = await fetch(functionUrl, {
      method: "PATCH",
      headers: authedHeaders(token),
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    let data: { error?: string } | null = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        error:
          text || "Resposta vazia da função.",
      };
    }

    if (!res.ok) {
      throw new Error(
        data?.error ||
          `Falha ao atualizar usuário (${res.status}).`
      );
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `Erro ao atualizar usuário: ${err.message}`
      );
    }

    throw new Error(
      "Erro ao atualizar usuário."
    );
  }
}

// ============================================================
// EXCLUIR USUÁRIO
// ============================================================

export async function deleteUser(
  id: string,
  token: string
) {
  try {
    const res = await fetch(
      `${functionUrl}?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: authedHeaders(token),
      }
    );

    const text = await res.text();

    let data: { error?: string } | null = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = {
        error:
          text || "Resposta vazia da função.",
      };
    }

    if (!res.ok) {
      throw new Error(
        data?.error ||
          `Falha ao excluir usuário (${res.status}).`
      );
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `Erro ao excluir usuário: ${err.message}`
      );
    }

    throw new Error(
      "Erro ao excluir usuário."
    );
  }
}

// ============================================================
// CARREGAR PERFIL
// ============================================================

/**
 * Carrega o perfil da aplicação e o perfil
 * pedagógico relacionado ao usuário autenticado.
 *
 * PROFESSOR:
 *
 * usuarios.professor_id
 *        ↓
 * professores_oficial.id
 *
 * ALUNO:
 *
 * usuarios.aluno_id
 *        ↓
 * alunos.id
 */
export async function loadProfile(
  authId: string
): Promise<{
  usuario: Usuario | null;
  professor: Professor | null;
  aluno: Aluno | null;
}> {

  // ==========================================================
  // BUSCAR USUÁRIO
  // ==========================================================

  const {
    data: usuario,
    error: usuarioError,
  } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", authId)
    .maybeSingle();

  if (usuarioError) {
    throw usuarioError;
  }

  // ==========================================================
  // VARIÁVEIS DOS PERFIS
  // ==========================================================

  let professor: Professor | null = null;

  let aluno: Aluno | null = null;

  // ==========================================================
  // USUÁRIO ENCONTRADO
  // ==========================================================

  if (usuario) {

    // ========================================================
    // PROFESSOR
    // ========================================================

    if (usuario.professor_id) {
      const {
        data: professorData,
        error: professorError,
      } = await supabase
        .from("professores_oficial")
        .select("*")
        .eq("id", usuario.professor_id)
        .maybeSingle();

      if (professorError) {
        console.error(
          "Erro ao carregar professor_oficial:",
          professorError
        );
      }

      professor =
        (professorData as Professor | null) ??
        null;
    }

    // ========================================================
    // ALUNO
    // ========================================================

    const alunoIdParaBuscar =
      usuario.aluno_id ||
      (
        usuario.tipo_usuario === "aluno"
          ? usuario.id
          : null
      );

    if (alunoIdParaBuscar) {
      const {
        data: alunoData,
        error: alunoError,
      } = await supabase
        .from("alunos")
        .select(`
          *,
          turma:turmas(*)
        `)
        .eq("id", alunoIdParaBuscar)
        .maybeSingle();

      if (alunoError) {
        console.error(
          "Erro ao carregar aluno:",
          alunoError
        );
      }

      aluno =
        (alunoData as Aluno | null) ??
        null;
    }

    // ========================================================
    // RETORNAR PERFIL
    // ========================================================

    return {
      usuario: usuario as Usuario,
      professor,
      aluno,
    };
  }

  // ==========================================================
  // FALLBACK PARA ALUNO
  // ==========================================================

  /**
   * Caso o aluno esteja autenticado diretamente
   * e não exista registro correspondente em usuarios.
   */

  const {
    data: alunoDireto,
    error: alunoDiretoError,
  } = await supabase
    .from("alunos")
    .select(`
      *,
      turma:turmas(*)
    `)
    .eq("id", authId)
    .maybeSingle();

  if (alunoDiretoError) {
    console.error(
      "Erro ao carregar aluno diretamente:",
      alunoDiretoError
    );
  }

  // ==========================================================
  // ALUNO ENCONTRADO NO FALLBACK
  // ==========================================================

  if (alunoDireto) {
    const usuarioAluno: Usuario = {
      id: alunoDireto.id,
      nome: alunoDireto.nome,
      email: `${alunoDireto.matricula}@aluno.local`,
      tipo_usuario: "aluno",
      aluno_id: alunoDireto.id,
    };

    return {
      usuario: usuarioAluno,
      professor: null,
      aluno: alunoDireto as Aluno,
    };
  }

  // ==========================================================
  // NENHUM PERFIL ENCONTRADO
  // ==========================================================

  return {
    usuario: null,
    professor: null,
    aluno: null,
  };
}

