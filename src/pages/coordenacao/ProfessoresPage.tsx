import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  GraduationCap,
  Loader2,
  Mail,
  Filter,
  UserCheck,
  Shield,
  LayoutDashboard,
  Users,
  BookOpen,
  School,
  Link2,
  Clock,
  Megaphone,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  {
    to: "/coordenacao",
    label: "Dashboard",
    icon: LayoutDashboard,
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
    icon: Link2,
  },
  {
    to: "/coordenacao/horarios",
    label: "Horários",
    icon: Clock,
  },
  {
    to: "/coordenacao/avisos",
    label: "Avisos",
    icon: Megaphone,
  },
  {
    to: "/coordenacao/usuarios",
    label: "Usuários",
    icon: Shield,
  },
];

type UsuarioProfessor = {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
};

type ProfessorOficial = {
  id: string;
  nome: string;
  usuario_id: string | null;
  created_at?: string;
  email?: string | null;
  area_formacao?: string | null;
};

type ProfessorWithTurmas = ProfessorOficial & {
  turma_count?: number;
  cursos?: string[];
  anos?: string[];
};

const AREAS_POR_CURSO: Record<string, string[]> = {
  Informatica: [
    "Desenvolvimento de Software",
    "Banco de Dados",
    "Redes e Infraestrutura",
    "Engenharia de Computação",
    "Hardware",
  ],

  Administracao: [
    "Ciências Contábeis",
    "Gestão de Pessoas",
    "Marketing e Vendas",
    "Economia",
    "Logística",
  ],

  Enfermagem: [
    "Enfermagem Geral",
    "Farmacologia",
    "Emergências Médicas",
    "Saúde Pública",
    "Enfermagem Cirúrgica",
  ],

  "Geral / Base Comum": [
    "Matemática",
    "Letras / Português",
    "História",
    "Geografia",
    "Física",
    "Química",
    "Biologia",
    "Inglês",
  ],
};

