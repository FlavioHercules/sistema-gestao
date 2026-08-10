
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  School,
  Users,
  ArrowRight,
  Loader2,
  LayoutDashboard,
  ClipboardList,
  BookOpen,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Turma } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/Misc";

const navItems = [
  {
    to: "/professor",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/professor/turmas",
    label: "Minhas turmas",
    icon: School,
  },
  {
    to: "/professor/notas",
    label: "Notas",
    icon: ClipboardList,
  },
  {
    to: "/professor/boletim",
    label: "Boletins",
    icon: BookOpen,
  },
  {
    to: "/professor/atividades",
    label: "Atividades",
    icon: ClipboardList,
  },
];

type TurmaComAlunos = Turma & {
  aluno_count: number;
};

export function ProfessorTurmas() {
  const { professor } = useAuth();

  const [turmas, setTurmas] = useState<TurmaComAlunos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const professorId = professor?.id;

    if (!professorId) {
      setLoading(false);
      return;
    }

    async function fetchTurmas() {
      setLoading(true);

      try {
        // Busca todas as turmas vinculadas ao professor
        const { data: vinculos, error: vinculosErr } = await supabase
          .from("professor_turma_disciplina")
          .select(
            "turmas (id, nome, ano_letivo, curso)"
          )
          .eq("professor_id", professorId);

        if (vinculosErr) {
          throw vinculosErr;
        }

        // Remove turmas duplicadas caso o professor
        // lecione mais de uma disciplina na mesma turma.
        const turmasUnicasMap = new Map<string, Turma>();

        (vinculos ?? []).forEach((v: any) => {
          const turma = v?.turmas;

          if (turma?.id && !turmasUnicasMap.has(turma.id)) {
            turmasUnicasMap.set(turma.id, turma as Turma);
          }
        });

        const listaTurmas = Array.from(turmasUnicasMap.values());

        // Busca a quantidade de alunos de cada turma.
        const turmasComContagem: TurmaComAlunos[] = await Promise.all(
          listaTurmas.map(async (turma) => {
            const { count, error: countError } = await supabase
              .from("alunos")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("turma_id", turma.id);

            if (countError) {
              console.error(
                `Erro ao contar alunos da turma ${turma.nome}:`,
                countError
              );
            }

            return {
              ...turma,
              aluno_count: count ?? 0,
            };
          })
        );

        setTurmas(turmasComContagem);
      } catch (err) {
        console.error(
          "Erro ao carregar turmas do professor:",
          err
        );

        setTurmas([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchTurmas();
  }, [professor?.id]);

  return (
    <AppLayout
      navItems={navItems}
      brandLabel="EduGrade"
      brandSub="Área do Professor"
    >
      <PageHeader
        title="Minhas turmas"
        description="Visualize as turmas vinculadas a você e acesse rapidamente o lançamento de notas."
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2
            size={28}
            className="animate-spin"
          />
        </div>
      ) : turmas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <School
              size={32}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="text-slate-400">
              Nenhuma turma vinculada a você ainda.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              A coordenação ou secretaria precisa atribuir
              disciplinas a você.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((turma) => (
            <Link
              key={turma.id}
              to={`/professor/notas?turma=${encodeURIComponent(
                turma.id
              )}`}
              className="block h-full"
            >
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/30 hover:bg-slate-900/80">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20">
                      <School size={20} />
                    </div>

                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      {turma.ano_letivo}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {turma.nome}
                  </h3>

                  {turma.curso && (
                    <span className="mt-1 inline-block rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                      {turma.curso}
                    </span>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                      <Users size={14} />
                      {turma.aluno_count}{" "}
                      {turma.aluno_count === 1
                        ? "aluno"
                        : "alunos"}
                    </span>

                    <span className="inline-flex items-center gap-1 text-sm font-medium text-sky-300">
                      Lançar notas
                      <ArrowRight size={14} />
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

