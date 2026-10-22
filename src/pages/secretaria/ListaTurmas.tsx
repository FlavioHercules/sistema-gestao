import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Users,
  GraduationCap,
  Eye,
  Calendar,
  Filter,
  RefreshCw,
  School,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";

import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { Button } from "../../components/ui/Button";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  {
    to: "/secretaria",
    label: "Dashboard",
    icon: School,
  },
  {
    to: "/secretaria/alunos",
    label: "Alunos",
    icon: Users,
  },
  {
    to: "/secretaria/turmas",
    label: "Turmas",
    icon: GraduationCap,
  },
];

type TurmaWithCounts = Turma & {
  aluno_count?: number;
  professor_count?: number;
};

export function ListaTurmas() {
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState<TurmaWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAno, setSelectedAno] = useState("todos");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Busca turmas, alunos e vínculos de professores em paralelo
      const [
        { data: turmasData, error: errTurmas },
        { data: alunosData, error: errAlunos },
        { data: profsData, error: errProfs },
      ] = await Promise.all([
        supabase
          .from("turmas")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("alunos")
          .select("turma_id"),

        supabase
          .from("turma_professores")
          .select("turma_id"),
      ]);

      if (errTurmas) throw errTurmas;

      if (errAlunos) {
        console.error(
          "Erro ao buscar alunos para contagem:",
          errAlunos
        );
      }

      if (errProfs) {
        console.error(
          "Erro ao buscar professores para contagem:",
          errProfs
        );
      }

      const listaTurmas = (turmasData ?? []) as Turma[];

      // ---------------------------------------------
      // Contagem de alunos por turma
      // ---------------------------------------------
      const alunosPorTurma = new Map<string, number>();

      for (const aluno of alunosData ?? []) {
        if (!aluno.turma_id) continue;

        alunosPorTurma.set(
          aluno.turma_id,
          (alunosPorTurma.get(aluno.turma_id) ?? 0) + 1
        );
      }

      // ---------------------------------------------
      // Contagem de professores por turma
      // ---------------------------------------------
      const professoresPorTurma = new Map<string, number>();

      for (const vinculo of profsData ?? []) {
        if (!vinculo.turma_id) continue;

        professoresPorTurma.set(
          vinculo.turma_id,
          (professoresPorTurma.get(vinculo.turma_id) ?? 0) + 1
        );
      }

      // ---------------------------------------------
      // Combina os dados
      // ---------------------------------------------
      const turmasComContagem: TurmaWithCounts[] = listaTurmas.map(
        (turma) => ({
          ...turma,
          aluno_count: alunosPorTurma.get(turma.id) ?? 0,
          professor_count:
            professoresPorTurma.get(turma.id) ?? 0,
        })
      );

      setTurmas(turmasComContagem);
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as turmas."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------
  // Anos disponíveis
  // ---------------------------------------------
  const anosDisponiveis = useMemo(() => {
    const anos = new Set(
      turmas.map((turma) => String(turma.ano_letivo))
    );

    return Array.from(anos).sort((a, b) => {
      return Number(b) - Number(a);
    });
  }, [turmas]);

  // ---------------------------------------------
  // Turmas filtradas
  // ---------------------------------------------
  const filtered = useMemo(() => {
    const termo = search.trim().toLowerCase();

    return turmas.filter((turma) => {
      const correspondeBusca =
        !termo ||
        turma.nome.toLowerCase().includes(termo) ||
        String(turma.ano_letivo).includes(termo);

      const correspondeAno =
        selectedAno === "todos" ||
        String(turma.ano_letivo) === selectedAno;

      return correspondeBusca && correspondeAno;
    });
  }, [turmas, search, selectedAno]);

  // ---------------------------------------------
  // Estatísticas
  // ---------------------------------------------
  const totalAlunosGeral = useMemo(() => {
    return turmas.reduce(
      (total, turma) => total + (turma.aluno_count ?? 0),
      0
    );
  }, [turmas]);

  const totalProfessoresGeral = useMemo(() => {
    return turmas.reduce(
      (total, turma) => total + (turma.professor_count ?? 0),
      0
    );
  }, [turmas]);

  const turmasAnoAtual = useMemo(() => {
    const anoAtual = String(new Date().getFullYear());

    return turmas.filter(
      (turma) => String(turma.ano_letivo) === anoAtual
    ).length;
  }, [turmas]);

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Turmas"
        description="Consulte as turmas, alunos matriculados e professores vinculados."
        action={
          <Button
            variant="ghost"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Atualizar
          </Button>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* CARDS DE RESUMO */}
      {/* --------------------------------------------- */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  Total de turmas
                </p>

                <p className="mt-1 text-2xl font-bold text-white">
                  {turmas.length}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <GraduationCap size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  Alunos matriculados
                </p>

                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {totalAlunosGeral}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Users size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  Vínculos de professores
                </p>

                <p className="mt-1 text-2xl font-bold text-violet-400">
                  {totalProfessoresGeral}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Users size={20} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  Turmas em {new Date().getFullYear()}
                </p>

                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {turmasAnoAtual}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Calendar size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------------------------- */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* --------------------------------------------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="pt-6">
            {/* Filtros */}
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por turma ou ano..."
                className="w-full sm:max-w-sm"
              />

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Filter size={14} />
                  <span>Ano:</span>
                </div>

                <select
                  value={selectedAno}
                  onChange={(e) => setSelectedAno(e.target.value)}
                  aria-label="Filtrar por ano letivo"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-white outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="todos">
                    Todos os anos
                  </option>

                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Informações do filtro */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-500">
                {filtered.length}{" "}
                {filtered.length === 1
                  ? "turma encontrada"
                  : "turmas encontradas"}
              </span>

              {(search || selectedAno !== "todos") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedAno("todos");
                  }}
                  className="text-xs text-sky-400 transition-colors hover:text-sky-300 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Tabela */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <div className="flex items-center gap-3">
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                  <span className="text-sm">
                    Carregando turmas...
                  </span>
                </div>
              </div>
            ) : (
              <DataTable
                columns={[
                  {
                    key: "nome",
                    header: "Turma",
                    render: (turma) => (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/secretaria?turma=${turma.id}`
                          )
                        }
                        className="text-left font-medium text-[#111111] transition-colors hover:text-sky-300"
                        title="Ver alunos e notas desta turma"
                      >
                        {turma.nome}
                      </button>
                    ),
                  },

                  {
                    key: "ano_letivo",
                    header: "Ano letivo",
                    render: (turma) => (
                      <span className="text-sm text-slate-300">
                        {turma.ano_letivo}
                      </span>
                    ),
                  },

                  {
                    key: "aluno_count",
                    header: "Alunos",
                    render: (turma) => (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                        <Users size={12} />
                        {turma.aluno_count ?? 0}
                      </span>
                    ),
                  },

                  {
                    key: "professor_count",
                    header: "Professores",
                    render: (turma) => (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-500/10 px-2 py-1 text-xs font-medium text-violet-300">
                        <Users size={12} />
                        {turma.professor_count ?? 0}
                      </span>
                    ),
                  },

                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (turma) => (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/secretaria?turma=${turma.id}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
                        title="Ver alunos e boletins da turma"
                      >
                        <Eye size={14} />
                        Ver Turma
                      </button>
                    ),
                  },
                ]}
                data={filtered}
                rowKey={(turma) => turma.id}
                emptyMessage={
                  search || selectedAno !== "todos"
                    ? "Nenhuma turma corresponde aos filtros."
                    : "Nenhuma turma cadastrada."
                }
              />
            )}
          </CardContent>
        </Card>

        {/* --------------------------------------------- */}
        {/* RESUMO INSTITUCIONAL */}
        {/* --------------------------------------------- */}
        <Card className="h-fit">
          <CardContent className="pt-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <Calendar
                size={16}
                className="text-sky-400"
              />
              Resumo Institucional
            </h3>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Total de turmas
                  </span>

                  <GraduationCap
                    size={16}
                    className="text-sky-400"
                  />
                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  {turmas.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Ano letivo atual
                  </span>

                  <Calendar
                    size={16}
                    className="text-amber-400"
                  />
                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  {new Date().getFullYear()}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-300/70">
                    Alunos matriculados
                  </span>

                  <Users
                    size={16}
                    className="text-emerald-400"
                  />
                </div>

                <p className="mt-2 text-xl font-bold text-emerald-400">
                  {totalAlunosGeral}
                </p>
              </div>

              <div className="rounded-xl border border-violet-500/10 bg-violet-500/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-violet-300/70">
                    Professores vinculados
                  </span>

                  <Users
                    size={16}
                    className="text-violet-400"
                  />
                </div>

                <p className="mt-2 text-xl font-bold text-violet-400">
                  {totalProfessoresGeral}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}