export function CoordenacaoProfessoresPage() {
  const [professores, setProfessores] = useState<
    ProfessorWithTurmas[]
  >([]);

  const [usuariosProfessores, setUsuariosProfessores] =
    useState<UsuarioProfessor[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const [search, setSearch] = useState("");

  const [selectedCurso, setSelectedCurso] =
    useState("TODOS");

  const [selectedAno, setSelectedAno] =
    useState("TODOS");

  const [selectedArea, setSelectedArea] =
    useState("TODAS");

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] =
    useState<ProfessorWithTurmas | null>(null);

  const [usuarioId, setUsuarioId] = useState("");

  const [nome, setNome] = useState("");

  const [areaFormacao, setAreaFormacao] =
    useState("");

  const [email, setEmail] = useState("");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /**
   * =========================================================
   * CARREGAR PROFESSORES
   * =========================================================
   *
   * Esta página trabalha com a tabela:
   *
   * professores_oficial
   *
   * O vínculo correto é:
   *
   * professores_oficial.usuario_id
   *          ↓
   * usuarios.id
   *
   * NÃO usamos usuarios.professor_id aqui.
   *
   * Isso é importante porque usuarios.professor_id
   * atualmente possui FK para a tabela antiga "professores".
   */
  async function load() {
    setLoading(true);
    setError("");

    try {
      const {
        data: profsData,
        error: profsErr,
      } = await supabase
        .from("professores_oficial")
        .select("*")
        .order("nome", {
          ascending: true,
        });

      if (profsErr) {
        throw profsErr;
      }

      const list =
        (profsData ?? []) as ProfessorOficial[];

      /**
       * Busca os vínculos de turmas.
       *
       * ATENÇÃO:
       * Caso turma_professores ainda use a tabela
       * antiga "professores", os IDs podem não
       * corresponder aos IDs de professores_oficial.
       *
       * Por isso o carregamento das turmas é tratado
       * separadamente e não impede a lista de professores.
       */
      const {
        data: tp,
        error: tpError,
      } = await supabase
        .from("turma_professores")
        .select("professor_id, turmas(curso, ano)");

      if (tpError) {
        console.warn(
          "Não foi possível carregar as turmas:",
          tpError.message
        );
      }

      const counts = new Map<string, number>();

      const cursosMap = new Map<
        string,
        Set<string>
      >();

      const anosMap = new Map<
        string,
        Set<string>
      >();

      for (const row of tp ?? []) {
        const profId = row.professor_id;

        counts.set(
          profId,
          (counts.get(profId) ?? 0) + 1
        );

        if (row.turmas) {
          const turma =
            row.turmas as unknown as {
              curso?: string;
              ano?: string;
            };

          if (turma.curso) {
            if (!cursosMap.has(profId)) {
              cursosMap.set(
                profId,
                new Set<string>()
              );
            }

            cursosMap
              .get(profId)
              ?.add(turma.curso);
          }

          if (turma.ano) {
            if (!anosMap.has(profId)) {
              anosMap.set(
                profId,
                new Set<string>()
              );
            }

            anosMap
              .get(profId)
              ?.add(turma.ano);
          }
        }
      }

      setProfessores(
        list.map((professor) => ({
          ...professor,

          turma_count:
            counts.get(professor.id) ?? 0,

          cursos: Array.from(
            cursosMap.get(professor.id) ?? []
          ),

          anos: Array.from(
            anosMap.get(professor.id) ?? []
          ),
        }))
      );
    } catch (err) {
      console.error(
        "Erro ao carregar professores:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar professores."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * =========================================================
   * CARREGAR USUÁRIOS PROFESSORES
   * =========================================================
   *
   * Busca os usuários da tabela usuarios que possuem:
   *
   * tipo_usuario = professor
   *
   * Esses usuários são os que podem ser vinculados
   * a professores_oficial.
   */
  async function loadUsuariosProfessores() {
    setLoadingUsuarios(true);

    try {
      const {
        data,
        error: err,
      } = await supabase
        .from("usuarios")
        .select(
          "id, nome, email, tipo_usuario"
        )
        .eq("tipo_usuario", "professor")
        .order("nome", {
          ascending: true,
        });

      if (err) {
        throw err;
      }

      setUsuariosProfessores(
        (data ?? []) as UsuarioProfessor[]
      );
    } catch (err) {
      console.error(
        "Erro ao carregar usuários professores:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar usuários professores."
      );
    } finally {
      setLoadingUsuarios(false);
    }
  }

  useEffect(() => {
    load();
    loadUsuariosProfessores();
  }, []);

  /**
   * =========================================================
   * USUÁRIOS DISPONÍVEIS
   * =========================================================
   *
   * Um usuário só pode possuir um perfil em
   * professores_oficial.
   */
  const usuariosDisponiveis = useMemo(() => {
    const vinculados = new Set(
      professores
        .map((professor) => professor.usuario_id)
        .filter(
          (
            id
          ): id is string => Boolean(id)
        )
    );

    return usuariosProfessores.filter(
      (usuario) => {
        return (
          !vinculados.has(usuario.id) ||
          usuario.id === editing?.usuario_id
        );
      }
    );
  }, [
    usuariosProfessores,
    professores,
    editing,
  ]);

  /**
   * =========================================================
   * SELEÇÃO DO USUÁRIO
   * =========================================================
   */
  function handleUsuarioChange(id: string) {
    setUsuarioId(id);

    const usuario =
      usuariosProfessores.find(
        (item) => item.id === id
      );

    if (usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
    }
  }

  /**
   * =========================================================
   * CURSOS
   * =========================================================
   */
  const cursosDisponiveis = useMemo(() => {
    const list = new Set<string>();

    Object.keys(AREAS_POR_CURSO).forEach(
      (curso) => list.add(curso)
    );

    professores.forEach((professor) =>
      professor.cursos?.forEach(
        (curso) => list.add(curso)
      )
    );

    return Array.from(list).sort();
  }, [professores]);

  /**
   * =========================================================
   * ANOS
   * =========================================================
   */
  const anosDisponiveis = useMemo(() => {
    const list = new Set<string>([
      "1º Ano",
      "2º Ano",
      "3º Ano",
      "4º Ano",
    ]);

    professores.forEach((professor) =>
      professor.anos?.forEach(
        (ano) => list.add(ano)
      )
    );

    return Array.from(list).sort();
  }, [professores]);

  /**
   * =========================================================
   * ÁREAS
   * =========================================================
   */
  const areasDisponiveis = useMemo(() => {
    if (
      selectedCurso !== "TODOS" &&
      AREAS_POR_CURSO[selectedCurso]
    ) {
      return [
        ...AREAS_POR_CURSO[selectedCurso],
      ].sort();
    }

    const list = Array.from(
      new Set(
        professores
          .map(
            (professor) =>
              (
                professor.area_formacao ??
                ""
              ).trim()
          )
          .filter(Boolean)
      )
    );

    return list.sort();
  }, [
    professores,
    selectedCurso,
  ]);

  /**
   * =========================================================
   * FILTRO
   * =========================================================
   */
  const filtered = useMemo(() => {
    const term = search
      .toLowerCase()
      .trim();

    return professores.filter(
      (professor) => {
        const matchesText =
          professor.nome
            .toLowerCase()
            .includes(term) ||
          (
            professor.area_formacao ??
            ""
          )
            .toLowerCase()
            .includes(term) ||
          (
            professor.email ?? ""
          )
            .toLowerCase()
            .includes(term);

        const matchesCurso =
          selectedCurso === "TODOS" ||
          (
            professor.cursos ?? []
          ).includes(selectedCurso);

        const matchesAno =
          selectedAno === "TODOS" ||
          (
            professor.anos ?? []
          ).includes(selectedAno);

        const matchesArea =
          selectedArea === "TODAS" ||
          professor.area_formacao ===
            selectedArea;

        return (
          matchesText &&
          matchesCurso &&
          matchesAno &&
          matchesArea
        );
      }
    );
  }, [
    professores,
    search,
    selectedCurso,
    selectedAno,
    selectedArea,
  ]);

  /**
   * =========================================================
   * CURSO
   * =========================================================
   */
  function handleCursoChange(
    curso: string
  ) {
    setSelectedCurso(curso);
    setSelectedArea("TODAS");
  }

  /**
   * =========================================================
   * NOVO PROFESSOR
   * =========================================================
   */
  function openCreate() {
    setEditing(null);

    setUsuarioId("");
    setNome("");
    setAreaFormacao("");
    setEmail("");

    setError("");
    setModalOpen(true);

    loadUsuariosProfessores();
  }

  /**
   * =========================================================
   * EDITAR PROFESSOR
   * =========================================================
   */
  function openEdit(
    professor: ProfessorWithTurmas
  ) {
    setEditing(professor);

    setUsuarioId(
      professor.usuario_id ?? ""
    );

    setNome(professor.nome);

    setAreaFormacao(
      professor.area_formacao ?? ""
    );

    setEmail(
      professor.email ?? ""
    );

    setError("");
    setModalOpen(true);

    loadUsuariosProfessores();
  }

  /**
   * =========================================================
   * SALVAR PROFESSOR
   * =========================================================
   *
   * NOVO FLUXO:
   *
   * usuarios
   *    │
   *    │ usuarios.id
   *    ↓
   * professores_oficial.usuario_id
   *
   * Não alteramos:
   *
   * usuarios.professor_id
   *
   * porque essa coluna ainda possui FK para
   * a tabela antiga "professores".
   */
  async function handleSave(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      /**
       * -----------------------------------------------------
       * VALIDAÇÕES
       * -----------------------------------------------------
       */
      if (!editing && !usuarioId) {
        throw new Error(
          "Selecione um usuário com perfil de Professor."
        );
      }

      if (!nome.trim()) {
        throw new Error(
          "Informe o nome do professor."
        );
      }

      if (!areaFormacao.trim()) {
        throw new Error(
          "Informe a área de formação."
        );
      }

      /**
       * -----------------------------------------------------
       * EDIÇÃO
       * -----------------------------------------------------
       */
      if (editing) {
        const {
          error: updateError,
        } = await supabase
          .from("professores_oficial")
          .update({
            nome: nome.trim(),
            email:
              email.trim() || null,
            area_formacao:
              areaFormacao.trim(),
          })
          .eq("id", editing.id);

        if (updateError) {
          throw updateError;
        }
      }

      /**
       * -----------------------------------------------------
       * NOVO PROFESSOR
       * -----------------------------------------------------
       *
       * O usuário já existe em "usuarios".
       *
       * Aqui criamos somente:
       *
       * professores_oficial
       *
       * com:
       *
       * usuario_id = usuarios.id
       */
      else {
        /**
         * Antes de inserir, confirma que o usuário
         * realmente existe.
         *
         * Isso evita violação da FK:
         *
         * professores_oficial_usuario_id_fkey
         */
        const {
          data: usuario,
          error: usuarioError,
        } = await supabase
          .from("usuarios")
          .select(
            "id, nome, email, tipo_usuario"
          )
          .eq("id", usuarioId)
          .eq(
            "tipo_usuario",
            "professor"
          )
          .maybeSingle();

        if (usuarioError) {
          throw new Error(
            `Erro ao verificar usuário: ${usuarioError.message}`
          );
        }

        if (!usuario) {
          throw new Error(
            "O usuário selecionado não existe ou não possui perfil de Professor."
          );
        }

        /**
         * Verifica se já existe um perfil
         * pedagógico para esse usuário.
         */
        const {
          data: professorExistente,
          error: professorBuscaError,
        } = await supabase
          .from("professores_oficial")
          .select("id")
          .eq(
            "usuario_id",
            usuarioId
          )
          .maybeSingle();

        if (professorBuscaError) {
          throw new Error(
            `Erro ao verificar professor: ${professorBuscaError.message}`
          );
        }

        if (professorExistente) {
          throw new Error(
            "Este usuário já possui um cadastro em professores_oficial."
          );
        }

        /**
         * Cria o professor oficial.
         */
        const {
          data: novoProfessor,
          error: insertError,
        } = await supabase
          .from("professores_oficial")
          .insert({
            usuario_id: usuarioId,
            nome: nome.trim(),
            email:
              email.trim() || null,
            area_formacao:
              areaFormacao.trim(),
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(
            `Erro ao cadastrar professor: ${insertError.message}`
          );
        }

        if (!novoProfessor) {
          throw new Error(
            "O professor não foi cadastrado."
          );
        }
      }

      /**
       * -----------------------------------------------------
       * LIMPA E RECARREGA
       * -----------------------------------------------------
       */
      setModalOpen(false);

      setEditing(null);
      setUsuarioId("");
      setNome("");
      setEmail("");
      setAreaFormacao("");

      await load();
      await loadUsuariosProfessores();
    } catch (err) {
      console.error(
        "Erro ao salvar professor:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao salvar professor."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Gestão de Professores"
        description="Gerencie os docentes da instituição, turmas e áreas de formação."
        action={
          <Button
            onClick={openCreate}
          >
            <Plus size={16} />
            Novo Professor
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
          {/* =====================================================
              FILTROS
          ====================================================== */}
          <div className="mb-6 space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Filter
                size={14}
                className="text-sky-400"
              />

              <span>
                Filtros de Busca
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchInput
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Buscar por nome, e-mail..."
                className="w-full"
              />

              <select
                value={selectedCurso}
                onChange={(e) =>
                  handleCursoChange(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">
                  Todos os Cursos
                </option>

                {cursosDisponiveis.map(
                  (curso) => (
                    <option
                      key={curso}
                      value={curso}
                    >
                      {curso}
                    </option>
                  )
                )}
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
                  Todos os Anos
                </option>

                {anosDisponiveis.map(
                  (ano) => (
                    <option
                      key={ano}
                      value={ano}
                    >
                      {ano}
                    </option>
                  )
                )}
              </select>

              <select
                value={selectedArea}
                onChange={(e) =>
                  setSelectedArea(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODAS">
                  {selectedCurso !==
                  "TODOS"
                    ? `Áreas de ${selectedCurso}`
                    : "Todas as Áreas de Formação"}
                </option>

                {areasDisponiveis.map(
                  (area) => (
                    <option
                      key={area}
                      value={area}
                    >
                      {area}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                Exibindo{" "}
                <strong className="text-slate-300">
                  {filtered.length}
                </strong>{" "}
                de{" "}
                {professores.length}{" "}
                professores
              </span>

              {(selectedCurso !==
                "TODOS" ||
                selectedAno !==
                  "TODOS" ||
                selectedArea !==
                  "TODAS" ||
                search) && (
                <button
                  onClick={() => {
                    setSelectedCurso(
                      "TODOS"
                    );
                    setSelectedAno(
                      "TODOS"
                    );
                    setSelectedArea(
                      "TODAS"
                    );
                    setSearch("");
                  }}
                  className="text-xs font-medium text-sky-400 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {/* =====================================================
              TABELA
          ====================================================== */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2
                className="animate-spin"
                size={22}
              />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "nome",
                  header:
                    "Nome do Professor",

                  render: (
                    professor
                  ) => (
                    <div>
                      <p className="font-semibold text-white">
                        {professor.nome}
                      </p>

                      {professor.email && (
                        <p className="text-xs text-slate-400">
                          {
                            professor.email
                          }
                        </p>
                      )}
                    </div>
                  ),
                },

                {
                  key: "area",
                  header:
                    "Área de Formação",

                  render: (
                    professor
                  ) => (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      <GraduationCap
                        size={12}
                      />

                      {professor.area_formacao ||
                        "Não informada"}
                    </span>
                  ),
                },

                {
                  key: "turma_count",
                  header:
                    "Turmas Atribuídas",

                  render: (
                    professor
                  ) => (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                      {
                        professor.turma_count ??
                        0
                      }{" "}
                      turma
                      {(
                        professor.turma_count ??
                        0
                      ) !== 1
                        ? "s"
                        : ""}
                    </span>
                  ),
                },

                {
                  key: "usuario",
                  header:
                    "Acesso",

                  render: (
                    professor
                  ) => (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                        professor.usuario_id
                          ? "border border-sky-500/20 bg-sky-500/10 text-sky-400"
                          : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      <UserCheck
                        size={12}
                      />

                      {professor.usuario_id
                        ? "Vinculado"
                        : "Sem acesso"}
                    </span>
                  ),
                },

                {
                  key: "actions",
                  header: "",
                  className:
                    "text-right",

                  render: (
                    professor
                  ) => (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() =>
                          openEdit(
                            professor
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-sky-300"
                        title="Editar professor"
                      >
                        <Pencil
                          size={15}
                        />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(professor) =>
                professor.id
              }
              emptyMessage="Nenhum professor encontrado."
            />
          )}
        </CardContent>
      </Card>

      {/* =========================================================
          MODAL
      ========================================================== */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        title={
          editing
            ? "Editar Professor"
            : "Cadastrar Novo Professor"
        }
        description={
          editing
            ? "Atualize os dados pedagógicos do professor."
            : "Selecione um usuário de acesso e complete o cadastro pedagógico."
        }
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
              type="submit"
              form="professor-form"
              disabled={saving}
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Salvar Professor"
              )}
            </Button>
          </>
        }
      >
        <form
          id="professor-form"
          onSubmit={handleSave}
          className="space-y-4"
        >
          {/* =====================================================
              USUÁRIO DE ACESSO
          ====================================================== */}
          {!editing && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Usuário de Acesso
              </label>

              {loadingUsuarios ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 text-sm text-slate-400">
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Carregando usuários...
                </div>
              ) : (
                <select
                  value={usuarioId}
                  onChange={(e) =>
                    handleUsuarioChange(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">
                    Selecione um professor...
                  </option>

                  {usuariosDisponiveis.map(
                    (usuario) => (
                      <option
                        key={usuario.id}
                        value={usuario.id}
                      >
                        {usuario.nome} —{" "}
                        {usuario.email}
                      </option>
                    )
                  )}
                </select>
              )}

              {!loadingUsuarios &&
                usuariosDisponiveis.length ===
                  0 && (
                  <p className="mt-1 text-xs text-amber-400">
                    Não existem usuários
                    com perfil de Professor
                    disponíveis. Crie primeiro
                    o usuário em Gestão de
                    Usuários.
                  </p>
                )}
            </div>
          )}

          {/* =====================================================
              USUÁRIO NA EDIÇÃO
          ====================================================== */}
          {editing && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-400">
                <UserCheck size={14} />

                Usuário de Acesso
              </div>

              <p className="text-sm font-medium text-white">
                {email ||
                  "Usuário não informado"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                O vínculo com o usuário
                é mantido através de{" "}
                <strong>
                  professores_oficial.usuario_id
                </strong>
                .
              </p>
            </div>
          )}

          {/* =====================================================
              NOME
          ====================================================== */}
          <Input
            label="Nome Completo"
            required
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            placeholder="Ex.: Prof. Carlos Silva"
            disabled={
              !editing && !usuarioId
            }
          />

          {/* =====================================================
              EMAIL
          ====================================================== */}
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="carlos.silva@escola.com"
            icon={<Mail size={16} />}
            disabled={
              !editing && !usuarioId
            }
          />

          {/* =====================================================
              ÁREA DE FORMAÇÃO
          ====================================================== */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Área de Formação
            </label>

            <input
              type="text"
              required
              value={areaFormacao}
              onChange={(e) =>
                setAreaFormacao(
                  e.target.value
                )
              }
              placeholder="Ex.: Desenvolvimento Web, Matemática"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* =====================================================
              INFORMAÇÃO
          ====================================================== */}
          {!editing && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
              <div className="flex gap-2">
                <Shield
                  size={16}
                  className="mt-0.5 shrink-0 text-sky-400"
                />

                <div>
                  <p className="text-xs font-semibold text-sky-300">
                    Como funciona
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    O usuário de login já
                    deve ter sido criado
                    em "Gestão de Usuários".
                    Aqui será criado apenas
                    o perfil pedagógico em{" "}
                    <strong className="text-slate-300">
                      professores_oficial
                    </strong>
                    .
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    O vínculo será feito por{" "}
                    <strong className="text-slate-400">
                      usuario_id
                    </strong>
                    , que aponta diretamente
                    para a tabela{" "}
                    <strong className="text-slate-400">
                      usuarios
                    </strong>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </AppLayout>
  );
}