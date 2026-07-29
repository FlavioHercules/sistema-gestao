import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { GraduationCap, School, Loader2, Printer, Award, AlertCircle, ClipboardList, TrendingUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Turma, Aluno, Nota } from "../../lib/supabase";
import { calculateMedia } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { StatBadge } from "../../components/ui/Misc";
import { BarChart } from "../../components/ui/Charts";
import { PageHeader } from "../../components/ui/Misc";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: <TrendingUp size={18} /> },
  { to: "/professor/turmas", label: "Minhas turmas", icon: <School size={18} /> },
  { to: "/professor/notas", label: "Notas", icon: <ClipboardList size={18} /> },
  { to: "/professor/boletim", label: "Boletins", icon: <GraduationCap size={18} /> },
];

type SituacaoAluno = "Aprovado" | "Recuperação" | "Reprovado" | "Reprovado por Faltas" | "Sem notas";

interface BoletimAluno {
  aluno: Aluno;
  nota: Nota | null;
  media: number | null;
  faltas: number;
  situacao: SituacaoAluno;
}

export function ProfessorBoletim() {
  const { professor } = useAuth();
  const [params, setParams] = useSearchParams();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [boletim, setBoletim] = useState<BoletimAluno[]>([]);
  const [loading, setLoading] = useState(true);
  
  const selectedTurma = params.get("turma") ?? "";
  const selectedUnidade = params.get("unidade") ?? "1";

  // 1. Carrega as turmas atribuídas ao professor
  useEffect(() => {
    if (!professor?.id) return;

    (async () => {
      try {
        const { data: vinculos, error } = await supabase
          .from("professor_turma_disciplina")
          .select("turmas (id, nome, ano_letivo, curso)")
          .eq("professor_id", professor.id);

        if (error) throw error;

        const turmasMap = new Map<string, Turma>();
        (vinculos ?? []).forEach((v: any) => {
          if (v.turmas && !turmasMap.has(v.turmas.id)) {
            turmasMap.set(v.turmas.id, v.turmas as Turma);
          }
        });

        const profTurmas = Array.from(turmasMap.values());
        setTurmas(profTurmas);

        if (profTurmas.length > 0 && (!selectedTurma || !profTurmas.some((t) => t.id === selectedTurma))) {
          setParams({ turma: profTurmas[0].id, unidade: selectedUnidade }, { replace: true });
        }
      } catch (err) {
        console.error("Erro ao carregar turmas:", err);
        setTurmas([]);
      }
    })();
  }, [professor?.id]);

  // 2. Carrega alunos e notas da turma selecionada
  useEffect(() => {
    if (!professor?.id || !selectedTurma) {
      setBoletim([]);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // Alunos da turma
        const { data: aluData } = await supabase
          .from("alunos")
          .select("*")
          .eq("turma_id", selectedTurma)
          .order("nome", { ascending: true });
        
        const alunosList = (aluData ?? []) as Aluno[];

        // Notas lançadas pelo professor para esta turma
        const { data: notasData } = await supabase
          .from("notas")
          .select("*")
          .eq("professor_id", professor.id)
          .eq("turma_id", selectedTurma);

        const notasList = (notasData ?? []) as Nota[];
        const notaByAluno = new Map<string, Nota>();
        for (const n of notasList) notaByAluno.set(n.aluno_id, n);

        const result: BoletimAluno[] = alunosList.map((a) => {
          const nota = notaByAluno.get(a.id) ?? null;
          const media = calculateMedia([
            nota?.nota_1 ?? null,
            nota?.nota_2 ?? null,
            nota?.nota_3 ?? null
          ]);
          const faltas = nota?.faltas ?? 0;

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

          return { aluno: a, nota, media, faltas, situacao };
        });

        setBoletim(result);
      } catch (err) {
        console.error("Erro ao buscar dados do boletim:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [professor?.id, selectedTurma]);

  const currentTurma = useMemo(
    () => turmas.find((t) => t.id === selectedTurma),
    [turmas, selectedTurma]
  );

  const resumo = useMemo(() => {
    const aprov = boletim.filter((b) => b.situacao === "Aprovado").length;
    const rec = boletim.filter((b) => b.situacao === "Recuperação").length;
    const reprov = boletim.filter((b) => b.situacao === "Reprovado" || b.situacao === "Reprovado por Faltas").length;
    const semNotas = boletim.filter((b) => b.situacao === "Sem notas").length;
    return { aprov, rec, reprov, semNotas };
  }, [boletim]);

  const chartData = useMemo(
    () =>
      boletim
        .filter((b) => b.media !== null)
        .map((b) => ({
          label: b.aluno.nome.split(" ")[0],
          value: b.media as number,
          max: 10,
        })),
    [boletim]
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
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Professor">
      <PageHeader
        title="Boletins"
        description="Visualize o desempenho e a frequência dos alunos por turma."
        action={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-3.5 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800/70 transition-colors"
          >
            <Printer size={15} /> Imprimir
          </button>
        }
      />

      {/* Seleção de Turma */}
      <div className="mb-5 flex flex-wrap gap-2">
        {turmas.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ turma: t.id, unidade: selectedUnidade })}
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
      ) : boletim.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap size={32} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">Nenhum aluno nesta turma.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-xs text-emerald-300/80">Aprovados</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">{resumo.aprov}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs text-amber-300/80">Recuperação</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{resumo.rec}</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-xs text-rose-300/80">Reprovados</p>
              <p className="mt-1 text-2xl font-bold text-rose-300">{resumo.reprov}</p>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4">
              <p className="text-xs text-slate-400">Sem notas</p>
              <p className="mt-1 text-2xl font-bold text-slate-300">{resumo.semNotas}</p>
            </div>
          </div>

          {/* Gráfico de Desempenho */}
          {chartData.length > 0 && (
            <Card className="mb-5">
              <CardHeader>
                <CardTitle>Desempenho individual — {currentTurma?.nome}</CardTitle>
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

          {/* Tabela do Boletim */}
          <Card>
            <CardHeader>
              <CardTitle>Boletim — {currentTurma?.nome}</CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Professor: {professor?.nome} {professor?.disciplina ? `· ${professor.disciplina}` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/90 text-left text-slate-400 border-b border-slate-800">
                      <th className="px-4 py-3 font-medium">Aluno</th>
                      <th className="px-3 py-3 font-medium text-center">N1</th>
                      <th className="px-3 py-3 font-medium text-center">N2</th>
                      <th className="px-3 py-3 font-medium text-center">N3</th>
                      <th className="px-3 py-3 font-medium text-center">Média</th>
                      <th className="px-3 py-3 font-medium text-center">Faltas</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {boletim.map((b) => (
                      <tr key={b.aluno.id} className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{b.aluno.nome}</p>
                          <p className="text-xs text-slate-500">{b.aluno.matricula}</p>
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300 font-mono">
                          {b.nota?.nota_1 != null ? b.nota.nota_1 : "—"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300 font-mono">
                          {b.nota?.nota_2 != null ? b.nota.nota_2 : "—"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300 font-mono">
                          {b.nota?.nota_3 != null ? b.nota.nota_3 : "—"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <StatBadge value={b.media} label="média" />
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-medium text-slate-300">
                          {b.faltas}
                        </td>
                        <td className="px-4 py-3">{situacaoBadge(b.situacao)}</td>
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