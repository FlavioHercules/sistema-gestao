
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  School,
  ClipboardList,
  BookOpen,
  Plus,
  Loader2,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import type { Turma, Disciplina } from "../../lib/supabase";
import {
  createAtividade,
  getAtividadesByTurma,
} from "../../lib/school";

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

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    to: "/professor",
    label: "Dashboard",
    icon: School,
  },
  {
    to: "/professor/turmas",
    label: "Minhas turmas",
    icon: GraduationCap,
  },
  {
    to: "/professor/notas",
    label: "Notas",
    icon: ClipboardList,
  },
  {
    to: "/professor/boletim",
    label: "Boletins",
    icon: BookOpen,
  },
  {
    to: "/professor/atividades",
    label: "Atividades",
    icon: Plus,
  },
];

interface VinculoTurmaDisciplina {
  turma_id: string;
  disciplina_id: string;
  turmas?: Turma | Turma[] | null;
  disciplinas?: Disciplina | Disciplina[] | null;
}

interface Atividade {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo?: "atividade" | "simulado" | string | null;
  prazo?: string | null;
  turma_id?: string | null;
  professor_id?: string | null;
  disciplina_id?: string | null;

  disciplina?: {
    id: string;
    nome: string;
  } | null;

  professor?: {
    id: string;
    nome: string;
  } | null;

  turma?: {
    id: string;
    nome: string;
  } | null;
}

