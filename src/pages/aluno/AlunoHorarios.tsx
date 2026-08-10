import { useEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  GraduationCap,
  Award,
  BookOpen,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";

import {
  PageHeader,
  ErrorBanner,
} from "../../components/ui/Misc";

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
    label: "Meus Horários",
    icon: CalendarDays,
  },
  {
    to: "/aluno/atividades",
    label: "Atividades",
    icon: BookOpen,
  },
];

export function AlunoHorariosPage() {
  const {
    aluno,
    loading: authLoading,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gradeUrl, setGradeUrl] = useState<string | null>(null);
  const [nomeTurma, setNomeTurma] = useState("Sua Turma");

  useEffect(() => {
    if (authLoading) return;

    let mounted = true;

    const carregarGrade = async () => {
      setLoading(true);
      setError("");
      setGradeUrl(null);

      try {
        const turmaId =
          aluno?.turma_id ||
          aluno?.turma?.id;

        if (!turmaId) {
          throw new Error(
            "Não foi possível identificar a turma do aluno."
          );
        }

        const {
          data: turmaData,
          error: turmaError,
        } = await supabase
          .from("turmas")
          .select("nome")
          .eq("id", turmaId)
          .maybeSingle();

        if (turmaError) {
          throw new Error(
            `Erro ao buscar turma: ${turmaError.message}`
          );
        }

        if (!mounted) return;

        setNomeTurma(
          turmaData?.nome || "Sua Turma"
        );

        const {
          data: gradeData,
          error: gradeError,
        } = await supabase
          .from("horarios")
          .select("arquivo_url")
          .eq("turma_id", turmaId)
          .maybeSingle();

        if (gradeError) {
          throw new Error(
            `Erro ao buscar grade horária: ${gradeError.message}`
          );
        }

        if (!mounted) return;

        setGradeUrl(
          gradeData?.arquivo_url || null
        );
      } catch (err) {
        console.error(
          "Erro ao carregar grade horária:",
          err
        );

        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar a grade horária."
        );

        setGradeUrl(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    carregarGrade();

    return () => {
      mounted = false;
    };
  }, [
    aluno?.turma_id,
    aluno?.turma?.id,
    authLoading,
  ]);

  const isPdf =
    gradeUrl
      ?.toLowerCase()
      .split("?")[0]
      .endsWith(".pdf") ?? false;

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Grade Horária da Turma"
        description={`Consulte abaixo os horários oficiais da turma ${nomeTurma}.`}
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays
              className="text-sky-400"
              size={20}
            />

            <span>
              Horários - {nomeTurma}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading || authLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <Loader2
                size={32}
                className="mb-2 animate-spin text-sky-400"
              />

              <p className="text-sm">
                Carregando grade horária...
              </p>
            </div>
          ) : gradeUrl ? (
            <div className="space-y-4">
              {isPdf ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
                  <div className="mb-4 rounded-2xl bg-amber-500/10 p-4">
                    <FileText
                      size={48}
                      className="text-amber-400"
                    />
                  </div>

                  <p className="text-sm font-medium text-slate-200">
                    A grade horária está
                    disponível em formato PDF.
                  </p>

                  <p className="mt-1 max-w-md text-xs text-slate-500">
                    Clique no botão abaixo para
                    visualizar ou baixar a grade
                    completa da sua turma.
                  </p>

                  <a
                    href={gradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-600"
                  >
                    <Download size={16} />
                    Visualizar PDF
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2">
                    <img
                      src={gradeUrl}
                      alt={`Grade horária da turma ${nomeTurma}`}
                      className="h-auto max-h-[700px] w-full rounded-lg object-contain"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex justify-end">
                    <a
                      href={gradeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                    >
                      <Download size={14} />
                      Abrir imagem em tamanho real
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center text-slate-400">
              <div className="mb-3 rounded-2xl bg-slate-800/50 p-3">
                <ImageIcon
                  size={32}
                  className="opacity-40"
                />
              </div>

              <p className="text-sm">
                Ainda não há nenhuma grade
                horária cadastrada para a sua
                turma.
              </p>

              <p className="mt-1 max-w-md text-xs text-slate-500">
                Assim que a coordenação fizer o
                envio, ela aparecerá
                automaticamente aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
} 