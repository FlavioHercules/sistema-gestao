import { useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  Loader2,
  Filter,
  UserCheck,
  Shield,
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
import { coordenacaoNavItems } from "../../lib/navigation";

type UsuarioProfessor = {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
  curso?: string | null;
};

type ProfessorOficial = {
  id: string;
  nome: string;
  usuario_id: string | null;
  created_at?: string;
  email?: string | null;
  area_formacao?: string | null;
  curso?: string | null;
};

type ProfessorWithTurmas = ProfessorOficial & {
  turma_count?: number;
  cursos?: string[];
  anos?: string[];
};

const CURSOS_TECNICOS = [
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
];

const AREAS_POR_CURSO: Record<string, string[]> = {
  Informática: [
    "Desenvolvimento de Software",
    "Banco de Dados",
    "Redes e Infraestrutura",
    "Engenharia de Computação",
    "Hardware",
  ],

};

function normalizarFiltro(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cursosDoProfessor(professor: ProfessorWithTurmas) {
  const cursos = new Set(professor.cursos ?? []);

  if (professor.curso) {
    cursos.add(professor.curso);
  }

  const area = normalizarFiltro(professor.area_formacao ?? "");
  const cursoDaArea = Object.entries(AREAS_POR_CURSO).find(
    ([, areas]) =>
      areas.some((item) => normalizarFiltro(item) === area)
  )?.[0];

  if (cursoDaArea) {
    cursos.add(cursoDaArea);
  }

  const cursoMencionadoNaArea = CURSOS_TECNICOS.find((curso) =>
    area.includes(normalizarFiltro(curso))
  );

  if (cursoMencionadoNaArea) {
    cursos.add(cursoMencionadoNaArea);
  }

  return Array.from(cursos);
}

export function CoordenacaoProfessoresPage() {
  const [professores, setProfessores] = useState<
    ProfessorWithTurmas[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [selectedCurso, setSelectedCurso] =
    useState("TODOS");

  const [selectedAno, setSelectedAno] =
    useState("TODOS");

  const [selectedArea, setSelectedArea] =
    useState("TODAS");

  const [error, setError] = useState("");

  const [usuariosProfessores, setUsuariosProfessores] = useState<
    UsuarioProfessor[]
  >([]);

  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

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
      const [
        { data: turmasData, error: turmasError },
        { data: tp, error: tpError },
        { data: legacyProfessores, error: legacyProfessoresError },
        { data: usuariosData, error: usuariosError },
      ] =
        await Promise.all([
          supabase
            .from("turmas")
            .select("id, curso, ano"),
          supabase
            .from("turma_professores")
            .select("professor_id, turma_id"),
          supabase
            .from("professores")
            .select("id, usuario_id"),
          supabase
            .from("usuarios")
            .select("id, curso")
            .eq("tipo_usuario", "professor"),
        ]);

      if (turmasError) {
        console.warn(
          "Não foi possível carregar os cursos das turmas:",
          turmasError.message
        );
      }

      if (tpError) {
        console.warn(
          "Não foi possível carregar as turmas:",
          tpError.message
        );
      }

      if (legacyProfessoresError) {
        console.warn(
          "Não foi possível mapear os professores antigos:",
          legacyProfessoresError.message
        );
      }

      if (usuariosError) {
        console.warn(
          "Não foi possível carregar os cursos dos usuários:",
          usuariosError.message
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

      const turmaMap = new Map(
        (turmasData ?? []).map((turma) => [
          turma.id,
          turma,
        ])
      );

      const officialProfessorIds = new Set(
        list.map((professor) => professor.id)
      );

      const cursoByUsuarioId = new Map(
        (usuariosData ?? []).map((usuario) => [
          usuario.id,
          usuario.curso,
        ])
      );

      const officialIdByLegacyId = new Map(
        (legacyProfessores ?? [])
          .filter((professor) => professor.usuario_id)
          .map((professor) => [
            professor.id,
            list.find(
              (officialProfessor) =>
                officialProfessor.usuario_id ===
                professor.usuario_id
            )?.id,
          ])
      );

      for (const row of tp ?? []) {
        const profId = officialProfessorIds.has(row.professor_id)
          ? row.professor_id
          : officialIdByLegacyId.get(row.professor_id);

        if (!profId) {
          continue;
        }

        counts.set(
          profId,
          (counts.get(profId) ?? 0) + 1
        );

        const turma = turmaMap.get(row.turma_id);

        if (turma) {

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

          curso:
            cursoByUsuarioId.get(professor.usuario_id ?? "") ??
            professor.curso ??
            null,

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
  }, []);

  /**
   * =========================================================
   * USUÁRIOS DISPONÍVEIS
   * =========================================================
   *
   * Um usuário só pode possuir um perfil em
   * professores_oficial.
   */

  /**
   * =========================================================
   * CURSOS
   * =========================================================
   */
  const cursosDisponiveis = useMemo(() => {
    return CURSOS_TECNICOS;
  }, []);

  /**
   * =========================================================
   * ANOS
   * =========================================================
   */
  const anosDisponiveis = useMemo(() => {
    return ANOS_SERIES;
  }, []);

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
          cursosDoProfessor(professor).some(
            (curso) =>
              normalizarFiltro(curso) ===
              normalizarFiltro(selectedCurso)
          );

        const matchesAno =
          selectedAno === "TODOS" ||
          (
            professor.anos ?? []
          ).some(
            (ano) =>
              normalizarFiltro(ano) ===
              normalizarFiltro(selectedAno)
          );

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

  return (
    <AppLayout navItems={coordenacaoNavItems}>
      <PageHeader
        title="Gestão de Professores"
        description="Gerencie os docentes da instituição, turmas e áreas de formação."
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
                      <p
                        className="font-semibold"
                        style={{ color: "#111111", opacity: 1 }}
                      >
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
    </AppLayout>
  );
}
