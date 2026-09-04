
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  School,
  Loader2,
  Printer,
  ClipboardList,
  BookOpen,
  ImageIcon,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Turma, Aluno, Nota } from "../../lib/supabase";
import { calculateMedia } from "../../lib/school";

import { professorNavItems } from "../../lib/navigation";
import { AppLayout } from "../../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { StatBadge, PageHeader } from "../../components/ui/Misc";
import { BarChart } from "../../components/ui/Charts";

type SituacaoAluno =
  | "Aprovado"
  | "Recuperação"
  | "Reprovado"
  | "Reprovado por Faltas"
  | "Sem notas";

interface BoletimAluno {
  aluno: Aluno;
  nota: Nota | null;
  media: number | null;
  faltas: number;
  situacao: SituacaoAluno;
}

interface VinculoTurma {
  turmas?:
    | {
        id: string;
        nome: string;
        ano_letivo: number;
        curso?: string | null;
      }[]
    | null;
}

export function ProfessorBoletim() {
  const { professor } = useAuth();

  const [params, setParams] = useSearchParams();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [boletim, setBoletim] = useState<BoletimAluno[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedTurma = params.get("turma") ?? "";
  const selectedUnidade = params.get("unidade") ?? "1";

  /*
   * ============================================================
   * CARREGAR TURMAS DO PROFESSOR
   * ============================================================
   */
  useEffect(() => {
    const professorId = professor?.id;

    if (!professorId) {
      setTurmas([]);
      setLoading(false);
      return;
    }

    async function fetchTurmas() {
      try {
        const { data: vinculos, error } = await supabase
          .from("professor_turma_disciplina")
          .select(`
            turmas (
              id,
              nome,
              ano_letivo,
              curso
            )
          `)
          .eq("professor_id", professorId);

        if (error) {
          throw error;
        }

        const turmasMap = new Map<string, Turma>();

        (vinculos as VinculoTurma[] | null)?.forEach((vinculo) => {
          const turma = Array.isArray(vinculo.turmas)
            ? vinculo.turmas[0]
            : vinculo.turmas;

          if (turma && !turmasMap.has(turma.id)) {
            turmasMap.set(turma.id, turma as Turma);
          }
        });

        const profTurmas = Array.from(turmasMap.values());

        setTurmas(profTurmas);

        /*
         * Se não existe turma selecionada, seleciona a primeira.
         * Se a turma selecionada não pertence ao professor,
         * também volta para a primeira turma disponível.
         */
        const turmaSelecionadaValida = profTurmas.some(
          (turma) => turma.id === selectedTurma
        );

        if (profTurmas.length > 0 && !turmaSelecionadaValida) {
          setParams(
            {
              turma: profTurmas[0].id,
              unidade: selectedUnidade,
            },
            { replace: true }
          );
        }
      } catch (error) {
        console.error("Erro ao carregar turmas do professor:", error);
        setTurmas([]);
      }
    }

    fetchTurmas();
  }, [professor?.id]);

  /*
   * ============================================================
   * CARREGAR ALUNOS E NOTAS
   * ============================================================
   */
  useEffect(() => {
    const professorId = professor?.id;

    if (!professorId || !selectedTurma) {
      setBoletim([]);
      setLoading(false);
      return;
    }

    async function fetchBoletim() {
      setLoading(true);

      try {
        /*
         * Buscar alunos da turma
         */
        const {
          data: alunosData,
          error: alunosError,
        } = await supabase
          .from("alunos")
          .select("*")
          .eq("turma_id", selectedTurma)
          .order("nome", { ascending: true });

        if (alunosError) {
          throw alunosError;
        }

        const alunosList = (alunosData ?? []) as Aluno[];

        /*
         * Buscar notas do professor nessa turma
         */
        const {
          data: notasData,
          error: notasError,
        } = await supabase
          .from("notas")
          .select("*")
          .eq("professor_id", professorId)
          .eq("turma_id", selectedTurma);

        if (notasError) {
          throw notasError;
        }

        const notasList = (notasData ?? []) as Nota[];

        /*
         * Organizar notas por aluno
         */
        const notaByAluno = new Map<string, Nota>();

        for (const nota of notasList) {
          notaByAluno.set(nota.aluno_id, nota);
        }

        /*
         * Montar boletim
         */
        const result: BoletimAluno[] = alunosList.map((aluno) => {
          const nota = notaByAluno.get(aluno.id) ?? null;

          const media = calculateMedia([
            nota?.nota_1 ?? null,
            nota?.nota_2 ?? null,
            nota?.nota_3 ?? null,
          ]);

          const faltas = Number(nota?.faltas ?? 0);

          let situacao: SituacaoAluno = "Sem notas";

          /*
           * Regra de frequência
           */
          if (faltas > 25) {
            situacao = "Reprovado por Faltas";
          } else if (media !== null) {
            if (media >= 7) {
              situacao = "Aprovado";
            } else if (media >= 5) {
              situacao = "Recuperação";
            } else {
              situacao = "Reprovado";
            }
          }

          return {
            aluno,
            nota,
            media,
            faltas,
            situacao,
          };
        });

        setBoletim(result);
      } catch (error) {
        console.error(
          "Erro ao carregar dados do boletim:",
          error
        );

        setBoletim([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBoletim();
  }, [professor?.id, selectedTurma]);

  /*
   * ============================================================
   * TURMA ATUAL
   * ============================================================
   */
  const currentTurma = useMemo(
    () => turmas.find((turma) => turma.id === selectedTurma),
    [turmas, selectedTurma]
  );

  /*
   * ============================================================
   * RESUMO
   * ============================================================
   */
  const resumo = useMemo(() => {
    const aprov = boletim.filter(
      (aluno) => aluno.situacao === "Aprovado"
    ).length;

    const rec = boletim.filter(
      (aluno) => aluno.situacao === "Recuperação"
    ).length;

    const reprov = boletim.filter(
      (aluno) =>
        aluno.situacao === "Reprovado" ||
        aluno.situacao === "Reprovado por Faltas"
    ).length;

    const semNotas = boletim.filter(
      (aluno) => aluno.situacao === "Sem notas"
    ).length;

    return {
      aprov,
      rec,
      reprov,
      semNotas,
    };
  }, [boletim]);

  /*
   * ============================================================
   * DADOS DO GRÁFICO
   * ============================================================
   */
  const chartData = useMemo(
    () =>
      boletim
        .filter((aluno) => aluno.media !== null)
        .map((aluno) => ({
          label: aluno.aluno.nome.split(" ")[0],
          value: Number(aluno.media),
          max: 10,
        })),
    [boletim]
  );

  /*
   * ============================================================
   * BADGE DA SITUAÇÃO
   * ============================================================
   */
  function situacaoBadge(situacao: SituacaoAluno) {
    switch (situacao) {
      case "Aprovado":
        return (
          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
            Aprovado
          </span>
        );

      case "Recuperação":
        return (
          <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
            Recuperação
          </span>
        );

      case "Reprovado por Faltas":
        return (
          <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300">
            Reprovado (Faltas)
          </span>
        );

      case "Reprovado":
        return (
          <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300">
            Reprovado
          </span>
        );

      default:
        return (
          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-400">
            Sem notas
          </span>
        );
    }
  }

  return (
    <AppLayout
      navItems={professorNavItems}
      brandLabel="EduGrade"
      brandSub="Área do Professor"
    >
      <PageHeader
        title="Boletins"
        description="Visualize o desempenho e a frequência dos alunos por turma."
        action={
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/70"
          >
            <Printer size={16} />
            Imprimir
          </button>
        }
      />

      {/* ======================================================
          SELEÇÃO DE TURMA
          ====================================================== */}
      {turmas.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {turmas.map((turma) => (
            <button
              key={turma.id}
              type="button"
              onClick={() =>
                setParams({
                  turma: turma.id,
                  unidade: selectedUnidade,
                })
              }
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                selectedTurma === turma.id
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
              }`}
            >
              <School size={14} />
              {turma.nome}
            </button>
          ))}
        </div>
      )}

      {/* ======================================================
          SEM TURMAS
          ====================================================== */}
      {!loading && turmas.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap
              size={34}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="text-slate-400">
              Nenhuma turma está vinculada ao seu perfil.
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Entre em contato com a coordenação para verificar seus
              vínculos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ======================================================
          CARREGANDO
          ====================================================== */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2
            size={28}
            className="animate-spin"
          />
        </div>
      ) : turmas.length > 0 && boletim.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap
              size={32}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="text-slate-400">
              Nenhum aluno nesta turma.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ==================================================
              RESUMO
              ================================================== */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-emerald-300/80">
                Aprovados
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {resumo.aprov}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-amber-300/80">
                Recuperação
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-300">
                {resumo.rec}
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-xs text-rose-300/80">
                Reprovados
              </p>

              <p className="mt-1 text-2xl font-bold text-rose-300">
                {resumo.reprov}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400">
                Sem notas
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-300">
                {resumo.semNotas}
              </p>
            </div>
          </div>

          {/* ==================================================
              GRÁFICO
              ================================================== */}
          {chartData.length > 0 && (
            <Card className="mb-5">
              <CardHeader>
                <CardTitle>
                  Desempenho individual
                  {currentTurma
                    ? ` — ${currentTurma.nome}`
                    : ""}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <BarChart
                  data={chartData}
                  color="bg-gradient-to-t from-sky-600 to-sky-400"
                  height={180}
                />
              </CardContent>
            </Card>
          )}

          {/* ==================================================
              TABELA
              ================================================== */}
          <Card>
            <CardHeader>
              <CardTitle>
                Boletim
                {currentTurma
                  ? ` — ${currentTurma.nome}`
                  : ""}
              </CardTitle>

              <p className="mt-1 text-xs text-slate-500">
                Professor: {professor?.nome ?? "Professor"}
                {professor?.area_formacao
                  ? ` · ${professor.area_formacao}`
                  : ""}
              </p>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/90 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">
                        Aluno
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        N1
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        N2
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        N3
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Média
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Faltas
                      </th>

                      <th className="px-4 py-3 font-medium">
                        Situação
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/80">
                    {boletim.map((item) => (
                      <tr
                        key={item.aluno.id}
                        className="bg-slate-900/30 transition-colors hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">
                            {item.aluno.nome}
                          </p>

                          <p className="text-xs text-slate-500">
                            {item.aluno.matricula}
                          </p>
                        </td>

                        <td className="px-3 py-3 text-center font-mono text-slate-300">
                          {item.nota?.nota_1 != null
                            ? item.nota.nota_1
                            : "—"}
                        </td>

                        <td className="px-3 py-3 text-center font-mono text-slate-300">
                          {item.nota?.nota_2 != null
                            ? item.nota.nota_2
                            : "—"}
                        </td>

                        <td className="px-3 py-3 text-center font-mono text-slate-300">
                          {item.nota?.nota_3 != null
                            ? item.nota.nota_3
                            : "—"}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <StatBadge
                            value={item.media}
                            label="média"
                          />
                        </td>

                        <td className="px-3 py-3 text-center font-mono font-medium text-slate-300">
                          {item.faltas}
                        </td>

                        <td className="px-4 py-3">
                          {situacaoBadge(item.situacao)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}

