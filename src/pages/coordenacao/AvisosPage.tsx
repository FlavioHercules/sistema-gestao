import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  BookOpen,
  GraduationCap,
  Loader2,
  Send,
  Shield,
  Trash2,
  Users,
  School,
  CalendarDays,
} from "lucide-react";

import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Input";
import {
  PageHeader,
  ErrorBanner,
} from "../../components/ui/Misc";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";

const navItems = [
  {
    to: "/coordenacao",
    label: "Dashboard",
    icon: GraduationCap,
  },
  {
    to: "/coordenacao/professores",
    label: "Professores",
    icon: Users,
  },
  {
    to: "/coordenacao/disciplinas",
    label: "Disciplinas",
    icon: BookOpen,
  },
  {
    to: "/coordenacao/turmas",
    label: "Turmas",
    icon: School,
  },
  {
    to: "/coordenacao/associacoes",
    label: "Atribuir Disciplinas",
    icon: Shield,
  },
  {
    to: "/coordenacao/horarios",
    label: "Horários",
    icon: CalendarDays,
  },
  {
    to: "/coordenacao/avisos",
    label: "Avisos",
    icon: BellRing,
  },
  {
    to: "/coordenacao/usuarios",
    label: "Usuários",
    icon: Users,
  },
];

interface AvisoItem {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: "geral" | "turma";
  turma_id?: string | null;
  created_at?: string;
  turmas?: {
    nome?: string | null;
  } | null;
}

