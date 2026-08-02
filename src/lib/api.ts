import { supabase } from "./supabase";
import type { Usuario, Professor, Aluno } from "./supabase";

const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

function authedHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** Create the first secretaria account when none exists yet. */
export async function bootstrapSecretaria(payload: {
  nome: string;
  email: string;
  senha: string;
}) {
  try {
    const res = await fetch(`${functionUrl}?action=bootstrap`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || "Resposta vazia da função." };
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          "A Edge Function manage-users não está publicada no projeto Supabase ou foi criada com outro nome."
        );
      }
      throw new Error(data?.error || `Falha ao criar conta de secretaria (${res.status}).`);
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Erro ao chamar a função de bootstrap: ${err.message}`);
    }
    throw new Error("Erro ao chamar a função de bootstrap.");
  }
}

export interface CreateUserPayload {
  nome: string;
  email: string;
  senha: string;
  tipo_usuario: "secretaria" | "coordenacao" | "professor" | "aluno";
  professor_id?: string | null;
  aluno_id?: string | null;
}

export async function createUser(payload: CreateUserPayload, token: string) {
  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: authedHeaders(token),
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || "Resposta vazia da função." };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Falha ao criar usuário (${res.status}).`);
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Erro ao criar usuário: ${err.message}`);
    }
    throw new Error("Erro ao criar usuário.");
  }
}

export async function updateUser(
  payload: {
    id: string;
    nome?: string;
    senha?: string;
    professor_id?: string | null;
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
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || "Resposta vazia da função." };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Falha ao atualizar usuário (${res.status}).`);
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Erro ao atualizar usuário: ${err.message}`);
    }
    throw new Error("Erro ao atualizar usuário.");
  }
}

export async function deleteUser(id: string, token: string) {
  try {
    const res = await fetch(`${functionUrl}?id=${id}`, {
      method: "DELETE",
      headers: authedHeaders(token),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || "Resposta vazia da função." };
    }

    if (!res.ok) {
      throw new Error(data?.error || `Falha ao excluir usuário (${res.status}).`);
    }

    return data;
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Erro ao excluir usuário: ${err.message}`);
    }
    throw new Error("Erro ao excluir usuário.");
  }
}

/** Load the app-level profile + linked professor for a signed-in auth user. */
export async function loadProfile(authId: string): Promise<{
  usuario: Usuario | null;
  professor: Professor | null;
  aluno: Aluno | null;
}> {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", authId)
    .maybeSingle();

  if (error) throw error;

  let professor: Professor | null = null;
  let aluno: Aluno | null = null;

  if (usuario) {
    if (usuario.professor_id) {
      const { data: prof } = await supabase
        .from("professores")
        .select("*")
        .eq("id", usuario.professor_id)
        .maybeSingle();
      professor = prof as Professor | null;
    }

    const alunoIdParaBuscar = usuario.aluno_id || (usuario.tipo_usuario === "aluno" ? usuario.id : null);

    if (alunoIdParaBuscar) {
      const { data: alunoData } = await supabase
        .from("alunos")
        .select("*, turma:turmas(*)")
        .eq("id", alunoIdParaBuscar)
        .maybeSingle();
      aluno = alunoData as Aluno | null;
    }

    return { usuario: usuario as Usuario, professor, aluno };
  }

  // Fallback caso o usuário logado seja diretamente um aluno sem registro prévio na tabela "usuarios"
  const { data: alunoDireto } = await supabase
    .from("alunos")
    .select("*, turma:turmas(*)")
    .eq("id", authId)
    .maybeSingle();

  if (alunoDireto) {
    const usuarioAluno: Usuario = {
      id: alunoDireto.id,
      nome: alunoDireto.nome,
      email: `${alunoDireto.matricula}@aluno.local`,
      tipo_usuario: "aluno",
      aluno_id: alunoDireto.id,
    };
    return { usuario: usuarioAluno, professor: null, aluno: alunoDireto as Aluno };
  }

  return { usuario: null, professor: null, aluno: null };
}