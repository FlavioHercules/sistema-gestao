import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { GraduationCap, School, Loader2, Printer, Award, AlertCircle, TrendingUp, MessageSquare, Users, X, ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Turma, Aluno, Horario, Atividade } from "../../lib/supabase";
import { calculateMedia, getNotasByTurma, getHorariosByTurma, getAtividadesByTurma } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { StatBadge, PageHeader } from "../../components/ui/Misc";
import { BarChart } from "../../components/ui/Charts";

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: <TrendingUp size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <Users size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <School size={18} /> },
];

type SituacaoAluno = "Aprovado" | "Recuperação" | "Reprovado" | "Reprovado por Faltas" | "Sem notas";

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
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para o filtro inteligente de turmas (Substituiu a fileira poluída)
  const [turmaSearchText, setTurmaSearchText] = useState("");
  const [turmaDropdownOpen, setTurmaDropdownOpen] = useState(false);
  const turmaDropdownRef = useRef<HTMLDivElement>(null);

  const selectedTurma = params.get("turma") ?? "";

  // Fecha o dropdown de turmas ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (turmaDropdownRef.current && !turmaDropdownRef.current.contains(event.target as Node)) {
        setTurmaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Carrega todas as turmas cadastradas
  useEffect(() => {
    (async () => {
      try {
        const { data: turmasData, error } = await supabase
          .from("turmas")
          .select("*")
          .order("nome", { ascending: true });

        if (error) throw error;

        const listaTurmas = (turmasData ?? []) as Turma[];
        setTurmas(listaTurmas);

        if (listaTurmas.length > 0 && !selectedTurma) {
          setParams({ turma: listaTurmas[0].id }, { replace: true });
        }
      } catch (err) {
        console.error("Erro ao carregar turmas na Secretaria:", err);
      }
    })();
  }, []);

  // 2. Carrega alunos, disciplinas e notas da turma selecionada
  useEffect(() => {
    if (!selectedTurma) {
      setBoletins([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const { data: aluData, error: errAlunos } = await supabase
          .from("alunos")
          .select("*")
          .eq("turma_id", selectedTurma)
          .order("nome", { ascending: true });

        if (errAlunos) console.error("Erro ao buscar alunos:", errAlunos);
        const alunosList = (aluData ?? []) as Aluno[];

        const notasList = await getNotasByTurma(selectedTurma);

        const result: BoletimAluno[] = alunosList.map((aluno) => {
          const notasDoAluno = notasList.filter((n) => n.aluno_id === aluno.id);

          const disciplinas: DisciplinaLinha[] = notasDoAluno.map((n) => {
            const media = calculateMedia([n.nota_1, n.nota_2, n.nota_3]);
            const faltas = n.faltas ?? 0;
            const obs = n.observacao || null;

            let situacao: SituacaoAluno = "Sem notas";
            if (faltas > 25) {
              situacao = "Reprovado por Faltas";
            } else if (media !== null) {
              if (media >= 7) situacao = "Aprovado";
              else if (media >= 5) situacao = "Recuperação";
              else situacao = "Reprovado";
            }

            return {
              disciplinaNome: n.disciplina?.nome || "Disciplina não especificada",
              nota1: n.nota_1,
              nota2: n.nota_2,
              nota3: n.nota_3,
              media,
              faltas,
              situacao,
              observacao: obs,
            };
          });

          const totalFaltasGeral = disciplinas.reduce((acc, d) => acc + d.faltas, 0);
          const mediasValidas = disciplinas.map((d) => d.media).filter((m): m is number => m !== null);
          const mediaGeral = mediasValidas.length > 0
            ? mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length
            : null;

          return {
            aluno,
            disciplinas,
            totalFaltasGeral,
            mediaGeral,
          };
        });

        setBoletins(result);
      } catch (err) {
        console.error("Erro ao carregar dados do painel da secretaria:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTurma]);

  useEffect(() => {
    if (!selectedTurma) {
      setHorarios([]);
      setAtividades([]);
      return;
    }

    (async () => {
      try {
        const [loadedHorarios, loadedAtividades] = await Promise.all([
          getHorariosByTurma(selectedTurma),
          getAtividadesByTurma(selectedTurma),
        ]);

        setHorarios(loadedHorarios);
        setAtividades(loadedAtividades);
      } catch (err) {
        console.error("Erro ao carregar horários e atividades:", err);
        setHorarios([]);
        setAtividades([]);
      }
    })();
  }, [selectedTurma]);

  const currentTurma = useMemo(
    () => turmas.find((t) => t.id === selectedTurma),
    [turmas, selectedTurma]
  );

  const filteredTurmasList = turmas.filter(t => 
    t.nome.toLowerCase().includes(turmaSearchText.toLowerCase())
  );

  const resumo = useMemo(() => {
    let aprov = 0;
    let rec = 0;
    let reprov = 0;
    let semNotas = 0;

    boletins.forEach((b) => {
      if (b.disciplinas.length === 0) {
        semNotas++;
      } else {
        b.disciplinas.forEach((d) => {
          if (d.situacao === "Aprovado") aprov++;
          else if (d.situacao === "Recuperação") rec++;
          else if (d.situacao === "Reprovado" || d.situacao === "Reprovado por Faltas") reprov++;
          else semNotas++;
        });
      }
    });

    return { aprov, rec, reprov, semNotas };
  }, [boletins]);

  const chartData = useMemo(
    () =>
      boletins
        .filter((b) => b.mediaGeral !== null)
        .map((b) => ({
          label: b.aluno.nome.split(" ")[0],
          value: b.mediaGeral as number,
          max: 10,
        })),
    [boletins]
  );

  function imprimirBoletimIndividual(alunoId: string) {
    const elemento = document.getElementById(`boletim-${alunoId}`);
    if (!elemento) return;

    elemento.classList.add("printing-active");
    window.print();
    setTimeout(() => {
      elemento.classList.remove("printing-active");
    }, 500);
  }

  function situacaoBadge(s: SituacaoAluno) {
    if (s === "Aprovado") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 print:text-emerald-700 print:bg-emerald-100">
          <Award size={11} /> Aprovado
        </span>
      );
    }
    if (s === "Recuperação") {
      return (
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 print:text-amber-700 print:bg-amber-100">
          Recuperação
        </span>
      );
    }
    if (s === "Reprovado por Faltas") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400 print:text-rose-700 print:bg-rose-100">
          <AlertCircle size={11} /> Reprovado (Faltas)
        </span>
      );
    }
    if (s === "Reprovado") {
      return (
        <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300 print:text-rose-700 print:bg-rose-100">
          Reprovado
        </span>
      );
    }
    return (
      <span className="rounded-md bg-slate-700/60 px-2 py-0.5 text-xs font-medium text-slate-400">
        Sem notas
      </span>
    );
  }

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <div className="print:hidden">
        <PageHeader
          title="Painel Geral da Secretaria"
          description="Acompanhamento do rendimento escolar, disciplinas, notas e pareceres por aluno."
          action={
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/70 transition-colors"
            >
              <Printer size={15} /> Imprimir Todos os Boletins
            </button>
          }
        />

        {/* Filtro Inteligente de Turmas Substituindo a Poluição Visual */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <School size={20} />
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Turma Selecionada</span>
              <span className="text-sm font-semibold text-white">{currentTurma ? currentTurma.nome : "Selecione uma turma"}</span>
            </div>
          </div>

          <div className="relative w-full sm:w-72" ref={turmaDropdownRef}>
            <div 
              onClick={() => setTurmaDropdownOpen(!turmaDropdownOpen)}
              className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 hover:border-slate-500 transition-colors shadow-sm"
            >
              <span className="truncate">
                {currentTurma ? currentTurma.nome : "Filtrar por turma..."}
              </span>
              <div className="flex items-center gap-2">
                {selectedTurma && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setParams({});
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
                <ChevronDown size={15} className="text-slate-400" />
              </div>
            </div>

            {turmaDropdownOpen && (
              <div className="absolute right-0 top-12 z-50 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                <div className="p-2 border-b border-slate-800">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite para buscar turma..."
                    value={turmaSearchText}
                    onChange={(e) => setTurmaSearchText(e.target.value)}
                    className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto p-1">
                  {filteredTurmasList.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-slate-500">Nenhuma turma encontrada</div>
                  ) : (
                    filteredTurmasList.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setParams({ turma: t.id });
                          setTurmaDropdownOpen(false);
                          setTurmaSearchText("");
                        }}
                        className={`cursor-pointer rounded px-2.5 py-2 text-xs transition-colors ${selectedTurma === t.id ? "bg-sky-500/20 text-sky-300 font-medium" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                      >
                        {t.nome} ({t.ano_letivo})
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : boletins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">Nenhum aluno registrado para esta turma.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Métricas (Ocultas na Impressão) */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-emerald-300/80">Matérias Aprovadas</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{resumo.aprov}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-amber-300/80">Em Recuperação</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{resumo.rec}</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-xs text-rose-300/80">Matérias Reprovadas</p>
              <p className="mt-1 text-2xl font-bold text-rose-300">{resumo.reprov}</p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400">Pendentes de Nota</p>
              <p className="mt-1 text-2xl font-bold text-slate-300">{resumo.semNotas}</p>
            </div>
          </div>

          {/* Gráfico (Oculto na Impressão) */}
          {chartData.length > 0 && (
            <div className="print:hidden">
              <Card className="mb-5">
                <CardHeader>
                  <CardTitle>Médias Gerais por Aluno — {currentTurma?.nome}</CardTitle>
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

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] print:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Grade de Horários</CardTitle>
              </CardHeader>
              <CardContent>
                {horarios.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum horário cadastrado para esta turma.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-950/40 text-left text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
                          <th className="px-3 py-3">Dia</th>
                          <th className="px-3 py-3">Horário</th>
                          <th className="px-3 py-3">Disciplina</th>
                          <th className="px-3 py-3">Professor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {horarios.map((h) => (
                          <tr key={h.id} className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-3 text-slate-200">{h.dia_semana}</td>
                            <td className="px-3 py-3 text-slate-200">{h.hora_inicio} - {h.hora_fim}</td>
                            <td className="px-3 py-3 text-slate-200">{h.disciplina?.nome || "Disciplina não informada"}</td>
                            <td className="px-3 py-3 text-slate-200">{h.professor?.nome || "Professor não definido"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atividades e Simulados</CardTitle>
              </CardHeader>
              <CardContent>
                {atividades.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma atividade ou simulado agendado para esta turma.</p>
                ) : (
                  <div className="space-y-4">
                    {atividades.map((atividade) => (
                      <div key={atividade.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{atividade.titulo}</p>
                            <p className="text-xs text-slate-400">{atividade.disciplina?.nome || "Sem disciplina"}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${atividade.tipo === "simulado" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}>
                            {atividade.tipo === "simulado" ? "Simulado" : "Atividade"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-300 truncate">{atividade.descricao || "Sem descrição adicional."}</p>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>Prazo: {atividade.prazo ? atividade.prazo.split("T")[0] : "Indefinido"}</span>
                          <span>Prof.: {atividade.professor?.nome || "Não informado"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Boletins Individuais */}
          <div className="space-y-6">
            {boletins.map(({ aluno, disciplinas, totalFaltasGeral, mediaGeral }) => (
              <div key={aluno.id} id={`boletim-${aluno.id}`}>
                <Card className="overflow-hidden print:border print:border-slate-300 print:shadow-none print:mb-8">
                  <CardHeader className="bg-slate-900/60 border-b border-slate-800 flex flex-row items-center justify-between py-4 print:bg-slate-100 print:border-slate-300">
                    <div>
                      <CardTitle className="text-lg text-white print:text-slate-900">{aluno.nome}</CardTitle>
                      <p className="text-xs text-slate-400 print:text-slate-600">Matrícula: {aluno.matricula || "N/A"} | Turma: {currentTurma?.nome}</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => imprimirBoletimIndividual(aluno.id)}
                        className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                        title="Imprimir apenas este boletim"
                      >
                        <Printer size={13} /> Imprimir Boletim
                      </button>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="text-xs text-slate-400 print:text-slate-600 block">Total Faltas:</span>
                          <span className={`text-sm font-bold ${totalFaltasGeral > 25 ? "text-rose-400 print:text-rose-600" : "text-slate-200 print:text-slate-900"}`}>
                            {totalFaltasGeral}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 print:text-slate-600 block">Média Geral:</span>
                          <StatBadge value={mediaGeral} label="geral" />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-950/40 text-left text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider print:bg-slate-200 print:text-slate-700 print:border-slate-300">
                            <th className="px-4 py-3 font-medium">Disciplina</th>
                            <th className="px-3 py-3 font-medium text-center">N1</th>
                            <th className="px-3 py-3 font-medium text-center">N2</th>
                            <th className="px-3 py-3 font-medium text-center">N3</th>
                            <th className="px-3 py-3 font-medium text-center">Média</th>
                            <th className="px-3 py-3 font-medium text-center">Faltas</th>
                            <th className="px-4 py-3 font-medium">Situação</th>
                            <th className="px-4 py-3 font-medium">Observação do Professor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                          {disciplinas.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                                Nenhuma disciplina lançada para este aluno nesta turma.
                              </td>
                            </tr>
                          ) : (
                            disciplinas.map((d, idx) => (
                              <tr key={idx} className="bg-slate-900/20 hover:bg-slate-800/30 transition-colors print:bg-white">
                                <td className="px-4 py-3 font-medium text-slate-200 print:text-slate-900">{d.disciplinaNome}</td>
                                <td className="px-3 py-3 text-center text-slate-300 font-mono print:text-slate-800">
                                  {d.nota1 !== null ? d.nota1 : "—"}
                                </td>
                                <td className="px-3 py-3 text-center text-slate-300 font-mono print:text-slate-800">
                                  {d.nota2 !== null ? d.nota2 : "—"}
                                </td>
                                <td className="px-3 py-3 text-center text-slate-300 font-mono print:text-slate-800">
                                  {d.nota3 !== null ? d.nota3 : "—"}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <StatBadge value={d.media} label="média" />
                                </td>
                                <td className="px-3 py-3 text-center font-mono text-slate-300 print:text-slate-800">
                                  {d.faltas}
                                </td>
                                <td className="px-4 py-3">{situacaoBadge(d.situacao)}</td>
                                <td className="px-4 py-3 text-xs text-slate-400 print:text-slate-600 max-w-xs">
                                  {d.observacao ? (
                                    <span className="inline-flex items-center gap-1.5 text-slate-300 print:text-slate-800" title={d.observacao}>
                                      <MessageSquare size={13} className="text-sky-400 shrink-0 print:text-sky-600" />
                                      <span className="truncate">{d.observacao}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}