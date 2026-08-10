import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Loader2,
  Users,
  BookOpen,
  Filter,
  UserCheck,
  Shield,
  CalendarDays,
  BellRing,
  ClipboardList,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";

import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

/* =========================================================
   NAVEGAÇÃO
========================================================= */

const navItems = [
  {
    to: "/coordenacao",
    label: "Dashboard",
    icon: GraduationCap,
  },
  {
    to: "/coordenacao/professores",
    label: "Professores",
    icon: UserCheck,
  },
  {
    to: "/coordenacao/disciplinas",
    label: "Disciplinas",
    icon: BookOpen,
  },
  {
    to: "/coordenacao/turmas",
    label: "Turmas",
    icon: Users,
  },
  {
    to: "/coordenacao/associacoes",
    label: "Atribuir Disciplinas",
    icon: ClipboardList,
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
    icon: Shield,
  },
];

/* =========================================================
   CONSTANTES
========================================================= */

const CURSOS = [
  "Agropecuária",
  "Nutrição",
  "Segurança do Trabalho",
  "Edificações",
  "Informática",
];

const ANOS_SERIES = [
  "1º Ano",
  "2º Ano",
  "3º Ano",
  "4º Ano",
];

/* =========================================================
   TIPOS
========================================================= */

type TurmaComTotal = Turma & {
  aluno_count?: number;
  professor_count?: number;
  curso?: string;
  ano?: string;
};

/* =========================================================
   COMPONENTE
========================================================= */