export function ProfessorAtividades() {
  const { professor } = useAuth();
  const { addToast } = useToast();

  const [vinculos, setVinculos] = useState<
    VinculoTurmaDisciplina[]
  >([]);

  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"atividade" | "simulado">(
    "atividade"
  );
  const [prazo, setPrazo] = useState("");

  const [atividades, setAtividades] = useState<Atividade[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  /*
   * ============================================================
   * CARREGAR VÍNCULOS DO PROFESSOR
   * ============================================================
   */
  useEffect(() => {
    const professorId = professor?.id;

    if (!professorId) {
      setVinculos([]);
      setTurmaId("");
      setLoading(false);
      return;
    }

    async function loadVinculos() {
      setLoading(true);
      setError("");

      try {
        const { data, error: queryError } = await supabase
          .from("professor_turma_disciplina")
          .select(`
            turma_id,
            disciplina_id,
            turmas (
              id,
              nome,
              ano_letivo
            ),
            disciplinas (
              id,
              nome
            )
          `)
          .eq("professor_id", professorId);

        if (queryError) {
          throw queryError;
        }

        const vinculosData =
          (data as VinculoTurmaDisciplina[] | null) ?? [];

        setVinculos(vinculosData);

        /*
         * Mantém a turma atual se ela ainda existir.
         * Caso contrário, seleciona a primeira turma.
         */
        const primeiraTurma = vinculosData[0]?.turma_id;

        if (!turmaId && primeiraTurma) {
          setTurmaId(primeiraTurma);
        }
      } catch (err) {
        console.error(
          "Erro ao carregar vínculos de atividades:",
          err
        );

        setVinculos([]);
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as turmas."
        );
      } finally {
        setLoading(false);
      }
    }

    loadVinculos();
  }, [professor?.id]);

  /*
   * ============================================================
   * CARREGAR ATIVIDADES DA TURMA
   * ============================================================
   */
  useEffect(() => {
    if (!turmaId) {
      setAtividades([]);
      return;
    }

    let cancelled = false;

    async function loadAtividades() {
      setLoading(true);
      setError("");

      try {
        const listaAtividades =
          await getAtividadesByTurma(turmaId);

        if (!cancelled) {
          setAtividades(
            (listaAtividades as Atividade[]) ?? []
          );
        }
      } catch (err) {
        console.error(
          "Erro ao carregar atividades da turma:",
          err
        );

        if (!cancelled) {
          setAtividades([]);
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar as atividades."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAtividades();

    return () => {
      cancelled = true;
    };
  }, [turmaId]);

  /*
   * ============================================================
   * TURMAS DISPONÍVEIS
   * ============================================================
   */
  const turmaOptions = useMemo(() => {
    const map = new Map<string, Turma>();

    vinculos.forEach((vinculo) => {
      const turmasValue = vinculo.turmas;

      const turmasArray = Array.isArray(turmasValue)
        ? turmasValue
        : turmasValue
          ? [turmasValue]
          : [];

      turmasArray.forEach((turma) => {
        if (turma && !map.has(turma.id)) {
          map.set(turma.id, turma);
        }
      });
    });

    return Array.from(map.values());
  }, [vinculos]);

  /*
   * ============================================================
   * DISCIPLINAS DA TURMA SELECIONADA
   * ============================================================
   */
  const disciplinasDaTurma = useMemo(() => {
    const disciplinasMap = new Map<string, Disciplina>();

    vinculos
      .filter((vinculo) => vinculo.turma_id === turmaId)
      .forEach((vinculo) => {
        const disciplinasValue = vinculo.disciplinas;

        const disciplinasArray = Array.isArray(
          disciplinasValue
        )
          ? disciplinasValue
          : disciplinasValue
            ? [disciplinasValue]
            : [];

        disciplinasArray.forEach((disciplina) => {
          if (
            disciplina &&
            !disciplinasMap.has(disciplina.id)
          ) {
            disciplinasMap.set(
              disciplina.id,
              disciplina
            );
          }
        });
      });

    return Array.from(disciplinasMap.values());
  }, [turmaId, vinculos]);

  /*
   * ============================================================
   * IMPORTAR ARQUIVO
   * ============================================================
   */
  async function handleFileUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setError("O arquivo enviado está vazio.");
        return;
      }

      /*
       * Se a primeira linha parecer um título,
       * usa ela como título da atividade.
       */
      if (lines[0].length < 80) {
        setTitulo(lines[0]);
        setDescricao(lines.slice(1).join("\n"));
      } else {
        const nomeArquivo = file.name.replace(
          /\.[^/.]+$/,
          ""
        );

        setTitulo(nomeArquivo);
        setDescricao(text);
      }

      setError("");

      addToast({
        title: "Arquivo importado",
        description:
          "O conteúdo foi carregado no formulário.",
        tone: "success",
      });
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);

      setError(
        "Não foi possível ler o arquivo enviado."
      );
    } finally {
      event.target.value = "";
    }
  }

  /*
   * ============================================================
   * LIMPAR FORMULÁRIO
   * ============================================================
   */
  function resetForm() {
    setTitulo("");
    setDescricao("");
    setPrazo("");
    setDisciplinaId("");
    setTipo("atividade");
    setEditingId(null);
  }

  /*
   * ============================================================
   * CRIAR / EDITAR ATIVIDADE
   * ============================================================
   */
  async function handleCreateAtividade(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!professor?.id) {
      setError(
        "Não foi possível identificar o professor."
      );
      return;
    }

    if (!turmaId) {
      setError(
        "Selecione uma turma para continuar."
      );
      return;
    }

    if (!titulo.trim()) {
      setError(
        "Informe um título para a atividade."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      /*
       * EDITAR
       */
      if (editingId) {
        const { error: updateError } = await supabase
          .from("atividades")
          .update({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            tipo,
            prazo: prazo || null,
            disciplina_id: disciplinaId || null,
          })
          .eq("id", editingId)
          .eq("professor_id", professor.id);

        if (updateError) {
          throw updateError;
        }

        addToast({
          title: "Atividade atualizada",
          description:
            "Os detalhes da atividade foram salvos.",
          tone: "success",
        });
      } else {
        /*
         * CRIAR
         */
        await createAtividade({
          turmaId,
          professorId: professor.id,
          disciplinaId: disciplinaId || null,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo,
          prazo: prazo || null,
        });

        addToast({
          title: "Atividade publicada",
          description:
            "A tarefa já está disponível para a turma.",
          tone: "success",
        });
      }

      resetForm();

      const listaAtualizada =
        await getAtividadesByTurma(turmaId);

      setAtividades(
        (listaAtualizada as Atividade[]) ?? []
      );
    } catch (err) {
      console.error(
        "Erro ao salvar atividade:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a atividade.";

      setError(message);

      addToast({
        title: "Falha ao salvar atividade",
        description: message,
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================================
   * INICIAR EDIÇÃO
   * ============================================================
   */
  function startEdit(item: Atividade) {
    setEditingId(item.id);

    setTitulo(item.titulo ?? "");
    setDescricao(item.descricao ?? "");

    setTipo(
      item.tipo === "simulado"
        ? "simulado"
        : "atividade"
    );

    setPrazo(
      item.prazo
        ? item.prazo.split("T")[0]
        : ""
    );

    setDisciplinaId(
      item.disciplina_id ?? ""
    );

    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ============================================================
   * EXCLUIR ATIVIDADE
   * ============================================================
   */
  async function handleDeleteAtividade(
    id: string
  ) {
    if (!professor?.id) {
      return;
    }

    const confirmar = window.confirm(
      "Tem certeza que deseja excluir esta atividade?"
    );

    if (!confirmar) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from("atividades")
        .delete()
        .eq("id", id)
        .eq("professor_id", professor.id);

      if (deleteError) {
        throw deleteError;
      }

      setAtividades((prev) =>
        prev.filter((item) => item.id !== id)
      );

      if (editingId === id) {
        resetForm();
      }

      addToast({
        title: "Atividade removida",
        description:
          "A atividade foi excluída da turma.",
        tone: "info",
      });
    } catch (err) {
      console.error(
        "Erro ao excluir atividade:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a atividade.";

      setError(message);

      addToast({
        title: "Falha ao excluir atividade",
        description: message,
        tone: "error",
      });
    }
  }

  return (
    <AppLayout
      navItems={navItems}
      brandLabel="EduGrade"
      brandSub="Área do Professor"
    >
      <PageHeader
        title="Atividades"
        description="Crie, publique e gerencie atividades para suas turmas."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        {/* ====================================================
            FORMULÁRIO
            ==================================================== */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle>
              {editingId
                ? "Editar atividade"
                : "Criar nova atividade"}
            </CardTitle>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700">
              <Upload size={14} />

              Importar arquivo

              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleCreateAtividade}
              className="space-y-4"
            >
              {editingId && (
                <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <p className="text-sm text-amber-300">
                    Editando atividade publicada.
                  </p>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-400 transition hover:text-white"
                  >
                    Cancelar edição
                  </button>
                </div>
              )}

              {/* TURMA / DISCIPLINA */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Turma"
                  value={turmaId}
                  onChange={(event) => {
                    setTurmaId(event.target.value);
                    setDisciplinaId("");
                  }}
                  required
                >
                  <option value="">
                    Escolha a turma
                  </option>

                  {turmaOptions.map((turma) => (
                    <option
                      key={turma.id}
                      value={turma.id}
                    >
                      {turma.nome}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Disciplina"
                  value={disciplinaId}
                  onChange={(event) =>
                    setDisciplinaId(
                      event.target.value
                    )
                  }
                  disabled={!turmaId}
                >
                  <option value="">
                    Sem disciplina / Geral
                  </option>

                  {disciplinasDaTurma.map(
                    (disciplina) => (
                      <option
                        key={disciplina.id}
                        value={disciplina.id}
                      >
                        {disciplina.nome}
                      </option>
                    )
                  )}
                </Select>
              </div>

              {/* TÍTULO */}
              <Input
                label="Título"
                value={titulo}
                onChange={(event) =>
                  setTitulo(event.target.value)
                }
                placeholder="Ex.: Estudo de caso, Revisão de Conteúdo"
                required
              />

              {/* TIPO */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Tipo
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setTipo("atividade")
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      tipo === "atividade"
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    Atividade
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTipo("simulado")
                    }
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      tipo === "simulado"
                        ? "border-amber-500 bg-amber-500/10 text-amber-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    Simulado
                  </button>
                </div>
              </label>

              {/* DESCRIÇÃO */}
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">
                  Descrição
                </span>

                <textarea
                  value={descricao}
                  onChange={(event) =>
                    setDescricao(
                      event.target.value
                    )
                  }
                  className="min-h-[120px] w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-3 text-slate-100 transition-all placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  placeholder="Detalhe os tópicos, o conteúdo e instruções para a turma."
                />
              </label>

              {/* PRAZO / BOTÃO */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Prazo"
                  type="date"
                  value={prazo}
                  onChange={(event) =>
                    setPrazo(event.target.value)
                  }
                />

                <div className="pt-5">
                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      !turmaId ||
                      !titulo.trim()
                    }
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Salvando...
                      </>
                    ) : editingId ? (
                      <>
                        <Pencil size={14} />
                        Salvar alterações
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ====================================================
            LISTA DE ATIVIDADES
            ==================================================== */}
        <Card>
          <CardHeader>
            <CardTitle>
              Atividades da turma
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2
                  size={24}
                  className="animate-spin"
                />
              </div>
            ) : atividades.length === 0 ? (
              <div className="py-10 text-center">
                <ClipboardList
                  size={32}
                  className="mx-auto mb-3 text-slate-600"
                />

                <p className="text-sm text-slate-400">
                  Nenhuma atividade cadastrada
                  para a turma selecionada.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {atividades.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    {/* CABEÇALHO */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {item.titulo}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.disciplina?.nome ??
                            "Sem disciplina"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.tipo ===
                          "simulado"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-sky-500/15 text-sky-300"
                        }`}
                      >
                        {item.tipo ===
                        "simulado"
                          ? "Simulado"
                          : "Atividade"}
                      </span>
                    </div>

                    {/* DESCRIÇÃO */}
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                      {item.descricao ||
                        "Sem descrição adicional."}
                    </p>

                    {/* INFORMAÇÕES */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        Prazo:{" "}
                        {item.prazo
                          ? item.prazo.split(
                              "T"
                            )[0]
                          : "Indefinido"}
                      </span>

                      <span>
                        Prof.:{" "}
                        {item.professor?.nome ??
                          professor?.nome ??
                          "Você"}
                      </span>

                      <span>
                        Turma:{" "}
                        {item.turma?.nome ??
                          "-"}
                      </span>
                    </div>

                    {/* AÇÕES */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(item)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                      >
                        <Pencil size={14} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteAtividade(
                            item.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
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

