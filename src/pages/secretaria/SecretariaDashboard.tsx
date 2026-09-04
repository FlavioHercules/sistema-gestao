import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GraduationCap,
  School,
  Loader2,
  Printer,
  MessageSquare,
  X,
  ChevronDown,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type {
  Turma,
  Aluno,
  Horario,
  Atividade,
} from "../../lib/supabase";

import {
  calculateMedia,
  getNotasByTurma,
  getHorariosByTurma,
  getAtividadesByTurma,
} from "../../lib/school";

interface HorarioDetalhado extends Horario {
  dia_semana?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  disciplina?: {
    nome?: string | null;
  } | null;
  professor?: {
    nome?: string | null;
  } | null;
}

import { AppLayout } from "../../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { StatBadge, PageHeader } from "../../components/ui/Misc";
import { BarChart } from "../../components/ui/Charts";

const navItems = [
  {
    to: "/secretaria",
    label: "Dashboard",
    icon: School,
  },
  {
    to: "/secretaria/alunos",
    label: "Alunos",
    icon: GraduationCap,
  },
  {
    to: "/secretaria/turmas",
    label: "Turmas",
    icon: School,
  },
];

type SituacaoAluno =
  | "Aprovado"
  | "Recuperação"
  | "Reprovado"
  | "Reprovado por Faltas"
  | "Sem notas";

interface DisciplinaLinha {
  disciplinaNome: string;
  nota1: number | null;
  nota2: number | null;
  nota3: number | null;
  media: number | null;
  faltas: number;
  situacao: SituacaoAluno;
  observacao: string | null;
}

interface BoletimAluno {
  aluno: Aluno;
  disciplinas: DisciplinaLinha[];
  totalFaltasGeral: number;
  mediaGeral: number | null;
}

