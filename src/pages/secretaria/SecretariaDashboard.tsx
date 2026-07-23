import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Users, GraduationCap, School, ClipboardList, TrendingUp, 
  AlertCircle, Award, Trophy, X, FileText, Layers, Search, Printer 
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Turma, Aluno, Nota } from "../../lib/supabase";
import { calculateMedia } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import { StatCard } from "../../components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { BarChart, DonutChart } from "../../components/ui/Charts";
import { PageHeader, StatBadge } from "../../components/ui/Misc";

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: <TrendingUp size={18} /> },
  { to: "/secretaria/professores", label: "Professores", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <Users size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <School size={18} /> },
  { to: "/secretaria/associacoes", label: "Associações", icon: <ClipboardList size={18} /> },
  { to: "/secretaria/usuarios", label: "Usuários", icon: <Users size={18} /> },
];

const UNIDADES = [
  { id: 1, label: "1ª Unidade" },
  { id: 2, label: "2ª Unidade" },
  { id: 3, label: "3ª Unidade" },
  { id: 4, label: "4ª Unidade" },
];

interface Stats {
  professores: number;
  alunos: number;
  turmas: number;
  notas: number;
}

interface DisciplinaNota {
  disciplina: string;
  professor: string;
  unidade: number;
  nota_1: number | null;
  nota_2: number | null;
  nota_3: number | null;
  media: number | null;
  faltas: number;
  observacao: string;
}

interface AlunoStatus {
  aluno: Aluno;
  media: number | null;
  faltas: number;
  observacao: string;
  situacao: "Aprovado" | "Recuperação" | "Reprovado" | "Reprovado por Faltas" | "Sem notas";
  detalhesDisciplinas: DisciplinaNota[];
}

