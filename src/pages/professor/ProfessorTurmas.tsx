import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { School, Users, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Turma } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/Misc";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: <School size={18} /> },
  { to: "/professor/turmas", label: "Minhas turmas", icon: <School size={18} /> },
  { to: "/professor/notas", label: "Notas", icon: <School size={18} /> },
  { to: "/professor/boletim", label: "Boletins", icon: <School size={18} /> },
];

type TurmaComAlunos = Turma & { aluno_count: number };

export function ProfessorTurmas() {
  const { professor } = useAuth();
  const [turmas, setTurmas] = useState<TurmaComAlunos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professor) return;
    (async () => {
      const { data: tp } = await supabase
        .from("turma_professores")
        .select("turma: turmas(*)")
        .eq("professor_id", professor.id);
      const profTurmas = ((tp ?? []) as unknown as { turma: Turma }[]).map((r) => r.turma);

      const resultado: TurmaComAlunos[] = [];
      for (const t of profTurmas) {
        const { count } = await supabase
          .from("alunos")
          .select("id", { count: "exact", head: true })
          .eq("turma_id", t.id);
        resultado.push({ ...t, aluno_count: count ?? 0 });
      }
      setTurmas(resultado);
      setLoading(false);
    })();
  }, [professor]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Professor">
      <PageHeader
        title="Minhas turmas"
        description="Turmas vinculadas à sua conta. Selecione uma para lançar notas."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : turmas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <School size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">Nenhuma turma vinculada a você ainda.</p>
            <p className="mt-1 text-xs text-slate-500">
              A secretaria precisa associar você a uma turma.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => (
            <Link key={t.id} to={`/professor/notas?turma=${t.id}`}>
              <Card className="h-full transition-transform hover:-translate-y-0.5">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20">
                      <School size={20} />
                    </div>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {t.ano_letivo}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{t.nome}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                      <Users size={14} /> {t.aluno_count} aluno(s)
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-300">
                      Lançar notas <ArrowRight size={14} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
