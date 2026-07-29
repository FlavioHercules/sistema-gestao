import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { School, Users, ArrowRight, Loader2, ClipboardList, GraduationCap, TrendingUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Turma } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/Misc";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: <TrendingUp size={18} /> },
  { to: "/professor/turmas", label: "Minhas turmas", icon: <School size={18} /> },
  { to: "/professor/notas", label: "Notas", icon: <ClipboardList size={18} /> },
  { to: "/professor/boletim", label: "Boletins", icon: <GraduationCap size={18} /> },
];

type TurmaComAlunos = Turma & { aluno_count: number };

export function ProfessorTurmas() {
  const { professor } = useAuth();
  const [turmas, setTurmas] = useState<TurmaComAlunos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professor?.id) return;

    async function fetchTurmas() {
      setLoading(true);
      try {
        // 1. Busca os vínculos do professor na tabela professor_turma_disciplina
        const { data: vinculos, error: vinculosErr } = await supabase
          .from("professor_turma_disciplina")
          .select("turmas (id, nome, ano_letivo, curso)")
          .eq("professor_id", professor.id);

        if (vinculosErr) throw vinculosErr;

        // 2. Remove turmas duplicadas (caso lecione mais de uma disciplina na mesma turma)
        const turmasUnicasMap = new Map<string, Turma>();
        (vinculos ?? []).forEach((v: any) => {
          if (v.turmas && !turmasUnicasMap.has(v.turmas.id)) {
            turmasUnicasMap.set(v.turmas.id, v.turmas as Turma);
          }
        });

        const listaTurmas = Array.from(turmasUnicasMap.values());

        // 3. Busca a contagem de alunos em paralelo para todas as turmas
        const turmasComContagem: TurmaComAlunos[] = await Promise.all(
          listaTurmas.map(async (t) => {
            const { count } = await supabase
              .from("alunos")
              .select("id", { count: "exact", head: true })
              .eq("turma_id", t.id);

            return {
              ...t,
              aluno_count: count ?? 0,
            };
          })
        );

        setTurmas(turmasComContagem);
      } catch (err) {
        console.error("Erro ao carregar turmas do professor:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTurmas();
  }, [professor?.id]);

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
              A coordenação/secretaria precisa atribuir disciplinas a você.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => (
            <Link key={t.id} to={`/professor/notas?turma=${t.id}`}>
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/30">
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
                  
                  {t.curso && (
                    <span className="mt-1 inline-block rounded bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/20">
                      {t.curso}
                    </span>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
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