export function SecretariaDashboard() {
  const [stats, setStats] = useState<Stats>({ professores: 0, alunos: 0, turmas: 0, notas: 0 });
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [selectedUnidade, setSelectedUnidade] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [alunosStatus, setAlunosStatus] = useState<AlunoStatus[]>([]);
  const [selectedAluno, setSelectedAluno] = useState<AlunoStatus | null>(null);
  const [loadingTurma, setLoadingTurma] = useState(false);

  // 1. Carrega dados estatísticos gerais e lista de turmas
  useEffect(() => {
    (async () => {
      const [p, a, t, n, turmasRes] = await Promise.all([
        supabase.from("professores").select("id", { count: "exact", head: true }),
        supabase.from("alunos").select("id", { count: "exact", head: true }),
        supabase.from("turmas").select("id", { count: "exact", head: true }),
        supabase.from("notas").select("id", { count: "exact", head: true }),
        supabase.from("turmas").select("*").order("nome", { ascending: true }),
      ]);

      setStats({
        professores: p.count ?? 0,
        alunos: a.count ?? 0,
        turmas: t.count ?? 0,
        notas: n.count ?? 0,
      });

      const turmasData = (turmasRes.data ?? []) as Turma[];
      setTurmas(turmasData);

      if (turmasData.length > 0) {
        setSelectedTurmaId(turmasData[0].id);
      }
    })();
  }, []);

  // 2. Carrega notas e alunos filtrados por Turma e Unidade
  useEffect(() => {
    if (!selectedTurmaId) return;

    (async () => {
      setLoadingTurma(true);

      const { data: alunosData } = await supabase
        .from("alunos")
        .select("*")
        .eq("turma_id", selectedTurmaId)
        .order("nome", { ascending: true });

      const alunosList = (alunosData ?? []) as Aluno[];

      // Filtra as notas da Turma E da Unidade Selecionada
      const { data: notasData } = await supabase
        .from("notas")
        .select("*, professor: professores(nome, disciplina)")
        .eq("turma_id", selectedTurmaId)
        .eq("unidade", selectedUnidade);

      const notasList = (notasData ?? []) as (Nota & { professor?: { nome: string; disciplina: string } })[];

      const statusMapeado: AlunoStatus[] = alunosList.map((aluno) => {
        const notasDoAluno = notasList.filter((n) => n.aluno_id === aluno.id);

        let totalFaltas = 0;
        const mediasDisciplinas: number[] = [];
        const observacoes: string[] = [];

        const detalhesDisciplinas: DisciplinaNota[] = notasDoAluno.map((n) => {
          totalFaltas += n.faltas ?? 0;
          const mediaDisc = calculateMedia([n.nota_1, n.nota_2, n.nota_3]);
          if (mediaDisc !== null) mediasDisciplinas.push(mediaDisc);
          if (n.observacao) observacoes.push(n.observacao);

          return {
            disciplina: n.professor?.disciplina ?? "Geral",
            professor: n.professor?.nome ?? "Professor",
            unidade: n.unidade ?? selectedUnidade,
            nota_1: n.nota_1,
            nota_2: n.nota_2,
            nota_3: n.nota_3,
            media: mediaDisc,
            faltas: n.faltas ?? 0,
            observacao: n.observacao ?? "",
          };
        });

        const mediaGeral =
          mediasDisciplinas.length > 0
            ? mediasDisciplinas.reduce((a, b) => a + b, 0) / mediasDisciplinas.length
            : null;

        let situacao: AlunoStatus["situacao"] = "Sem notas";
        if (totalFaltas > 25) {
          situacao = "Reprovado por Faltas";
        } else if (mediaGeral !== null) {
          if (mediaGeral >= 7) situacao = "Aprovado";
          else if (mediaGeral >= 5) situacao = "Recuperação";
          else situacao = "Reprovado";
        }

        return {
          aluno,
          media: mediaGeral,
          faltas: totalFaltas,
          observacao: observacoes.join(" | ") || "Sem observações",
          situacao,
          detalhesDisciplinas,
        };
      });

      setAlunosStatus(statusMapeado);
      setLoadingTurma(false);
    })();
  }, [selectedTurmaId, selectedUnidade]);

  // Filtro de pesquisa de alunos
  const alunosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return alunosStatus;
    const q = searchQuery.toLowerCase();
    return alunosStatus.filter(
      (item) =>
        item.aluno.nome.toLowerCase().includes(q) ||
        item.aluno.matricula.toLowerCase().includes(q)
    );
  }, [alunosStatus, searchQuery]);

  // Resumo da turma
  const resumoTurma = useMemo(() => {
    const aprov = alunosStatus.filter((a) => a.situacao === "Aprovado").length;
    const rec = alunosStatus.filter((a) => a.situacao === "Recuperação").length;
    const reprov = alunosStatus.filter(
      (a) => a.situacao === "Reprovado" || a.situacao === "Reprovado por Faltas"
    ).length;
    const semNotas = alunosStatus.filter((a) => a.situacao === "Sem notas").length;

    return { aprov, rec, reprov, semNotas };
  }, [alunosStatus]);

  // Identificação do melhor aluno
  const melhorAluno = useMemo(() => {
    const alunosComMedia = alunosStatus.filter((a) => a.media !== null);
    if (alunosComMedia.length === 0) return null;

    return alunosComMedia.reduce((melhor, atual) => {
      return (atual.media ?? 0) > (melhor.media ?? 0) ? atual : melhor;
    }, alunosComMedia[0]);
  }, [alunosStatus]);

  // Gráfico formatado
  const chartData = useMemo(() => {
    return alunosFiltrados
      .filter((a) => a.media !== null)
      .map((a) => {
        const partesNome = a.aluno.nome.trim().split(" ");
        const primeiroNome = partesNome[0];
        const sobrenomeInicial = partesNome.length > 1 ? ` ${partesNome[1][0]}.` : "";
        const labelFormatado = `${primeiroNome}${sobrenomeInicial}`;

        return {
          label: labelFormatado,
          value: Number((a.media as number).toFixed(1)),
          max: 10,
        };
      });
  }, [alunosFiltrados]);

  function situacaoBadge(s: AlunoStatus["situacao"]) {
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
      <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-400">
        Sem notas
      </span>
    );
  }

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Dashboard da Secretaria"
        description="Visão geral do sistema e acompanhamento detalhado por turma e unidade."
      />

      {/* Cards globais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Professores" value={stats.professores} icon={<GraduationCap size={22} />} accent="sky" />
        <StatCard label="Alunos" value={stats.alunos} icon={<Users size={22} />} accent="emerald" />
        <StatCard label="Turmas" value={stats.turmas} icon={<School size={22} />} accent="amber" />
        <StatCard label="Notas lançadas" value={stats.notas} icon={<ClipboardList size={22} />} accent="violet" />
      </div>

      {/* Seletores: Turma e Unidade */}
      <div className="mt-8 mb-4 space-y-4">
        {/* Seleção de Turmas */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Acompanhamento por Turma</h2>
            <p className="text-xs text-slate-400">Selecione uma turma para carregar os relatórios</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {turmas.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTurmaId(t.id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                  selectedTurmaId === t.id
                    ? "border-sky-500/50 bg-sky-500/15 text-sky-300 shadow-sm"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                }`}
              >
                <School size={14} />
                {t.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Seleção de Unidade Letiva */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Unidade Letiva:
          </span>
          <div className="flex flex-wrap gap-2">
            {UNIDADES.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUnidade(u.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-all ${
                  selectedUnidade === u.id
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                <Layers size={13} />
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingTurma ? (
        <p className="py-12 text-center text-sm text-slate-500">Carregando dados da turma...</p>
      ) : (
        <>
          {/* Card Destaque: Melhor Aluno */}
          {melhorAluno && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Destaque da Turma na {selectedUnidade}ª Unidade
                    </p>
                    <p className="text-base font-bold text-white">
                      {melhorAluno.aluno.nome}{" "}
                      <span className="text-sm font-normal text-amber-300">
                        (Média: {melhorAluno.media?.toFixed(1)})
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Média dos Alunos ({selectedUnidade}ª Unidade)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum desempenho registrado para esta unidade.</p>
                ) : (
                  <BarChart data={chartData} color="bg-gradient-to-t from-sky-600 to-sky-400" height={200} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  segments={[
                    { label: "Aprovados", value: resumoTurma.aprov, color: "#10b981" },
                    { label: "Recuperação", value: resumoTurma.rec, color: "#f59e0b" },
                    { label: "Reprovados", value: resumoTurma.reprov, color: "#f43f5e" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Alunos com Pesquisa */}
          <Card className="mt-6">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Status dos Alunos ({alunosFiltrados.length} alunos)</CardTitle>
                <p className="text-xs text-slate-400">Clique sobre um aluno para abrir o boletim da unidade</p>
              </div>

              {/* Input de Busca */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar aluno ou matrícula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </CardHeader>
            <CardContent>
              {alunosFiltrados.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Nenhum aluno encontrado.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900/80 text-left text-slate-400">
                        <th className="px-4 py-3 font-medium">Aluno</th>
                        <th className="px-3 py-3 font-medium text-center">Média ({selectedUnidade}ª Unid.)</th>
                        <th className="px-3 py-3 font-medium text-center">Faltas</th>
                        <th className="px-4 py-3 font-medium text-center">Situação</th>
                        <th className="px-4 py-3 font-medium">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {alunosFiltrados.map((item) => (
                        <tr
                          key={item.aluno.id}
                          onClick={() => setSelectedAluno(item)}
                          className="bg-slate-900/30 hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-white">{item.aluno.nome}</p>
                            <p className="text-xs text-slate-500">{item.aluno.matricula}</p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatBadge value={item.media} label="média" />
                          </td>
                          <td className="px-3 py-3 text-center font-medium text-slate-300">
                            {item.faltas}
                          </td>
                          <td className="px-4 py-3 text-center">{situacaoBadge(item.situacao)}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                            {item.observacao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de Detalhes do Aluno */}
      {selectedAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedAluno.aluno.nome}</h3>
                  <p className="text-xs text-slate-400">
                    Matrícula: {selectedAluno.aluno.matricula} · <span className="text-amber-400 font-medium">{selectedUnidade}ª Unidade</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAluno(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400">Média na Unidade</p>
                <p className="mt-1 text-lg font-bold text-sky-300">
                  {selectedAluno.media !== null ? selectedAluno.media.toFixed(1) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400">Faltas na Unidade</p>
                <p className="mt-1 text-lg font-bold text-slate-200">{selectedAluno.faltas}</p>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50 flex flex-col justify-center items-center">
                <p className="text-xs text-slate-400 mb-1">Situação</p>
                {situacaoBadge(selectedAluno.situacao)}
              </div>
            </div>

            <h4 className="mb-2 text-sm font-semibold text-slate-300">Desempenho por Disciplina</h4>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800/80 text-left text-slate-400">
                    <th className="px-3 py-2 font-medium">Disciplina / Prof.</th>
                    <th className="px-2 py-2 text-center font-medium">N1</th>
                    <th className="px-2 py-2 text-center font-medium">N2</th>
                    <th className="px-2 py-2 text-center font-medium">N3</th>
                    <th className="px-2 py-2 text-center font-medium">Média</th>
                    <th className="px-2 py-2 text-center font-medium">Faltas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedAluno.detalhesDisciplinas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        Nenhuma nota lançada nesta unidade.
                      </td>
                    </tr>
                  ) : (
                    selectedAluno.detalhesDisciplinas.map((d, index) => (
                      <tr key={index} className="bg-slate-900/50">
                        <td className="px-3 py-2.5 font-medium text-white">
                          <p>{d.disciplina}</p>
                          <p className="text-[10px] text-slate-500">{d.professor}</p>
                        </td>
                        <td className="px-2 py-2.5 text-center text-slate-300">{d.nota_1 ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-slate-300">{d.nota_2 ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-slate-300">{d.nota_3 ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-sky-400">
                          {d.media !== null ? d.media.toFixed(1) : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-center text-slate-300">{d.faltas}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
              >
                <Printer size={14} /> Imprimir
              </button>
              <button
                onClick={() => setSelectedAluno(null)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Atalhos Rápidos */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/secretaria/professores" className="group">
          <Card className="h-full transition-transform group-hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Gerenciar professores</p>
                <p className="text-xs text-slate-500">Cadastrar e vincular disciplinas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/secretaria/alunos" className="group">
          <Card className="h-full transition-transform group-hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Gerenciar alunos</p>
                <p className="text-xs text-slate-500">Matricular e atribuir turmas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/secretaria/associacoes" className="group">
          <Card className="h-full transition-transform group-hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Associações</p>
                <p className="text-xs text-slate-500">Vincular professores a turmas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppLayout>
  );
}