export function SecretariaDashboard() {
  const [params, setParams] = useSearchParams();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [boletins, setBoletins] = useState<BoletimAluno[]>([]);
  const [horarios, setHorarios] = useState<HorarioDetalhado[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);

  const [loading, setLoading] = useState(true);
  const [turmasLoading, setTurmasLoading] = useState(true);

  const [turmaSearchText, setTurmaSearchText] = useState("");
  const [turmaDropdownOpen, setTurmaDropdownOpen] = useState(false);

  const turmaDropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedTurma = params.get("turma") ?? "";

  /*
   * Fecha o dropdown quando o usuário clica fora.
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        turmaDropdownRef.current &&
        !turmaDropdownRef.current.contains(event.target as Node)
      ) {
        setTurmaDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /*
   * Carrega todas as turmas.
   */
  useEffect(() => {
    async function loadTurmas() {
      setTurmasLoading(true);

      try {
        const { data, error } = await supabase
          .from("turmas")
          .select("*")
          .order("nome", { ascending: true });

        if (error) throw error;

        const listaTurmas = (data ?? []) as Turma[];

        setTurmas(listaTurmas);

        /*
         * Se nenhuma turma estiver selecionada,
         * seleciona automaticamente a primeira.
         */
        if (listaTurmas.length > 0 && !selectedTurma) {
          setParams(
            {
              turma: listaTurmas[0].id,
            },
            { replace: true }
          );
        }
      } catch (err) {
        console.error(
          "Erro ao carregar turmas na Secretaria:",
          err
        );
      } finally {
        setTurmasLoading(false);
      }
    }

    void loadTurmas();
  }, [selectedTurma, setParams]);

  /*
   * Carrega alunos e notas da turma selecionada.
   */
  useEffect(() => {
    if (!selectedTurma) {
      setBoletins([]);
      setLoading(false);
      return;
    }

    async function loadBoletins() {
      setLoading(true);

      try {
        const { data: alunosData, error: alunosError } =
          await supabase
            .from("alunos")
            .select("*")
            .eq("turma_id", selectedTurma)
            .order("nome", { ascending: true });

        if (alunosError) throw alunosError;

        const alunosList = (alunosData ?? []) as Aluno[];

        const notasList = await getNotasByTurma(selectedTurma);

        const resultado: BoletimAluno[] = alunosList.map((aluno) => {
          const notasDoAluno = (notasList ?? []).filter(
            (nota) => nota.aluno_id === aluno.id
          );

          const disciplinas: DisciplinaLinha[] = notasDoAluno.map(
            (nota) => {
              const media = calculateMedia([
                nota.nota_1,
                nota.nota_2,
                nota.nota_3,
              ]);

              const faltas = nota.faltas ?? 0;
              const observacao = nota.observacao || null;

              let situacao: SituacaoAluno = "Sem notas";

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
                disciplinaNome:
                  nota.disciplina?.nome ||
                  "Disciplina não especificada",

                nota1: nota.nota_1,
                nota2: nota.nota_2,
                nota3: nota.nota_3,

                media,
                faltas,
                situacao,
                observacao,
              };
            }
          );

          const totalFaltasGeral = disciplinas.reduce(
            (total, disciplina) =>
              total + disciplina.faltas,
            0
          );

          const mediasValidas = disciplinas
            .map((disciplina) => disciplina.media)
            .filter(
              (media): media is number => media !== null
            );

          const mediaGeral =
            mediasValidas.length > 0
              ? mediasValidas.reduce(
                  (total, media) => total + media,
                  0
                ) / mediasValidas.length
              : null;

          return {
            aluno,
            disciplinas,
            totalFaltasGeral,
            mediaGeral,
          };
        });

        setBoletins(resultado);
      } catch (err) {
        console.error(
          "Erro ao carregar boletins:",
          err
        );

        setBoletins([]);
      } finally {
        setLoading(false);
      }
    }

    void loadBoletins();
  }, [selectedTurma]);

  /*
   * Carrega horários e atividades.
   */
  useEffect(() => {
    if (!selectedTurma) {
      setHorarios([]);
      setAtividades([]);
      return;
    }

    async function loadComplementos() {
      try {
        const [
          horariosData,
          atividadesData,
        ] = await Promise.all([
          getHorariosByTurma(selectedTurma),
          getAtividadesByTurma(selectedTurma),
        ]);

        setHorarios(
          Array.isArray(horariosData)
            ? horariosData
            : []
        );

        setAtividades(
          Array.isArray(atividadesData)
            ? atividadesData
            : []
        );
      } catch (err) {
        console.error(
          "Erro ao carregar horários e atividades:",
          err
        );

        setHorarios([]);
        setAtividades([]);
      }
    }

    void loadComplementos();
  }, [selectedTurma]);

  /*
   * Turma atualmente selecionada.
   */
  const currentTurma = useMemo(
    () =>
      turmas.find(
        (turma) => turma.id === selectedTurma
      ),
    [turmas, selectedTurma]
  );

  /*
   * Lista filtrada do dropdown.
   */
  const filteredTurmasList = useMemo(() => {
    const search = turmaSearchText
      .trim()
      .toLowerCase();

    if (!search) return turmas;

    return turmas.filter((turma) =>
      turma.nome.toLowerCase().includes(search)
    );
  }, [turmas, turmaSearchText]);

  /*
   * Resumo das situações.
   */
  const resumo = useMemo(() => {
    let aprov = 0;
    let rec = 0;
    let reprov = 0;
    let semNotas = 0;

    boletins.forEach((boletim) => {
      if (boletim.disciplinas.length === 0) {
        semNotas++;
        return;
      }

      boletim.disciplinas.forEach((disciplina) => {
        switch (disciplina.situacao) {
          case "Aprovado":
            aprov++;
            break;

          case "Recuperação":
            rec++;
            break;

          case "Reprovado":
          case "Reprovado por Faltas":
            reprov++;
            break;

          default:
            semNotas++;
        }
      });
    });

    return {
      aprov,
      rec,
      reprov,
      semNotas,
    };
  }, [boletins]);

  /*
   * Dados do gráfico.
   */
  const chartData = useMemo(
    () =>
      boletins
        .filter(
          (boletim) =>
            boletim.mediaGeral !== null
        )
        .map((boletim) => ({
          label: boletim.aluno.nome.split(" ")[0],
          value: boletim.mediaGeral as number,
          max: 10,
        })),
    [boletins]
  );

  /*
   * Impressão de um boletim individual.
   */
  function imprimirBoletimIndividual(
    alunoId: string
  ) {
    const elemento = document.getElementById(
      `boletim-${alunoId}`
    );

    if (!elemento) return;

    elemento.classList.add("printing-active");

    window.print();

    setTimeout(() => {
      elemento.classList.remove(
        "printing-active"
      );
    }, 500);
  }

  /*
   * Badge da situação.
   */
  function situacaoBadge(situacao: SituacaoAluno) {
    const styles: Record<
      SituacaoAluno,
      string
    > = {
      Aprovado:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

      Recuperação:
        "bg-amber-500/10 text-amber-400 border-amber-500/20",

      Reprovado:
        "bg-rose-500/10 text-rose-400 border-rose-500/20",

      "Reprovado por Faltas":
        "bg-rose-500/10 text-rose-400 border-rose-500/20",

      "Sem notas":
        "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };

    const labels: Record<
      SituacaoAluno,
      string
    > = {
      Aprovado: "Aprovado",
      Recuperação: "Recuperação",
      Reprovado: "Reprovado",
      "Reprovado por Faltas":
        "Reprovado (Faltas)",
      "Sem notas": "Sem notas",
    };

    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[situacao]}`}
      >
        {labels[situacao]}
      </span>
    );
  }

  function selecionarTurma(id: string) {
    setParams(
      {
        turma: id,
      },
      { replace: true }
    );

    setTurmaDropdownOpen(false);
    setTurmaSearchText("");
  }

  function limparTurma() {
    setParams({}, { replace: true });
    setTurmaDropdownOpen(false);
    setTurmaSearchText("");
  }

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Painel Geral da Secretaria"
        description="Acompanhamento do rendimento escolar, disciplinas, notas e pareceres por aluno."
        action={
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/70"
          >
            <Printer size={16} />
            Imprimir Todos os Boletins
          </button>
        }
      />

      {/* Filtro de turma */}
      <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
            <School size={20} />
          </div>

          <div>
            <span className="block text-xs text-slate-400">
              Turma selecionada
            </span>

            <span className="text-sm font-semibold text-white">
              {currentTurma
                ? currentTurma.nome
                : "Nenhuma turma selecionada"}
            </span>
          </div>
        </div>

        <div
          ref={turmaDropdownRef}
          className="relative w-full sm:w-72"
        >
          <button
            type="button"
            onClick={() =>
              setTurmaDropdownOpen(
                (value) => !value
              )
            }
            className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 shadow-sm transition-colors hover:border-slate-500"
          >
            <span className="truncate">
              {currentTurma
                ? currentTurma.nome
                : "Filtrar por turma..."}
            </span>

            <div className="flex items-center gap-2">
              {selectedTurma && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    limparTurma();
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      limparTurma();
                    }
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </span>
              )}

              <ChevronDown
                size={15}
                className="text-slate-400"
              />
            </div>
          </button>

          {turmaDropdownOpen && (
            <div className="absolute right-0 top-12 z-50 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              <div className="border-b border-slate-800 p-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Digite para buscar turma..."
                  value={turmaSearchText}
                  onChange={(event) =>
                    setTurmaSearchText(
                      event.target.value
                    )
                  }
                  className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-sky-400"
                />
              </div>

              <div className="max-h-60 overflow-y-auto p-1">
                {turmasLoading ? (
                  <div className="flex items-center justify-center py-6 text-slate-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  </div>
                ) : filteredTurmasList.length ===
                  0 ? (
                  <div className="px-2 py-3 text-center text-xs text-slate-500">
                    Nenhuma turma encontrada.
                  </div>
                ) : (
                  filteredTurmasList.map(
                    (turma) => (
                      <button
                        key={turma.id}
                        type="button"
                        onClick={() =>
                          selecionarTurma(
                            turma.id
                          )
                        }
                        className={`w-full rounded px-2.5 py-2 text-left text-xs transition-colors ${
                          selectedTurma ===
                          turma.id
                            ? "bg-sky-500/20 font-medium text-sky-300"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="block">
                          {turma.nome}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          Ano letivo:{" "}
                          {turma.ano_letivo}
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2
            size={28}
            className="animate-spin"
          />
        </div>
      ) : boletins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap
              size={32}
              className="mx-auto mb-3 text-slate-600"
            />

            <p className="text-slate-400">
              {selectedTurma
                ? "Nenhum aluno registrado para esta turma."
                : "Selecione uma turma para visualizar os dados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Métricas */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-emerald-300/80">
                Matérias Aprovadas
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {resumo.aprov}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-amber-300/80">
                Em Recuperação
              </p>

              <p className="mt-1 text-2xl font-bold text-amber-300">
                {resumo.rec}
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-xs text-rose-300/80">
                Matérias Reprovadas
              </p>

              <p className="mt-1 text-2xl font-bold text-rose-300">
                {resumo.reprov}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400">
                Pendentes de Nota
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-300">
                {resumo.semNotas}
              </p>
            </div>
          </div>

          {/* Gráfico */}
          {chartData.length > 0 && (
            <div className="print:hidden">
              <Card className="mb-5">
                <CardHeader>
                  <CardTitle>
                    Médias Gerais por Aluno —{" "}
                    {currentTurma?.nome}
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
            </div>
          )}

          {/* Horários e atividades */}
          <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr] print:hidden">
            <Card>
              <CardHeader>
                <CardTitle>
                  Grade de Horários
                </CardTitle>
              </CardHeader>

              <CardContent>
                {horarios.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nenhum horário cadastrado
                    para esta turma.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-left text-xs uppercase tracking-wider text-slate-400">
                          <th className="px-3 py-3">
                            Dia
                          </th>

                          <th className="px-3 py-3">
                            Horário
                          </th>

                          <th className="px-3 py-3">
                            Disciplina
                          </th>

                          <th className="px-3 py-3">
                            Professor
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800/60">
                        {horarios.map(
                          (horario) => (
                            <tr
                              key={horario.id}
                              className="bg-slate-900/30 transition-colors hover:bg-slate-800/40"
                            >
                              <td className="px-3 py-3 text-slate-200">
                                {
                                  horario.dia_semana
                                }
                              </td>

                              <td className="px-3 py-3 text-slate-200">
                                {
                                  horario.hora_inicio
                                }{" "}
                                -{" "}
                                {
                                  horario.hora_fim
                                }
                              </td>

                              <td className="px-3 py-3 text-slate-200">
                                {horario
                                  .disciplina
                                  ?.nome ||
                                  "Disciplina não informada"}
                              </td>

                              <td className="px-3 py-3 text-slate-200">
                                {horario
                                  .professor
                                  ?.nome ||
                                  "Professor não definido"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Atividades e Simulados
                </CardTitle>
              </CardHeader>

              <CardContent>
                {atividades.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nenhuma atividade ou
                    simulado agendado para
                    esta turma.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {atividades.map(
                      (atividade) => (
                        <div
                          key={atividade.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {
                                  atividade.titulo
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                {atividade
                                  .disciplina
                                  ?.nome ||
                                  "Sem disciplina"}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                atividade.tipo ===
                                "simulado"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-sky-500/15 text-sky-300"
                              }`}
                            >
                              {atividade.tipo ===
                              "simulado"
                                ? "Simulado"
                                : "Atividade"}
                            </span>
                          </div>

                          <p className="mt-3 truncate text-sm text-slate-300">
                            {atividade.descricao ||
                              "Sem descrição adicional."}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>
                              Prazo:{" "}
                              {atividade.prazo
                                ? atividade.prazo.split(
                                    "T"
                                  )[0]
                                : "Indefinido"}
                            </span>

                            <span>
                              Prof.:{" "}
                              {atividade
                                .professor
                                ?.nome ||
                                "Não informado"}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Boletins */}
          <div className="space-y-6">
            {boletins.map(
              ({
                aluno,
                disciplinas,
                totalFaltasGeral,
                mediaGeral,
              }) => (
                <div
                  key={aluno.id}
                  id={`boletim-${aluno.id}`}
                >
                  <Card className="overflow-hidden print:mb-8 print:border print:border-slate-300 print:shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 bg-slate-900/60 py-4 print:border-slate-300 print:bg-slate-100">
                      <div>
                        <CardTitle className="text-lg text-white print:text-slate-900">
                          {aluno.nome}
                        </CardTitle>

                        <p className="text-xs text-slate-400 print:text-slate-600">
                          Matrícula:{" "}
                          {aluno.matricula ||
                            "N/A"}{" "}
                          | Turma:{" "}
                          {currentTurma?.nome ||
                            "N/A"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            imprimirBoletimIndividual(
                              aluno.id
                            )
                          }
                          className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
                        >
                          <Printer size={13} />
                          Imprimir Boletim
                        </button>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="block text-xs text-slate-400 print:text-slate-600">
                              Total Faltas:
                            </span>

                            <span
                              className={`text-sm font-bold ${
                                totalFaltasGeral >
                                25
                                  ? "text-rose-400 print:text-rose-600"
                                  : "text-slate-200 print:text-slate-900"
                              }`}
                            >
                              {totalFaltasGeral}
                            </span>
                          </div>

                          <div>
                            <span className="block text-xs text-slate-400 print:text-slate-600">
                              Média Geral:
                            </span>

                            <StatBadge
                              value={mediaGeral}
                              label="geral"
                            />
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/40 text-left text-xs uppercase tracking-wider text-slate-400 print:border-slate-300 print:bg-slate-200 print:text-slate-700">
                              <th className="px-4 py-3 font-medium">
                                Disciplina
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

                              <th className="px-4 py-3 font-medium">
                                Observação do Professor
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                            {disciplinas.length ===
                            0 ? (
                              <tr>
                                <td
                                  colSpan={8}
                                  className="px-4 py-6 text-center text-slate-500"
                                >
                                  Nenhuma disciplina
                                  lançada para
                                  este aluno
                                  nesta turma.
                                </td>
                              </tr>
                            ) : (
                              disciplinas.map(
                                (
                                  disciplina,
                                  index
                                ) => (
                                  <tr
                                    key={`${aluno.id}-${disciplina.disciplinaNome}-${index}`}
                                    className="bg-slate-900/20 transition-colors hover:bg-slate-800/30 print:bg-white"
                                  >
                                    <td className="px-4 py-3 font-medium text-slate-200 print:text-slate-900">
                                      {
                                        disciplina.disciplinaNome
                                      }
                                    </td>

                                    <td className="px-3 py-3 text-center font-mono text-slate-300 print:text-slate-800">
                                      {disciplina.nota1 !==
                                      null
                                        ? disciplina.nota1
                                        : "—"}
                                    </td>

                                    <td className="px-3 py-3 text-center font-mono text-slate-300 print:text-slate-800">
                                      {disciplina.nota2 !==
                                      null
                                        ? disciplina.nota2
                                        : "—"}
                                    </td>

                                    <td className="px-3 py-3 text-center font-mono text-slate-300 print:text-slate-800">
                                      {disciplina.nota3 !==
                                      null
                                        ? disciplina.nota3
                                        : "—"}
                                    </td>

                                    <td className="px-3 py-3 text-center">
                                      <StatBadge
                                        value={
                                          disciplina.media
                                        }
                                        label="média"
                                      />
                                    </td>

                                    <td className="px-3 py-3 text-center font-mono text-slate-300 print:text-slate-800">
                                      {
                                        disciplina.faltas
                                      }
                                    </td>

                                    <td className="px-4 py-3">
                                      {situacaoBadge(
                                        disciplina.situacao
                                      )}
                                    </td>

                                    <td className="max-w-xs px-4 py-3 text-xs text-slate-400 print:text-slate-600">
                                      {disciplina.observacao ? (
                                        <span
                                          className="inline-flex items-center gap-1.5 text-slate-300 print:text-slate-800"
                                          title={
                                            disciplina.observacao
                                          }
                                        >
                                          <MessageSquare
                                            size={
                                              13
                                            }
                                            className="shrink-0 text-sky-400 print:text-sky-600"
                                          />

                                          <span className="truncate">
                                            {
                                              disciplina.observacao
                                            }
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">
                                          —
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}