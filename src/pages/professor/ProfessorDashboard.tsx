
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  School,
  ClipboardList,
  TrendingUp,
  GraduationCap,
  ArrowRight,
  ImageIcon,
  BookOpen,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { StatCard } from "../../components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/Charts";
import { PageHeader } from "../../components/ui/Misc";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    to: "/professor",
    label: "Dashboard",
    icon: School,
  },
  {
    to: "/professor/turmas",
    label: "Minhas turmas",
    icon: GraduationCap,
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
    icon: ImageIcon,
  },
];

interface TurmaInfo {
  id: string;
  nome: string;
  ano_letivo: number;
  aluno_count: number;
}

interface Vinculo {
  turma_id: string;
  turmas:
    | {
        id: string;
        nome: string;
        ano_letivo: number;
      }
    | null;
}

interface Nota {
  media: number | string | null;
  turma_id: string;
}

export function ProfessorDashboard() {
  const { professor } = useAuth();

  const [turmas, setTurmas] = useState<TurmaInfo[]>([]);
  const [stats, setStats] = useState({
    turmas: 0,
    alunos: 0,
    notas: 0,
    mediaGeral: 0,
  });

  const [mediaPorTurma, setMediaPorTurma] = useState<
    { label: string; value: number }[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const professorId = professor?.id;

    if (!professorId) {
      setLoading(false);
      return;
    }

    async function fetchDashboardData() {
      setLoading(true);

      try {
        /*
         * 1. BUSCAR TURMAS DO PROFESSOR
         */
        const { data: vinculos, error: vinculosError } = await supabase
          .from("professor_turma_disciplina")
          .select(`
            turma_id,
            turmas (
              id,
              nome,
              ano_letivo
            )
          `)
          .eq("professor_id", professorId);

        if (vinculosError) {
          throw vinculosError;
        }

        const turmasMap = new Map<
          string,
          {
            id: string;
            nome: string;
            ano_letivo: number;
          }
        >();

        (vinculos as Vinculo[] | null)?.forEach((vinculo) => {
          const turma = vinculo.turmas;

          if (turma && !turmasMap.has(turma.id)) {
            turmasMap.set(turma.id, turma);
          }
        });

        const profTurmas = Array.from(turmasMap.values());
        const turmaIds = profTurmas.map((turma) => turma.id);

        /*
         * 2. BUSCAR QUANTIDADE DE ALUNOS
         */
        const turmasComAlunos: TurmaInfo[] = await Promise.all(
          profTurmas.map(async (turma) => {
            const { count, error } = await supabase
              .from("alunos")
              .select("id", {
                count: "exact",
                head: true,
              })
              .eq("turma_id", turma.id);

            if (error) {
              console.error(
                `Erro ao buscar alunos da turma ${turma.nome}:`,
                error
              );
            }

            return {
              ...turma,
              aluno_count: count ?? 0,
            };
          })
        );

        const totalAlunos = turmasComAlunos.reduce(
          (total, turma) => total + turma.aluno_count,
          0
        );

        setTurmas(turmasComAlunos);

        /*
         * 3. SE NÃO HOUVER TURMAS
         */
        if (turmaIds.length === 0) {
          setStats({
            turmas: 0,
            alunos: 0,
            notas: 0,
            mediaGeral: 0,
          });

          setMediaPorTurma([]);
          return;
        }

        /*
         * 4. BUSCAR NOTAS DO PROFESSOR
         *
         * Importante:
         * também filtramos pelas turmas do professor.
         */
        const { data: notas, count: notasCount, error: notasError } =
          await supabase
            .from("notas")
            .select("media, turma_id", {
              count: "exact",
            })
            .eq("professor_id", professorId)
            .in("turma_id", turmaIds)
            .not("media", "is", null);

        if (notasError) {
          throw notasError;
        }

        const arrayNotas = (notas as Nota[] | null) ?? [];

        /*
         * 5. MÉDIA GERAL
         */
        const mediaGeral =
          arrayNotas.length > 0
            ? arrayNotas.reduce(
                (acc, nota) => acc + Number(nota.media ?? 0),
                0
              ) / arrayNotas.length
            : 0;

        /*
         * 6. MÉDIA POR TURMA
         */
        const agrupamentoPorTurma = new Map<
          string,
          {
            soma: number;
            count: number;
          }
        >();

        for (const nota of arrayNotas) {
          const turma = profTurmas.find(
            (item) => item.id === nota.turma_id
          );

          if (!turma) continue;

          const atual = agrupamentoPorTurma.get(turma.id) ?? {
            soma: 0,
            count: 0,
          };

          atual.soma += Number(nota.media ?? 0);
          atual.count += 1;

          agrupamentoPorTurma.set(turma.id, atual);
        }

        const barrasGrafico = Array.from(
          agrupamentoPorTurma.entries()
        ).map(([turmaId, valores]) => {
          const turma = profTurmas.find(
            (item) => item.id === turmaId
          );

          return {
            label: turma?.nome ?? "Turma",
            value:
              valores.count > 0
                ? Number((valores.soma / valores.count).toFixed(1))
                : 0,
          };
        });

        setMediaPorTurma(barrasGrafico);

        /*
         * 7. ESTATÍSTICAS
         */
        setStats({
          turmas: profTurmas.length,
          alunos: totalAlunos,
          notas: notasCount ?? 0,
          mediaGeral: Number(mediaGeral.toFixed(1)),
        });
      } catch (error) {
        console.error(
          "Erro ao carregar dados do dashboard do professor:",
          error
        );

        setTurmas([]);
        setMediaPorTurma([]);

        setStats({
          turmas: 0,
          alunos: 0,
          notas: 0,
          mediaGeral: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [professor?.id]);

  return (
    <AppLayout
      navItems={navItems}
      brandLabel="EduGrade"
      brandSub="Área do Professor"
    >
      <PageHeader
        title={`Olá, ${
          professor?.nome?.split(" ")[0] ?? "Professor"
        }`}
        description={`${
          professor?.disciplina ?? "Docente"
        } — aqui está o resumo da sua atividade`}
      />

      {/* ESTATÍSTICAS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Minhas turmas"
          value={stats.turmas}
          icon={<School size={22} />}
          accent="sky"
        />

        <StatCard
          label="Alunos"
          value={stats.alunos}
          icon={<GraduationCap size={22} />}
          accent="emerald"
        />

        <StatCard
          label="Notas lançadas"
          value={stats.notas}
          icon={<ClipboardList size={22} />}
          accent="amber"
        />

        <StatCard
          label="Média geral"
          value={stats.mediaGeral.toFixed(1)}
          icon={<TrendingUp size={22} />}
          accent="violet"
          hint="Média das suas notas lançadas"
        />
      </div>

      {/* MURAL */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Mural de Grades Oficiais</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-slate-300">
            <p className="text-slate-400">
              Utilize o painel de turmas para verificar comunicados e
              fotos de grades enviadas pela coordenação.
            </p>

            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <ImageIcon
                size={20}
                className="shrink-0 text-sky-400"
              />

              <div className="text-xs">
                <p className="font-medium text-white">
                  Fotos e Documentos de Horários
                </p>

                <p className="text-slate-400">
                  As imagens oficiais anexadas pela coordenação ficam
                  disponíveis para consulta rápida.
                </p>
              </div>
            </div>

            <Link
              to="/professor/turmas"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-sky-500"
            >
              Ver minhas turmas e detalhes
              <ArrowRight size={14} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICO + TURMAS */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Desempenho por turma</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">
                Carregando dados do gráfico...
              </p>
            ) : mediaPorTurma.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma nota lançada ainda.
              </p>
            ) : (
              <BarChart
                data={mediaPorTurma.map((media) => ({
                  label: media.label,
                  value: media.value,
                  max: 10,
                }))}
                color="bg-gradient-to-t from-emerald-600 to-emerald-400"
                height={200}
              />
            )}
          </CardContent>
        </Card>

        {/* TURMAS */}
        <Card>
          <CardHeader>
            <CardTitle>Minhas turmas</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">
                Carregando turmas...
              </p>
            ) : turmas.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma turma vinculada a você.
              </p>
            ) : (
              <div className="space-y-2">
                {turmas.slice(0, 5).map((turma) => (
                  <Link
                    key={turma.id}
                    to={`/professor/notas?turma=${turma.id}`}
                    className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3.5 py-2.5 transition-colors hover:border-sky-500/40 hover:bg-slate-800/70"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {turma.nome}
                      </p>

                      <p className="text-xs text-slate-500">
                        {turma.aluno_count} aluno(s) ·{" "}
                        {turma.ano_letivo}
                      </p>
                    </div>

                    <ArrowRight
                      size={15}
                      className="text-slate-500 transition-colors group-hover:text-sky-300"
                    />
                  </Link>
                ))}

                {turmas.length > 5 && (
                  <Link
                    to="/professor/turmas"
                    className="block rounded-lg px-3.5 py-2 text-center text-sm text-sky-300 hover:bg-slate-800/50"
                  >
                    Ver todas as turmas
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

