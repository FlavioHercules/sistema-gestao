import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface UserPayload {
  nome: string;
  email: string;
  senha: string;
  tipo_usuario: "secretaria" | "professor" | "aluno";
  professor_id?: string | null;
  aluno_id?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // ---- Bootstrap: create the initial secretaria if none exists ----
    if (action === "bootstrap") {
      const { count } = await admin
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("tipo_usuario", "secretaria");

      if ((count ?? 0) > 0) {
        return new Response(
          JSON.stringify({ error: "Já existe uma conta de secretaria." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const { nome, email, senha } = body as {
        nome: string;
        email: string;
        senha: string;
      };

      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, tipo_usuario: "secretaria" },
      });

      if (authErr) throw new Error(authErr.message);

      const { error: profileErr } = await admin.from("usuarios").insert({
        id: authData.user.id,
        nome,
        email,
        tipo_usuario: "secretaria",
      });

      if (profileErr) throw new Error(profileErr.message);

      return new Response(
        JSON.stringify({ id: authData.user.id, nome, email, tipo_usuario: "secretaria" }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- All other actions require an authenticated caller that is secretaria ----
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return new Response(JSON.stringify({ error: "Token inválido." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = callerData.user.id;
    const { data: callerProfile } = await admin
      .from("usuarios")
      .select("tipo_usuario")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile || callerProfile.tipo_usuario !== "secretaria") {
      return new Response(
        JSON.stringify({ error: "Acesso restrito à secretaria." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- CREATE user ----
    if (req.method === "POST") {
      const body = (await req.json()) as UserPayload;
      const { nome, email, senha, tipo_usuario, professor_id, aluno_id } = body;

      if (!nome || !email || !senha || !tipo_usuario) {
        return new Response(JSON.stringify({ error: "Dados incompletos." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome, tipo_usuario },
      });

      if (authErr) throw new Error(authErr.message);

      const { error: profileErr } = await admin.from("usuarios").insert({
        id: authData.user.id,
        nome,
        email,
        tipo_usuario,
        professor_id: professor_id ?? null,
        aluno_id: aluno_id ?? null,
      });

      if (profileErr) throw new Error(profileErr.message);

      // Link the professor record back to this user
      if (tipo_usuario === "professor" && professor_id) {
        await admin
          .from("professores")
          .update({ usuario_id: authData.user.id })
          .eq("id", professor_id);
      }

      if (tipo_usuario === "aluno" && aluno_id) {
        await admin
          .from("alunos")
          .update({ usuario_id: authData.user.id })
          .eq("id", aluno_id);
      }

      return new Response(
        JSON.stringify({
          id: authData.user.id,
          nome,
          email,
          tipo_usuario,
          professor_id: professor_id ?? null,
          aluno_id: aluno_id ?? null,
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- UPDATE user (nome and/or senha) ----
    if (req.method === "PATCH") {
      const body = (await req.json()) as {
        id: string;
        nome?: string;
        senha?: string;
        professor_id?: string | null;
        aluno_id?: string | null;
      };
      const { id, nome, senha, professor_id, aluno_id } = body;

      if (nome) {
        await admin.from("usuarios").update({ nome }).eq("id", id);
        await admin.auth.admin.updateUserById(id, {
          user_metadata: { nome },
        });
      }

      if (senha) {
        await admin.auth.admin.updateUserById(id, { password: senha });
      }

      if (professor_id !== undefined) {
        await admin.from("usuarios").update({ professor_id: professor_id ?? null }).eq("id", id);
        if (professor_id) {
          await admin.from("professores").update({ usuario_id: id }).eq("id", professor_id);
        }
      }

      if (aluno_id !== undefined) {
        await admin.from("usuarios").update({ aluno_id: aluno_id ?? null }).eq("id", id);
        if (aluno_id) {
          await admin.from("alunos").update({ usuario_id: id }).eq("id", aluno_id);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- DELETE user ----
    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "id obrigatório." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // usuarios row cascades on auth user delete, but delete profile first is fine too
      await admin.from("usuarios").delete().eq("id", id);
      const { error: delErr } = await admin.auth.admin.deleteUser(id);
      if (delErr) throw new Error(delErr.message);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não suportado." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
