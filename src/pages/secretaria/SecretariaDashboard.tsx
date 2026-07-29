import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { GraduationCap, School, Loader2, Printer, Award, AlertCircle, ClipboardList, TrendingUp, MessageSquare, Users } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Turma, Aluno } from "../../lib/supabase";
import { calculateMedia, getNotasByTurma } from "../../lib/school";
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
  disciplina: string;
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
  const [loading, setLoading] = useState(true);

  const selectedTurma = params.get("turma") ?? "";

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
        // Busca os alunos da turma
        const { data: aluData, error: errAlunos } = await supabase
          .from("alunos")
          .select("*")
          .eq("turma_id", selectedTurma)
          .order("nome", { ascending: true });

        if (errAlunos) console.error("Erro ao buscar alunos:", errAlunos);
        const alunosList = (aluData ?? []) as Aluno[];

        // Busca todas as notas com relacionamento de disciplina via school.ts
        const notasList = await getNotasByTurma(selectedTurma);

        // Monta a estrutura agrupada por aluno com lista de disciplinas
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

  const currentTurma = useMemo(
    () => turmas.find((t) => t.id === selectedTurma),
    [turmas, selectedTurma]
  );

  // Métrica consolidada baseada nas disciplinas registradas
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

  function situacaoBadge(s: SituacaoAluno) {
    if (s === "Aprovado") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
          <Award size={11} /> Aprovado
        </span>
      );
    }
    if (s === "Recuperação") {
      return (
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
          Recuperação
        </span>
      );
    }
    if (s === "Reprovado por Faltas") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400">
          <AlertCircle size={11} /> Reprovado (Faltas)
        </span>
      );
    }
    if (s === "Reprovado") {
      return (
        <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">
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
      <PageHeader
        title="Painel Geral da Secretaria"
        description="Acompanhamento do rendimento escolar, disciplinas, notas e pareceres por aluno."
        action={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/70 transition-colors"
          >
            <Printer size={15} /> Imprimir Relatório
          </button>
        }
      />

      {/* Seleção de Turma */}
      <div className="mb-5 flex flex-wrap gap-2">
        {turmas.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ turma: t.id })}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
              selectedTurma === t.id
                ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
            }`}
          >
            <School size={14} />
            {t.nome}
          </button>
        ))}
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
          {/* Métricas e Resumos por Matéria Registrada */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

          {/* Gráfico de Médias Gerais */}
          {chartData.length > 0 && (
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
          )}

          {/* Lista de Boletins Individuais (1 por Aluno com Tabela de Disciplinas) */}
          <div className="space-y-6">
            {boletins.map(({ aluno, disciplinas, totalFaltasGeral, mediaGeral }) => (
              <Card key={aluno.id} className="overflow-hidden">
                <CardHeader className="bg-slate-900/60 border-b border-slate-800 flex flex-row items-center justify-between py-4">
                  <div>
                    <CardTitle className="text-lg text-white">{aluno.nome}</CardTitle>
                    <p className="text-xs text-slate-400">Matrícula: {aluno.matricula || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-xs text-slate-400 block">Total Faltas:</span>
                      <span className={`text-sm font-bold ${totalFaltasGeral > 25 ? "text-rose-400" : "text-slate-200"}`}>
                        {totalFaltasGeral}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Média Geral:</span>
                      <StatBadge value={mediaGeral} label="geral" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-950/40 text-left text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider">
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
                      <tbody className="divide-y divide-slate-800/60">
                        {disciplinas.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                              Nenhuma disciplina lançada para este aluno nesta turma.
                            </td>
                          </tr>
                        ) : (
                          disciplinas.map((d, idx) => (
                            <tr key={idx} className="bg-slate-900/20 hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-200">{d.disciplinaNome}</td>
                              <td className="px-3 py-3 text-center text-slate-300 font-mono">
                                {d.nota1 !== null ? d.nota1 : "—"}
                              </td>
                              <td className="px-3 py-3 text-center text-slate-300 font-mono">
                                {d.nota2 !== null ? d.nota2 : "—"}
                              </td>
                              <td className="px-3 py-3 text-center text-slate-300 font-mono">
                                {d.nota3 !== null ? d.nota3 : "—"}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <StatBadge value={d.media} label="média" />
                              </td>
                              <td className="px-3 py-3 text-center font-mono text-slate-300">
                                {d.faltas}
                              </td>
                              <td className="px-4 py-3">{situacaoBadge(d.situacao)}</td>
                              <td className="px-4 py-3 text-xs text-slate-400 max-w-xs">
                                {d.observacao ? (
                                  <span className="inline-flex items-center gap-1.5 text-slate-300" title={d.observacao}>
                                    <MessageSquare size={13} className="text-sky-400 shrink-0" />
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
            ))}
          </div>
        </>
      )}
    </AppLayout>
  );
}