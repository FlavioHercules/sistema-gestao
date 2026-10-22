import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  GraduationCap,
  Loader2,
  BookOpen,
  UserCheck,
  Users,
  Shield,
  PlusCircle,
  School,
  CalendarDays,
  BellRing,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { coordenacaoNavItems } from "../../lib/navigation";
import { Button } from "../../components/ui/Button";
import {
  Card,
  CardContent,
} from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import {
  PageHeader,
  ErrorBanner,
} from "../../components/ui/Misc";

type Disciplina = {
  id: string;
  nome: string;
  carga_horaria?: number;
  curso?: string;
};

type Turma = {
  id: string;
  nome: string;
  curso: string;
  ano: string;
};

export function CoordenacaoDisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modais
  const [modalDisciplinaOpen, setModalDisciplinaOpen] =
    useState(false);

  const [modalAtribuirOpen, setModalAtribuirOpen] =
    useState(false);

  // Form Disciplina
  const [nome, setNome] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [curso, setCurso] = useState("");

  // Form Atribuição
  const [selectedDisciplina, setSelectedDisciplina] =
    useState<Disciplina | null>(null);

  const [selectedTurmaId, setSelectedTurmaId] =
    useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [discRes, turmasRes] =
        await Promise.all([
          supabase
            .from("disciplinas")
            .select("*")
            .order("nome"),

          supabase
            .from("turmas")
            .select("*")
            .order("nome"),
        ]);

      if (discRes.error) {
        throw discRes.error;
      }

      if (turmasRes.error) {
        throw turmasRes.error;
      }

      setDisciplinas(discRes.data || []);
      setTurmas(turmasRes.data || []);
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
    loadData();
  }, []);

  /*
   * Cursos únicos cadastrados nas turmas.
   * Usados no datalist do formulário.
   */
  const cursosCadastrados = useMemo(() => {
    const lista = turmas
      .map((turma) => turma.curso)
      .filter(Boolean);

    return Array.from(new Set(lista));
  }, [turmas]);

  /*
   * Filtra as turmas de acordo com o curso
   * da disciplina selecionada.
   */
  const turmasFiltradasPorCurso = useMemo(() => {
    if (
      !selectedDisciplina ||
      !selectedDisciplina.curso
    ) {
      return turmas;
    }

    const cursoDisciplina =
      selectedDisciplina.curso
        .trim()
        .toLowerCase();

    return turmas.filter(
      (turma) =>
        turma.curso &&
        turma.curso.trim().toLowerCase() ===
          cursoDisciplina
    );
  }, [turmas, selectedDisciplina]);

  /*
   * Criação de disciplina
   */
  async function handleSaveDisciplina(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) return;

    if (!nome.trim()) {
      setError(
        "Informe o nome da disciplina."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: err } =
        await supabase
          .from("disciplinas")
          .insert({
            nome: nome.trim(),
            carga_horaria: cargaHoraria
              ? Number(cargaHoraria)
              : null,
            curso: curso.trim()
              ? curso.trim()
              : null,
          });

      if (err) {
        throw err;
      }

      setModalDisciplinaOpen(false);

      setNome("");
      setCargaHoraria("");
      setCurso("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao cadastrar disciplina."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Vinculação da disciplina com a turma
   */
  async function handleAtribuirTurma(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !selectedDisciplina ||
      !selectedTurmaId ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      /*
       * Verifica se a associação já existe.
       */
      const { data: existente, error: checkError } =
        await supabase
          .from("turma_disciplinas")
          .select("id")
          .eq(
            "disciplina_id",
            selectedDisciplina.id
          )
          .eq("turma_id", selectedTurmaId)
          .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existente) {
        throw new Error(
          "Esta disciplina já está vinculada a esta turma."
        );
      }

      const { error: insertError } =
        await supabase
          .from("turma_disciplinas")
          .insert({
            disciplina_id:
              selectedDisciplina.id,
            turma_id: selectedTurmaId,
          });

      if (insertError) {
        throw insertError;
      }

      setModalAtribuirOpen(false);
      setSelectedDisciplina(null);
      setSelectedTurmaId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao vincular disciplina à turma."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * Pesquisa
   */
  const filtered = useMemo(() => {
    const searchTerm =
      search.trim().toLowerCase();

    if (!searchTerm) {
      return disciplinas;
    }

    return disciplinas.filter((disciplina) => {
      return (
        disciplina.nome
          .toLowerCase()
          .includes(searchTerm) ||
        (disciplina.curso &&
          disciplina.curso
            .toLowerCase()
            .includes(searchTerm))
      );
    });
  }, [disciplinas, search]);

  /*
   * Abre modal de nova disciplina
   */
  function openDisciplinaModal() {
    setNome("");
    setCargaHoraria("");
    setCurso("");
    setError("");
    setModalDisciplinaOpen(true);
  }

  /*
   * Abre modal de atribuição
   */
  function openAtribuirModal(
    disciplina: Disciplina
  ) {
    setSelectedDisciplina(disciplina);
    setSelectedTurmaId("");
    setError("");
    setModalAtribuirOpen(true);
  }

  return (
    <AppLayout
      navItems={coordenacaoNavItems}
      brandLabel="EduGrade"
      brandSub="Coordenação"
    >
      <PageHeader
        title="Gestão de Disciplinas"
        description="Cadastre as componentes curriculares e vincule às turmas."
        action={
          <Button onClick={openDisciplinaModal}>
            <Plus size={16} />
            Nova Disciplina
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
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Buscar por disciplina ou curso..."
              className="max-w-xs"
            />

            <div className="text-xs text-slate-500">
              {filtered.length} disciplina
              {filtered.length !== 1
                ? "s"
                : ""}{" "}
              encontrada
              {filtered.length !== 1
                ? "s"
                : ""}
            </div>
          </div>

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
                  header: "Nome da Disciplina",
                  render: (d) => (
                    <span className="font-semibold !text-[#111111] !opacity-100">
                      {d.nome}
                    </span>
                  ),
                },

                {
                  key: "curso",
                  header: "Curso Vinculado",
                  render: (d) => (
                    <span className="text-xs text-slate-300">
                      {d.curso ||
                        "Geral / Base Comum"}
                    </span>
                  ),
                },

                {
                  key: "carga_horaria",
                  header: "Carga Horária",
                  render: (d) => (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {d.carga_horaria
                        ? `${d.carga_horaria}h`
                        : "N/I"}
                    </span>
                  ),
                },

                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (d) => (
                    <Button
                      variant="ghost"
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() =>
                        openAtribuirModal(d)
                      }
                    >
                      <PlusCircle size={14} />
                      Vincular à Turma
                    </Button>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(d) => d.id}
              emptyMessage="Nenhuma disciplina cadastrada."
            />
          )}
        </CardContent>
      </Card>

      {/* =====================================================
          MODAL — NOVA DISCIPLINA
      ===================================================== */}

      <Modal
        open={modalDisciplinaOpen}
        onClose={() => {
          if (!saving) {
            setModalDisciplinaOpen(false);
          }
        }}
        title="Cadastrar Disciplina"
        description="Preencha as informações da disciplina."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setModalDisciplinaOpen(false)
              }
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => {
                const form =
                  document.getElementById(
                    "disciplina-form"
                  ) as HTMLFormElement | null;

                form?.requestSubmit();
              }}
              disabled={saving}
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Salvar Disciplina"
              )}
            </Button>
          </>
        }
      >
        <form
          id="disciplina-form"
          onSubmit={handleSaveDisciplina}
          className="space-y-4"
        >
          <Input
            label="Nome da Disciplina"
            required
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            placeholder="Ex.: Programação Web, Algoritmos..."
          />

          <div className="space-y-1">
            <Input
              label="Curso (Opcional)"
              value={curso}
              onChange={(e) =>
                setCurso(e.target.value)
              }
              placeholder="Digite ou selecione um curso existente..."
              list="cursos-list"
            />

            <datalist id="cursos-list">
              {cursosCadastrados.map(
                (cursoNome) => (
                  <option
                    key={cursoNome}
                    value={cursoNome}
                  />
                )
              )}
            </datalist>
          </div>

          <Input
            label="Carga Horária (horas)"
            type="number"
            min="1"
            value={cargaHoraria}
            onChange={(e) =>
              setCargaHoraria(e.target.value)
            }
            placeholder="Ex.: 80"
          />
        </form>
      </Modal>

      {/* =====================================================
          MODAL — ATRIBUIR DISCIPLINA À TURMA
      ===================================================== */}

      <Modal
        open={modalAtribuirOpen}
        onClose={() => {
          if (!saving) {
            setModalAtribuirOpen(false);
          }
        }}
        title={`Vincular "${selectedDisciplina?.nome ?? ""}" a uma Turma`}
        description={
          selectedDisciplina?.curso
            ? `Exibindo apenas turmas do curso "${selectedDisciplina.curso}".`
            : "Escolha qual turma receberá esta disciplina na grade."
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setModalAtribuirOpen(false)
              }
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={() => {
                const form =
                  document.getElementById(
                    "atribuir-turma-form"
                  ) as HTMLFormElement | null;

                form?.requestSubmit();
              }}
              disabled={
                saving || !selectedTurmaId
              }
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Vincular Turma"
              )}
            </Button>
          </>
        }
      >
        <form
          id="atribuir-turma-form"
          onSubmit={handleAtribuirTurma}
          className="space-y-4"
        >
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-500">
              Disciplina selecionada
            </p>

            <p className="mt-1 font-semibold text-white">
              {selectedDisciplina?.nome}
            </p>

            {selectedDisciplina?.curso && (
              <p className="mt-1 text-xs text-slate-400">
                Curso:{" "}
                {selectedDisciplina.curso}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="turma-select"
              className="text-xs font-medium text-slate-300"
            >
              Selecione a Turma
            </label>

            <select
              id="turma-select"
              value={selectedTurmaId}
              onChange={(e) =>
                setSelectedTurmaId(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              required
            >
              <option value="">
                Selecione uma turma...
              </option>

              {turmasFiltradasPorCurso.map(
                (turma) => (
                  <option
                    key={turma.id}
                    value={turma.id}
                  >
                    {turma.nome} -{" "}
                    {turma.curso} ({turma.ano})
                  </option>
                )
              )}
            </select>

            {turmasFiltradasPorCurso.length ===
              0 && (
              <p className="mt-2 text-xs text-amber-400">
                {selectedDisciplina?.curso
                  ? `Nenhuma turma cadastrada para o curso "${selectedDisciplina.curso}".`
                  : "Nenhuma turma cadastrada."}
              </p>
            )}
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}