export function CoordenacaoTurmasPage() {
  /* -------------------------------------------------------
     Dados
  ------------------------------------------------------- */

  const [turmas, setTurmas] = useState<TurmaComTotal[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------
     Pesquisa e filtros
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [selectedCurso, setSelectedCurso] = useState("TODOS");
  const [selectedAno, setSelectedAno] = useState("TODOS");

  /* -------------------------------------------------------
     Modal de formulário
  ------------------------------------------------------- */

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);

  /* -------------------------------------------------------
     Formulário
  ------------------------------------------------------- */

  const [nomeTurma, setNomeTurma] = useState("");
  const [curso, setCurso] = useState(CURSOS[0]);
  const [anoSerie, setAnoSerie] = useState(ANOS_SERIES[0]);
  const [anoLetivo, setAnoLetivo] = useState(
    new Date().getFullYear().toString()
  );

  /* -------------------------------------------------------
     Estados de operação
  ------------------------------------------------------- */

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* -------------------------------------------------------
     Exclusão
  ------------------------------------------------------- */

  const [deleteTarget, setDeleteTarget] =
    useState<Turma | null>(null);

  const [deleting, setDeleting] = useState(false);

  /* =======================================================
     CARREGAR TURMAS
  ======================================================= */

  async function loadTurmas() {
    setLoading(true);
    setError("");

    try {
      const { data, error: err } = await supabase
        .from("turmas")
        .select("*")
        .order("nome", {
          ascending: true,
        });

      if (err) {
        throw err;
      }

      setTurmas(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar as turmas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTurmas();
  }, []);

  /* =======================================================
     ABRIR MODAL DE CRIAÇÃO
  ======================================================= */

  function openCreateModal() {
    setEditing(null);

    setNomeTurma("");
    setCurso(CURSOS[0]);
    setAnoSerie(ANOS_SERIES[0]);
    setAnoLetivo(
      new Date().getFullYear().toString()
    );

    setError("");
    setModalOpen(true);
  }

  /* =======================================================
     ABRIR MODAL DE EDIÇÃO
  ======================================================= */

  function openEditModal(turma: TurmaComTotal) {
    setEditing(turma);

    setNomeTurma(turma.nome);

    setCurso(
      turma.curso || CURSOS[0]
    );

    setAnoSerie(
      turma.ano || ANOS_SERIES[0]
    );

    setAnoLetivo(
      turma.ano_letivo?.toString() ||
        new Date().getFullYear().toString()
    );

    setError("");
    setModalOpen(true);
  }

  /* =======================================================
     SALVAR TURMA
  ======================================================= */

  async function handleSaveTurma(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) {
      return;
    }

    const nomeLimpo = nomeTurma.trim();

    if (!nomeLimpo) {
      setError("Informe o nome da turma.");
      return;
    }

    const anoLetivoNumero = Number(anoLetivo);

    if (
      !anoLetivo ||
      !Number.isInteger(anoLetivoNumero)
    ) {
      setError(
        "Informe um ano letivo válido."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        nome: nomeLimpo,
        curso,
        ano: anoSerie,
        ano_letivo: anoLetivoNumero,
      };

      if (editing) {
        const { error: err } = await supabase
          .from("turmas")
          .update(payload)
          .eq("id", editing.id);

        if (err) {
          throw err;
        }
      } else {
        const { error: err } = await supabase
          .from("turmas")
          .insert(payload);

        if (err) {
          throw err;
        }
      }

      setModalOpen(false);

      await loadTurmas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar a turma."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     EXCLUIR TURMA
  ======================================================= */

  async function handleDeleteTurma() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("turmas")
        .delete()
        .eq("id", deleteTarget.id);

      if (err) {
        throw err;
      }

      setDeleteTarget(null);

      await loadTurmas();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao excluir a turma."
      );
    } finally {
      setDeleting(false);
    }
  }

  /* =======================================================
     FILTRAGEM
  ======================================================= */

  const filteredTurmas = useMemo(() => {
    const termo = search
      .trim()
      .toLowerCase();

    return turmas.filter((turma) => {
      const nome = (
        turma.nome || ""
      ).toLowerCase();

      const cursoTurma = (
        turma.curso || ""
      ).toLowerCase();

      const anoTurma = (
        turma.ano || ""
      ).toLowerCase();

      const matchesText =
        !termo ||
        nome.includes(termo) ||
        cursoTurma.includes(termo) ||
        anoTurma.includes(termo);

      const matchesCurso =
        selectedCurso === "TODOS" ||
        turma.curso === selectedCurso;

      const matchesAno =
        selectedAno === "TODOS" ||
        turma.ano === selectedAno;

      return (
        matchesText &&
        matchesCurso &&
        matchesAno
      );
    });
  }, [
    turmas,
    search,
    selectedCurso,
    selectedAno,
  ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Gestão de Turmas"
        description="Cadastre e organize as turmas da instituição por curso e ano."
        action={
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            Nova Turma
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">

          {/* =================================================
              FILTROS
          ================================================= */}

          <div className="mb-6 space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Filter
                size={14}
                className="text-sky-400"
              />

              <span>
                Filtrar Turmas
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <SearchInput
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Buscar por nome, curso ou série..."
              />

              <select
                value={selectedCurso}
                onChange={(e) =>
                  setSelectedCurso(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">
                  Todos os Cursos
                </option>

                {CURSOS.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={selectedAno}
                onChange={(e) =>
                  setSelectedAno(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">
                  Todos os Anos/Séries
                </option>

                {ANOS_SERIES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>

            </div>
          </div>

          {/* =================================================
              TABELA
          ================================================= */}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2
                className="animate-spin"
                size={24}
              />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "nome",
                  header: "Nome da Turma",

                  render: (turma) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                        <GraduationCap
                          size={18}
                        />
                      </div>

                      <div>
                        <p className="font-semibold text-white">
                          {turma.nome}
                        </p>

                        <p className="text-xs text-slate-500">
                          Turma escolar
                        </p>
                      </div>
                    </div>
                  ),
                },

                {
                  key: "curso",
                  header: "Curso",

                  render: (turma) => (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400">
                      <BookOpen
                        size={12}
                      />

                      {turma.curso ||
                        "Não definido"}
                    </span>
                  ),
                },

                {
                  key: "ano",
                  header: "Série / Ano",

                  render: (turma) => (
                    <span className="text-xs text-slate-300">
                      {turma.ano || "-"}
                    </span>
                  ),
                },

                {
                  key: "ano_letivo",
                  header: "Ano Letivo",

                  render: (turma) => (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {turma.ano_letivo}
                    </span>
                  ),
                },

                {
                  key: "alunos",
                  header: "Alunos",

                  render: (turma) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users
                        size={14}
                      />

                      {turma.aluno_count ??
                        0}
                    </div>
                  ),
                },

                {
                  key: "professores",
                  header: "Professores",

                  render: (turma) => (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <UserCheck
                        size={14}
                      />

                      {turma.professor_count ??
                        0}
                    </div>
                  ),
                },

                {
                  key: "actions",
                  header: "",
                  className:
                    "text-right",

                  render: (turma) => (
                    <div className="flex items-center justify-end gap-1">

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            turma
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-sky-300"
                        title="Editar turma"
                      >
                        <Pencil
                          size={15}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            turma
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
                        title="Excluir turma"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>

                    </div>
                  ),
                },
              ]}
              data={filteredTurmas}
              rowKey={(turma) =>
                turma.id
              }
              emptyMessage="Nenhuma turma cadastrada ou encontrada para esses filtros."
            />
          )}
        </CardContent>
      </Card>

      {/* =====================================================
          MODAL CRIAR / EDITAR
      ===================================================== */}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        title={
          editing
            ? "Editar Turma"
            : "Cadastrar Nova Turma"
        }
        description="Defina a turma, selecione o curso e a série correspondente."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setModalOpen(false)
              }
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSaveTurma}
              disabled={saving}
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <>
                  <Plus size={16} />
                  {editing
                    ? "Salvar Alterações"
                    : "Salvar Turma"}
                </>
              )}
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleSaveTurma}
          className="space-y-4"
        >
          <Input
            label="Nome da Turma"
            required
            value={nomeTurma}
            onChange={(e) =>
              setNomeTurma(
                e.target.value
              )
            }
            placeholder="Ex.: INFO-1A, AGRO-2B"
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Curso
            </label>

            <select
              value={curso}
              onChange={(e) =>
                setCurso(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {CURSOS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Série / Ano
              </label>

              <select
                value={anoSerie}
                onChange={(e) =>
                  setAnoSerie(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                {ANOS_SERIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <Input
              label="Ano Letivo"
              type="number"
              required
              min={2020}
              max={2100}
              value={anoLetivo}
              onChange={(e) =>
                setAnoLetivo(
                  e.target.value
                )
              }
              placeholder="2026"
            />

          </div>
        </form>
      </Modal>

      {/* =====================================================
          MODAL EXCLUSÃO
      ===================================================== */}

      <Modal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        title="Excluir Turma"
        description="Tem certeza que deseja remover esta turma?"
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setDeleteTarget(null)
              }
              disabled={deleting}
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={
                handleDeleteTurma
              }
              disabled={deleting}
            >
              {deleting ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <>
                  <Trash2 size={16} />
                  Excluir Turma
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Você está prestes a excluir
            a turma{" "}
            <strong className="text-white">
              {deleteTarget?.nome}
            </strong>
            .
          </p>

          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="text-xs leading-relaxed text-rose-300">
              Os vínculos de alunos,
              disciplinas e outros
              registros relacionados
              poderão ser afetados,
              dependendo das regras
              configuradas no banco de
              dados.
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}