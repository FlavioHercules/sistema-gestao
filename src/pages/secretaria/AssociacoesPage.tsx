import { useEffect, useState } from "react";
import { ClipboardList, Loader2, Link2, Unlink, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Professor, Turma } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: <ClipboardList size={18} /> },
  { to: "/secretaria/professores", label: "Professores", icon: <ClipboardList size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <ClipboardList size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <ClipboardList size={18} /> },
  { to: "/secretaria/associacoes", label: "Associações", icon: <ClipboardList size={18} /> },
  { to: "/secretaria/usuarios", label: "Usuários", icon: <ClipboardList size={18} /> },
];

export function AssociacoesPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: p }, { data: tp }] = await Promise.all([
      supabase.from("turmas").select("*").order("nome"),
      supabase.from("professores").select("*").order("nome"),
      supabase.from("turma_professores").select("turma_id, professor_id"),
    ]);
    setTurmas((t ?? []) as Turma[]);
    setProfessores((p ?? []) as Professor[]);

    const m: Record<string, Set<string>> = {};
    for (const row of tp ?? []) {
      if (!m[row.turma_id]) m[row.turma_id] = new Set();
      m[row.turma_id].add(row.professor_id);
    }
    setMatrix(m);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(turmaId: string, professorId: string) {
    setToggling(`${turmaId}:${professorId}`);
    setError("");
    const linked = matrix[turmaId]?.has(professorId);
    try {
      if (linked) {
        const { error: err } = await supabase
          .from("turma_professores")
          .delete()
          .eq("turma_id", turmaId)
          .eq("professor_id", professorId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("turma_professores")
          .insert({ turma_id: turmaId, professor_id: professorId });
        if (err) throw err;
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setToggling(null);
    }
  }

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Associações"
        description="Vincule professores às turmas. O professor só verá as turmas associadas."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : turmas.length === 0 || professores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">
              Cadastre pelo menos uma turma e um professor para criar associações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {turmas.map((turma) => {
            const linked = matrix[turma.id] ?? new Set();
            return (
              <Card key={turma.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{turma.nome}</CardTitle>
                    <span className="text-xs text-slate-500">{turma.ano_letivo}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {professores.map((prof) => {
                      const isLinked = linked.has(prof.id);
                      const key = `${turma.id}:${prof.id}`;
                      return (
                        <button
                          key={prof.id}
                          onClick={() => toggle(turma.id, prof.id)}
                          disabled={toggling === key}
                          className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-all disabled:opacity-50 ${
                            isLinked
                              ? "border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/15"
                              : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{prof.nome}</p>
                            <p className="truncate text-xs text-slate-400">{prof.disciplina}</p>
                          </div>
                          {isLinked ? (
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-sky-500/20 text-sky-300">
                              <Check size={14} />
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-700/50 text-slate-400">
                              <Link2 size={14} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {linked.size === 0 && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <Unlink size={12} /> Nenhum professor vinculado a esta turma.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
