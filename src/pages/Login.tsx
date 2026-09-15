import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, Loader2, LogIn, School, UserCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Aluno } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { fallbackTurmas, getTurmas } from "../lib/school";
import { Button } from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import { ErrorBanner } from "../components/ui/Misc";

export function Login() {
  const { usuario, loading, loginAluno } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "aluno">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [nomeAluno, setNomeAluno] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [turmas, setTurmas] = useState(fallbackTurmas);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setTurmas(await getTurmas());
      } catch {
        setTurmas(fallbackTurmas);
      }
    })();
  }, []);

  // Redirecionamento baseado no tipo de usuário autenticado
  if (!loading && usuario) {
    let targetPath = "/professor";

    if (usuario.tipo_usuario === "secretaria") {
      targetPath = "/secretaria";
    } else if (usuario.tipo_usuario === "coordenacao") {
      targetPath = "/coordenacao";
    } else if (usuario.tipo_usuario === "aluno") {
      targetPath = "/aluno";
    }

    return <Navigate to={targetPath} replace />;
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (err) throw err;
    } catch (err) {
      setError(
        (err as Error).message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : (err as Error).message
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAlunoAccess(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const nomeTratado = nomeAluno.trim();
      if (!turmaId || !nomeTratado || !dataNascimento) {
        throw new Error("Informe a turma, o nome e a data de nascimento.");
      }

      // 1. Busca os alunos da turma selecionada
      const { data: alunosDaTurma, error: alunoErr } = await supabase
        .from("alunos")
        .select("*, turma: turmas(*)")
        .eq("turma_id", turmaId);

      if (alunoErr) {
        throw new Error("Não foi possível consultar os alunos. Tente novamente.");
      }

      if (!alunosDaTurma || alunosDaTurma.length === 0) {
        throw new Error("Nenhum aluno cadastrado nesta turma.");
      }

      const termoNome = nomeTratado.toLowerCase();
      const dataBuscada = dataNascimento.trim().split("T")[0];

      // 2. Busca o aluno sem vulnerabilidade a maiúsculas/minúsculas ou fusos de data
      const alunoEncontrado = alunosDaTurma.find((a) => {
        const nomeBanco = (a.nome || "").toLowerCase();
        const dataBanco = a.data_nascimento ? a.data_nascimento.split("T")[0] : "";

        return nomeBanco.includes(termoNome) && dataBanco === dataBuscada;
      });

      if (!alunoEncontrado) {
        throw new Error("Dados de acesso incorretos. Verifique o nome e a data de nascimento.");
      }

      await loginAluno(alunoEncontrado as Aluno);
      navigate("/aluno");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cetep-login relative min-h-screen overflow-hidden bg-[#F5F7FA] text-[#172033]">
      {/* Background ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-2 bg-[#FF0000]" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#E8F0FA]" />
        <div className="absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-[#E8F0FA]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#00469F] text-white shadow-lg shadow-[#00469F]/20">
              <GraduationCap size={28} />
            </div>
            <h1 className="text-2xl font-bold text-[#003575] tracking-tight">EduGrade</h1>
            <p className="mt-1.5 text-sm text-[#64748B]">
              Sistema de Gestão Escolar de Notas
            </p>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-xl shadow-[#003575]/10 sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-[#E8F0FA] p-1">
              <button
                onClick={() => setMode("login")}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === "login"
                    ? "bg-[#00469F] text-white shadow"
                    : "text-[#64748B] hover:text-[#003575]"
                }`}
              >
                <LogIn size={15} />
                Entrar
              </button>
              <button
                onClick={() => setMode("aluno")}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all ${
                  mode === "aluno"
                    ? "bg-[#00469F] text-white shadow"
                    : "text-[#64748B] hover:text-[#003575]"
                }`}
              >
                <UserCircle2 size={15} />
                Aluno
              </button>
            </div>

            {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  icon={<Mail size={16} />}
                />
                <Input
                  label="Senha"
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock size={16} />}
                />
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Loader2 size={18} className="animate-spin" /> : "Entrar"}
                </Button>
              </form>
            ) : mode === "aluno" ? (
              <form onSubmit={handleAlunoAccess} className="space-y-4">
                <p className="-mt-2 text-xs text-[#64748B]">
                  Entre com a sua turma, nome completo e data de nascimento para consultar suas notas.
                </p>
                <Select label="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required>
                  <option value="">Selecione a turma</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </Select>
                <Input
                  label="Nome completo"
                  required
                  value={nomeAluno}
                  onChange={(e) => setNomeAluno(e.target.value)}
                  placeholder="Ex.: Maria Souza"
                  icon={<School size={16} />}
                />
                <Input
                  label="Data de nascimento"
                  type="date"
                  required
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
                <Button type="submit" size="lg" className="w-full" disabled={busy}>
                  {busy ? <Loader2 size={18} className="animate-spin" /> : "Entrar como aluno"}
                </Button>
              </form>
            ) : null}
          </div>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            Acesso restrito a usuários autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}