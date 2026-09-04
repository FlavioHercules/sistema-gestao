import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAtividadesByAluno } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Select } from "../../components/ui/Input";
import {
  PageHeader,
  ErrorBanner,
} from "../../components/ui/Misc";
import {
  BookOpen,
  Calendar,
  CheckSquare2,
  GraduationCap,
  Loader2,
  BellRing,
  Award,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const navItems = [
  {
    to: "/aluno",
    label: "Dashboard",
    icon: GraduationCap,
  },
  {
    to: "/aluno/boletim",
    label: "Boletim",
    icon: Award,
  },
  {
    to: "/aluno/horarios",
    label: "Horários",
    icon: Calendar,
  },
  {
    to: "/aluno/atividades",
    label: "Atividades",
    icon: BookOpen,
  },
];

interface Atividade {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  prazo?: string | null;
  disciplina?: {
    id?: string;
    nome?: string;
  } | null;
}

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  tipo?: string | null;
  turma_id?: string | null;
  created_at?: string;
  turmas?: {
    nome?: string;
  } | null;
}

export function AlunoAtividades() {
  const { aluno } = useAuth();

  const [atividades, setAtividades] = useState<
    Atividade[]
  >([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [disciplinaFilter, setDisciplinaFilter] =
    useState("TODAS");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!aluno?.id) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const carregarDados = async () => {
      setLoading(true);
      setError("");

      try {
        const turmaIdValido =
          aluno.turma_id || aluno.turma?.id;

        const atividadesData =
          await getAtividadesByAluno(
            aluno.id,
            turmaIdValido
          );

        if (!mounted) return;

        setAtividades(
          (atividadesData ?? []) as Atividade[]
        );

        const {
          data: avisosData,
          error: avisosError,
        } = await supabase
          .from("avisos")
          .select(
            "id,titulo,conteudo,tipo,turma_id,created_at,turmas(nome)"
          )
          .order("created_at", {
            ascending: false,
          });

        if (!mounted) return;

        if (avisosError) {
          console.error(
            "Erro ao carregar avisos:",
            avisosError
          );

          setAvisos([]);
        } else {
          const avisosList = (avisosData ?? []) as Aviso[];
          const filtrados = avisosList.filter((aviso) => {
            return (
              aviso.tipo === "geral" ||
              aviso.turma_id === turmaIdValido
            );
          });

          setAvisos(filtrados);
        }
      } catch (err) {
        console.error(
          "Erro ao carregar atividades:",
          err
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar as atividades."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    carregarDados();

    return () => {
      mounted = false;
    };
  }, [
    aluno?.id,
    aluno?.turma_id,
    aluno?.turma?.id,
  ]);

  const disciplinas = useMemo(() => {
    const nomes = new Set<string>();

    atividades.forEach((atividade) => {
      const nome = atividade.disciplina?.nome;

      if (nome) {
        nomes.add(nome);
      }
    });

    return Array.from(nomes).sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
  }, [atividades]);

  const atividadesFiltradas = useMemo(() => {
    if (disciplinaFilter === "TODAS") {
      return atividades;
    }

    return atividades.filter(
      (atividade) =>
        atividade.disciplina?.nome ===
        disciplinaFilter
    );
  }, [atividades, disciplinaFilter]);

  const pendentesCount = useMemo(() => {
    const agora = new Date();

    return atividadesFiltradas.filter(
      (atividade) => {
        if (!atividade.prazo) {
          return true;
        }

        const prazo = new Date(atividade.prazo);

        if (Number.isNaN(prazo.getTime())) {
          return true;
        }

        return prazo >= agora;
      }
    ).length;
  }, [atividadesFiltradas]);

  const formatarData = (
    data?: string | null
  ) => {
    if (!data) {
      return "Sem prazo definido";
    }

    const date = new Date(data);

    if (Number.isNaN(date.getTime())) {
      return "Data inválida";
    }

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isHoje = (data?: string | null) => {
    if (!data) {
      return false;
    }

    const hoje = new Date();
    const prazo = new Date(data);

    if (Number.isNaN(prazo.getTime())) {
      return false;
    }

    return (
      hoje.getFullYear() === prazo.getFullYear() &&
      hoje.getMonth() === prazo.getMonth() &&
      hoje.getDate() === prazo.getDate()
    );
  };

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Atividades"
        description="Consulte suas atividades, simulados e avisos da coordenação."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400">
              <BookOpen size={24} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Total de atividades
              </p>

              <p className="text-lg font-semibold text-white">
                {atividades.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <CheckSquare2 size={24} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Atividades ativas
              </p>

              <p className="text-lg font-semibold text-white">
                {pendentesCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Calendar size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                Sua turma
              </p>

              <p className="truncate text-lg font-semibold text-white">
                {aluno?.turma?.nome ||
                  "Não definida"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de atividades
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-4">
              <Select
                label="Filtrar por disciplina"
                value={disciplinaFilter}
                onChange={(e) =>
                  setDisciplinaFilter(
                    e.target.value
                  )
                }
              >
                <option value="TODAS">
                  Todas as disciplinas
                </option>

                {disciplinas.map((disciplina) => (
                  <option
                    key={disciplina}
                    value={disciplina}
                  >
                    {disciplina}
                  </option>
                ))}
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2
                  size={24}
                  className="animate-spin"
                />
              </div>
            ) : atividadesFiltradas.length ===
              0 ? (
              <div className="py-10 text-center">
                <BookOpen
                  size={32}
                  className="mx-auto mb-3 text-slate-700"
                />

                <p className="text-sm text-slate-500">
                  Nenhuma atividade ou simulado
                  disponível no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {atividadesFiltradas.map(
                  (atividade) => {
                    const hoje = isHoje(
                      atividade.prazo
                    );

                    const tipoSimulado =
                      atividade.tipo?.toLowerCase() ===
                      "simulado";

                    return (
                      <div
                        key={atividade.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-white">
                                {atividade.titulo}
                              </p>

                              {hoje && (
                                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                                  Vence hoje
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {atividade
                                .disciplina
                                ?.nome ||
                                "Sem disciplina"}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              tipoSimulado
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-sky-500/15 text-sky-300"
                            }`}
                          >
                            {tipoSimulado
                              ? "Simulado"
                              : "Atividade"}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                          {atividade.descricao ||
                            "Sem descrição adicional."}
                        </p>

                        <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3 text-xs text-slate-500">
                          <Calendar size={14} />

                          <span>
                            Prazo:{" "}
                            <span className="text-slate-300">
                              {formatarData(
                                atividade.prazo
                              )}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Mural de avisos
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2
                  size={22}
                  className="animate-spin"
                />
              </div>
            ) : avisos.length === 0 ? (
              <div className="py-8 text-center">
                <BellRing
                  size={28}
                  className="mx-auto mb-3 text-slate-700"
                />

                <p className="text-sm text-slate-500">
                  Nenhum aviso disponível.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {avisos.map((aviso) => (
                  <div
                    key={aviso.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700"
                  >
                    <div className="flex items-start gap-2 text-sky-300">
                      <BellRing
                        size={16}
                        className="mt-0.5 shrink-0"
                      />

                      <span className="text-sm font-semibold">
                        {aviso.titulo}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {aviso.conteudo}
                    </p>

                    {aviso.created_at && (
                      <p className="mt-3 text-[11px] text-slate-600">
                        {formatarData(
                          aviso.created_at
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}