export function CoordenacaoAvisosPage() {
  const { addToast } = useToast();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const [tipo, setTipo] = useState<"geral" | "turma">(
    "geral"
  );

  const [turmaId, setTurmaId] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        { data: turmasData, error: turmasError },
        { data: avisosData, error: avisosError },
      ] = await Promise.all([
        supabase
          .from("turmas")
          .select("id,nome,ano_letivo")
          .order("nome"),

        supabase
          .from("avisos")
          .select(
            "id,titulo,conteudo,tipo,turma_id,created_at,turmas(nome)"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (turmasError) {
        throw turmasError;
      }

      if (turmasData) {
        setTurmas(turmasData as Turma[]);
      }

      if (avisosError) {
        console.warn(
          "Avisos não disponíveis ainda no schema atual:",
          avisosError.message
        );

        setAvisos([]);
      } else if (avisosData) {
        setAvisos(avisosData as AvisoItem[]);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar dados."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const avisosVisiveis = useMemo(() => {
    return avisos;
  }, [avisos]);

  async function handleCreateAviso(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) return;

    if (!titulo.trim()) {
      setError("Informe o título do aviso.");
      return;
    }

    if (!conteudo.trim()) {
      setError("Informe o conteúdo do aviso.");
      return;
    }

    if (tipo === "turma" && !turmaId) {
      setError(
        "Selecione uma turma para publicar um aviso direcionado."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        tipo,
        turma_id:
          tipo === "turma"
            ? turmaId
            : null,
      };

      const { error: insertError } =
        await supabase
          .from("avisos")
          .insert(payload);

      if (insertError) {
        throw insertError;
      }

      setTitulo("");
      setConteudo("");
      setTipo("geral");
      setTurmaId("");

      await loadData();

      addToast({
        title: "Aviso publicado",
        description:
          "O comunicado já está disponível para os estudantes.",
        tone: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao publicar aviso.";

      setError(message);

      addToast({
        title: "Falha ao publicar aviso",
        description: message,
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAviso(
    id: string
  ) {
    try {
      setError("");

      const { error: deleteError } =
        await supabase
          .from("avisos")
          .delete()
          .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      await loadData();

      addToast({
        title: "Aviso removido",
        description:
          "O comunicado foi removido da lista.",
        tone: "info",
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao remover aviso.";

      setError(message);

      addToast({
        title: "Falha ao remover aviso",
        description: message,
        tone: "error",
      });
    }
  }

  return (
    <AppLayout
      navItems={navItems}
      brandLabel="EduGrade"
      brandSub="Coordenação"
    >
      <PageHeader
        title="Mural de Avisos"
        description="Publique comunicados gerais ou direcionados para turmas específicas."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* PUBLICAR AVISO */}
        <Card>
          <CardHeader>
            <CardTitle>
              Publicar novo aviso
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleCreateAviso}
              className="space-y-4"
            >
              <Input
                label="Título"
                value={titulo}
                onChange={(e) =>
                  setTitulo(e.target.value)
                }
                placeholder="Ex.: Reunião de pais e mestres"
                required
              />

              {/* TIPO */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-300">
                  Tipo de aviso
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setTipo("geral")
                    }
                    className={[
                      "rounded-lg border px-4 py-3",
                      "text-sm font-medium transition",
                      tipo === "geral"
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
                    ].join(" ")}
                  >
                    Aviso Geral
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTipo("turma")
                    }
                    className={[
                      "rounded-lg border px-4 py-3",
                      "text-sm font-medium transition",
                      tipo === "turma"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
                    ].join(" ")}
                  >
                    Por Turma
                  </button>
                </div>
              </div>

              {/* TURMA */}
              {tipo === "turma" && (
                <Select
                  label="Turma"
                  value={turmaId}
                  onChange={(e) =>
                    setTurmaId(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Selecione a turma
                  </option>

                  {turmas.map((turma) => (
                    <option
                      key={turma.id}
                      value={turma.id}
                    >
                      {turma.nome}
                    </option>
                  ))}
                </Select>
              )}

              {/* CONTEÚDO */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">
                  Conteúdo
                </label>

                <textarea
                  value={conteudo}
                  onChange={(e) =>
                    setConteudo(e.target.value)
                  }
                  required
                  className={[
                    "min-h-[160px] w-full rounded-lg",
                    "border border-slate-700",
                    "bg-slate-800/60",
                    "px-3.5 py-3",
                    "text-sm text-slate-100",
                    "placeholder:text-slate-500",
                    "outline-none transition",
                    "focus:border-sky-500",
                    "focus:ring-1 focus:ring-sky-500",
                  ].join(" ")}
                  placeholder="Escreva o comunicado para a comunidade escolar."
                />
              </div>

              {/* BOTÃO */}
              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Publicar aviso
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AVISOS PUBLICADOS */}
        <Card>
          <CardHeader>
            <CardTitle>
              Avisos publicados
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2
                  className="animate-spin"
                  size={22}
                />
              </div>
            ) : avisosVisiveis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center">
                <BellRing
                  size={28}
                  className="mx-auto mb-3 text-slate-600"
                />

                <p className="text-sm text-slate-500">
                  Nenhum aviso publicado até
                  o momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {avisosVisiveis.map(
                  (aviso) => (
                    <div
                      key={aviso.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white">
                            {aviso.titulo}
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={[
                                "inline-flex items-center",
                                "rounded-md border px-2 py-0.5",
                                "text-[11px] font-medium",
                                aviso.tipo ===
                                "turma"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "border-sky-500/20 bg-sky-500/10 text-sky-400",
                              ].join(" ")}
                            >
                              {aviso.tipo ===
                              "turma"
                                ? "Por turma"
                                : "Geral"}
                            </span>

                            {aviso.tipo ===
                              "turma" && (
                              <span className="text-xs text-slate-500">
                                {aviso.turmas
                                  ?.nome ||
                                  "Turma não informada"}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteAviso(
                              aviso.id
                            )
                          }
                          className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                          title="Remover aviso"
                        >
                          <Trash2
                            size={15}
                          />
                        </button>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                        {aviso.conteudo}
                      </p>

                      <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                        Publicação:{" "}
                        {aviso.created_at
                          ? new Date(
                              aviso.created_at
                            ).toLocaleString(
                              "pt-BR"
                            )
                          : "Agora"}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}