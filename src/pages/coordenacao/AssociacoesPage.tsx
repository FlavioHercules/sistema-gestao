import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  Trash2,
  Loader2,
  UserCheck,
  Shield,
  Layers,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type { Professor, Turma, Disciplina } from "../../lib/supabase";

import { AppLayout } from "../../components/layout/AppLayout";
import { coordenacaoNavItems } from "../../lib/navigation";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

interface AssociacaoItem {
  id: string;
  professor_id: string;
  turma_id: string;
  disciplina_id: string;
  professores?: {
    nome: string;
  };
  turmas?: {
    nome: string;
    curso?: string;
  };
  disciplinas?: {
    nome: string;
  };
}

export function CoordenacaoAssociacoesPage() {
  const [associacoes, setAssociacoes] = useState<AssociacaoItem[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Modal de criação
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedProfessor, setSelectedProfessor] = useState("");
  const [selectedTurma, setSelectedTurma] = useState("");
  const [selectedDisciplina, setSelectedDisciplina] = useState("");

  // Modal de exclusão
  const [deleteTarget, setDeleteTarget] =
    useState<AssociacaoItem | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { data: assocData, error: assocErr } = await supabase
        .from("professor_turma_disciplina")
        .select(`
          id,
          professor_id,
          turma_id,
          disciplina_id,
          professores (
            nome
          ),
          turmas (
            nome,
            curso
          ),
          disciplinas (
            nome
          )
        `);

      if (assocErr) {
        throw assocErr;
      }

      const [
        { data: profs, error: profsError },
        { data: turm, error: turmasError },
        { data: disc, error: disciplinasError },
      ] = await Promise.all([
        supabase
          .from("professores")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("turmas")
          .select("*")
          .order("nome", { ascending: true }),

        supabase
          .from("disciplinas")
          .select("*")
          .order("nome", { ascending: true }),
      ]);

      if (profsError) {
        throw profsError;
      }

      if (turmasError) {
        throw turmasError;
      }

      if (disciplinasError) {
        throw disciplinasError;
      }

      setAssociacoes(
        (assocData as unknown as AssociacaoItem[]) ?? []
      );

      setProfessores(profs ?? []);
      setTurmas(turm ?? []);
      setDisciplinas(disc ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar os dados."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  /**
   * Filtra as disciplinas de acordo com o curso da turma.
   *
   * Disciplinas sem curso definido são consideradas
   * disciplinas gerais e continuam disponíveis.
   */
  const disciplinasFiltradas = useMemo(() => {
    if (!selectedTurma) {
      return disciplinas;
    }

    const turmaObjeto = turmas.find(
      (t) => t.id === selectedTurma
    );

    const cursoTurma = turmaObjeto?.curso
      ?.trim()
      .toLowerCase();

    if (!cursoTurma) {
      return disciplinas;
    }

    return disciplinas.filter((d) => {
      if (!d.curso || d.curso.trim() === "") {
        return true;
      }

      return (
        d.curso.trim().toLowerCase() === cursoTurma
      );
    });
  }, [selectedTurma, turmas, disciplinas]);

  function openCreateModal() {
    setSelectedProfessor("");
    setSelectedTurma("");
    setSelectedDisciplina("");
    setError("");
    setModalOpen(true);
  }

  function handleTurmaChange(turmaId: string) {
    setSelectedTurma(turmaId);

    // Ao trocar a turma, limpa a disciplina selecionada
    // para evitar uma disciplina incompatível com o curso.
    setSelectedDisciplina("");
  }

  async function handleSaveAssociacao(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !selectedProfessor ||
      !selectedTurma ||
      !selectedDisciplina
    ) {
      setError(
        "Selecione o professor, a turma e a disciplina."
      );
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("professor_turma_disciplina")
        .insert({
          professor_id: selectedProfessor,
          turma_id: selectedTurma,
          disciplina_id: selectedDisciplina,
        });

      if (err) {
        throw err;
      }

      setModalOpen(false);

      setSelectedProfessor("");
      setSelectedTurma("");
      setSelectedDisciplina("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar atribuição."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAssociacao() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("professor_turma_disciplina")
        .delete()
        .eq("id", deleteTarget.id);

      if (err) {
        throw err;
      }

      setDeleteTarget(null);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao remover atribuição."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout navItems={coordenacaoNavItems}>
      <PageHeader
        title="Atribuição de Disciplinas"
        description="Vincule professores às suas turmas e disciplinas correspondentes."
        action={
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            Nova Atribuição
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
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2
                className="animate-spin"
                size={24}
              />
            </div>
          ) : (
            <>
              {/* Resumo */}
              <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-sky-300">
                  <Layers size={16} />

                  <span className="text-sm font-semibold">
                    Visão rápida dos vínculos
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  Cada registro representa um vínculo entre
                  professor, turma e disciplina.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center gap-2">
                      <UserCheck
                        size={16}
                        className="text-emerald-400"
                      />

                      <span className="text-xs text-slate-400">
                        Professores
                      </span>
                    </div>

                    <p className="mt-1 text-xl font-bold text-white">
                      {professores.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center gap-2">
                      <Users
                        size={16}
                        className="text-sky-400"
                      />

                      <span className="text-xs text-slate-400">
                        Turmas
                      </span>
                    </div>

                    <p className="mt-1 text-xl font-bold text-white">
                      {turmas.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen
                        size={16}
                        className="text-indigo-400"
                      />

                      <span className="text-xs text-slate-400">
                        Disciplinas
                      </span>
                    </div>

                    <p className="mt-1 text-xl font-bold text-white">
                      {disciplinas.length}
                    </p>
                  </div>
                </div>
              </div>

              <DataTable
                columns={[
                  {
                    key: "professor",
                    header: "Professor",
                    render: (a) => (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                          <UserCheck size={17} />
                        </div>

                        <div>
                          <p className="font-semibold text-white">
                            {a.professores?.nome ||
                              "N/A"}
                          </p>

                          <p className="text-xs text-slate-500">
                            Professor
                          </p>
                        </div>
                      </div>
                    ),
                  },

                  {
                    key: "turma",
                    header: "Turma",
                    render: (a) => (
                      <div>
                        <span className="font-medium text-slate-200">
                          {a.turmas?.nome || "N/A"}
                        </span>

                        {a.turmas?.curso && (
                          <span className="ml-2 rounded border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400">
                            {a.turmas.curso}
                          </span>
                        )}
                      </div>
                    ),
                  },

                  {
                    key: "disciplina",
                    header: "Disciplina Atribuída",
                    render: (a) => (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400">
                        <BookOpen size={13} />

                        {a.disciplinas?.nome ||
                          "N/A"}
                      </span>
                    ),
                  },

                  {
                    key: "actions",
                    header: "",
                    className: "text-right",

                    render: (a) => (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(a)
                        }
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
                        title="Remover atribuição"
                      >
                        <Trash2 size={15} />
                      </button>
                    ),
                  },
                ]}
                data={associacoes}
                rowKey={(a) => a.id}
                emptyMessage="Nenhuma atribuição de disciplina cadastrada até o momento."
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Atribuição */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        title="Atribuir Disciplina a Professor"
        description="Escolha o professor, a turma e a disciplina que ele lecionará."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSaveAssociacao}
              disabled={
                saving ||
                !selectedProfessor ||
                !selectedTurma ||
                !selectedDisciplina
              }
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <>
                  <Plus size={16} />
                  Salvar Atribuição
                </>
              )}
            </Button>
          </>
        }
      >
        <form
          onSubmit={handleSaveAssociacao}
          className="space-y-4"
        >
          <Select
            label="Professor"
            value={selectedProfessor}
            onChange={(e) =>
              setSelectedProfessor(e.target.value)
            }
            required
          >
            <option value="">
              Selecione um professor
            </option>

            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>

          <Select
            label="Turma"
            value={selectedTurma}
            onChange={(e) =>
              handleTurmaChange(e.target.value)
            }
            required
          >
            <option value="">
              Escolha uma turma
            </option>

            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
                {t.curso ? ` (${t.curso})` : ""}
              </option>
            ))}
          </Select>

          <Select
            label="Disciplina"
            value={selectedDisciplina}
            onChange={(e) =>
              setSelectedDisciplina(e.target.value)
            }
            required
            disabled={!selectedTurma}
          >
            <option value="">
              {!selectedTurma
                ? "Escolha uma turma primeiro"
                : disciplinasFiltradas.length === 0
                ? "Nenhuma disciplina encontrada"
                : "Selecione a disciplina"}
            </option>

            {disciplinasFiltradas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
                {d.curso
                  ? ` [Curso: ${d.curso}]`
                  : " [Geral]"}
              </option>
            ))}
          </Select>

          {selectedTurma && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-start gap-2">
                <Shield
                  size={15}
                  className="mt-0.5 text-sky-400"
                />

                <p className="text-xs leading-relaxed text-slate-400">
                  As disciplinas específicas são
                  filtradas automaticamente de acordo
                  com o curso da turma. Disciplinas
                  gerais continuam disponíveis.
                </p>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        title="Remover Atribuição"
        description="Deseja remover essa atribuição de disciplina?"
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
              onClick={handleDeleteAssociacao}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <>
                  <Trash2 size={15} />
                  Remover
                </>
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-300">
          Você removerá o vínculo do professor{" "}
          <strong className="text-white">
            {deleteTarget?.professores?.nome ||
              "N/A"}
          </strong>{" "}
          com a disciplina{" "}
          <strong className="text-white">
            {deleteTarget?.disciplinas?.nome ||
              "N/A"}
          </strong>{" "}
          na turma{" "}
          <strong className="text-white">
            {deleteTarget?.turmas?.nome ||
              "N/A"}
          </strong>
          .
        </p>
      </Modal>
    </AppLayout>
  );
}