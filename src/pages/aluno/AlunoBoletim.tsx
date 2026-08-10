import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { Turma, Nota } from "../../lib/supabase";
import {
  getAlunoData,
  getNotasByAluno,
  calculateMedia,
} from "../../lib/school";
import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";
import {
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  BellRing,
  Loader2,
} from "lucide-react";

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

interface NotaComDetalhes extends Nota {
  disciplina_nome?: string;
  professor_nome?: string;
}

interface Aviso {
  id: string;
  titulo: string;
  conteudo: string;
  tipo?: string | null;
  turma_id?: string | null;
  created_at?: string | null;
}

export function AlunoBoletim() {
  const { aluno } = useAuth();

  const [turma, setTurma] = useState<Turma | null>(null);
  const [notas, setNotas] = useState<NotaComDetalhes[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
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
        // Busca os dados completos do aluno
        const alunoData = await getAlunoData(aluno.id);

        if (!mounted) return;

        const turmaAtual =
          alunoData?.turma ||
          aluno.turma ||
          null;

        setTurma(turmaAtual);

        // Busca as notas
        const notasData = await getNotasByAluno(aluno.id);

        if (!mounted) return;

        setNotas(
          (notasData ?? []) as NotaComDetalhes[]
        );

        // Identifica a turma do aluno
        const turmaId =
          aluno.turma_id ||
          aluno.turma?.id ||
          alunoData?.turma?.id ||
          turmaAtual?.id;

        // Busca os avisos
        const {
          data: avisosData,
          error: avisosError,
        } = await supabase
          .from("avisos")
          .select(
            "id,titulo,conteudo,tipo,turma_id,created_at"
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
          const avisosFiltrados =
            (avisosData ?? []).filter(
              (aviso: Aviso) =>
                aviso.tipo === "geral" ||
                aviso.turma_id === turmaId
            );

          setAvisos(avisosFiltrados);
        }
      } catch (err) {
        console.error(
          "Erro ao carregar boletim:",
          err
        );

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar os dados do boletim."
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
  }, [aluno?.id]);

  // Total de faltas
  const totalFaltas = useMemo(() => {
    return notas.reduce(
      (total, nota) =>
        total + Number(nota.faltas || 0),
      0
    );
  }, [notas]);

  // Médias válidas
  const mediasValidas = useMemo(() => {
    return notas
      .map((nota) =>
        calculateMedia([
          nota.nota_1,
          nota.nota_2,
          nota.nota_3,
        ])
      )
      .filter(
        (media): media is number =>
          media !== null
      );
  }, [notas]);

  // Média geral
  const mediaGeral = useMemo(() => {
    if (mediasValidas.length === 0) {
      return "—";
    }

    const soma = mediasValidas.reduce(
      (total, media) => total + media,
      0
    );

    return (
      soma / mediasValidas.length
    ).toFixed(1);
  }, [mediasValidas]);

  const getSituacao = (
    media: number | null,
    faltas: number
  ) => {
    if (faltas > 25) {
      return {
        text: "Reprovado por Faltas",
        className:
          "bg-rose-500/10 text-rose-400 border-rose-500/20",
      };
    }

    if (media === null) {
      return {
        text: "Em Andamento",
        className:
          "bg-slate-800 text-slate-300 border-slate-700",
      };
    }

    if (media >= 7) {
      return {
        text: "Aprovado",
        className:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    }

    if (media >= 5) {
      return {
        text: "Recuperação",
        className:
          "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    }

    return {
      text: "Reprovado",
      className:
        "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
  };

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Boletim Escolar"
        description="Consulte suas notas, médias, faltas e situação acadêmica."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* RESUMO */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400">
              <BookOpen size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                Turma atual
              </p>

              <p className="truncate text-lg font-semibold text-white">
                {turma
                  ? turma.nome
                  : loading
                  ? "Carregando..."
                  : "Sem turma"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Award size={24} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Média geral
              </p>

              <p className="text-lg font-semibold text-white">
                {loading ? "..." : mediaGeral}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Calendar size={24} />
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Total de faltas
              </p>

              <p className="text-lg font-semibold text-white">
                {loading ? "..." : totalFaltas}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* BOLETIM */}
        <Card>
          <CardHeader>
            <CardTitle>
              Boletim escolar
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2
                  size={24}
                  className="animate-spin"
                />
              </div>
            ) : notas.length === 0 ? (
              <div className="py-12 text-center">
                <GraduationCap
                  size={38}
                  className="mx-auto mb-3 text-slate-700"
                />

                <p className="text-sm text-slate-500">
                  Nenhuma nota lançada até o momento.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">
                        Disciplina
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Nota 1
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Nota 2
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Nota 3
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Média
                      </th>

                      <th className="px-3 py-3 text-center font-medium">
                        Faltas
                      </th>

                      <th className="px-4 py-3 text-center font-medium">
                        Situação
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/80">
                    {notas.map((nota) => {
                      const media =
                        calculateMedia([
                          nota.nota_1,
                          nota.nota_2,
                          nota.nota_3,
                        ]);

                      const faltas =
                        Number(nota.faltas || 0);

                      const situacao =
                        getSituacao(
                          media,
                          faltas
                        );

                      return (
                        <tr
                          key={nota.id}
                          className="bg-slate-900/30 transition-colors hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3 font-medium text-white">
                            {nota.disciplina_nome ||
                              "Disciplina"}

                            {nota.professor_nome && (
                              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                                Prof.{" "}
                                {nota.professor_nome}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center text-slate-300">
                            {nota.nota_1 !== null &&
                            nota.nota_1 !==
                              undefined
                              ? Number(
                                  nota.nota_1
                                ).toFixed(1)
                              : "—"}
                          </td>

                          <td className="px-3 py-3 text-center text-slate-300">
                            {nota.nota_2 !== null &&
                            nota.nota_2 !==
                              undefined
                              ? Number(
                                  nota.nota_2
                                ).toFixed(1)
                              : "—"}
                          </td>

                          <td className="px-3 py-3 text-center text-slate-300">
                            {nota.nota_3 !== null &&
                            nota.nota_3 !==
                              undefined
                              ? Number(
                                  nota.nota_3
                                ).toFixed(1)
                              : "—"}
                          </td>

                          <td className="px-3 py-3 text-center font-semibold text-white">
                            {media !== null
                              ? media.toFixed(1)
                              : "—"}
                          </td>

                          <td
                            className={`px-3 py-3 text-center ${
                              faltas > 25
                                ? "font-bold text-rose-400"
                                : "text-slate-300"
                            }`}
                          >
                            {faltas}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${situacao.className}`}
                            >
                              {situacao.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AVISOS */}
        <Card>
          <CardHeader>
            <CardTitle>
              Avisos recebidos
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
              <div className="py-6 text-center">
                <BellRing
                  size={32}
                  className="mx-auto mb-3 text-slate-700"
                />

                <p className="text-sm text-slate-500">
                  Nenhum aviso da coordenação
                  para sua turma.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {avisos.slice(0, 5).map((aviso) => (
                  <div
                    key={aviso.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-sky-500/10 p-2 text-sky-400">
                        <BellRing size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">
                            {aviso.titulo}
                          </span>

                          {aviso.created_at && (
                            <span className="text-[10px] text-slate-600">
                              {new Date(
                                aviso.created_at
                              ).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                          {aviso.conteudo}
                        </p>
                      </div>
                    </div>
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