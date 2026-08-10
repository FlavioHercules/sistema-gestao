import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Upload,
  AlertCircle,
  X,
  Eye,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type { Aluno, Turma } from "../../lib/supabase";
import { fallbackTurmas } from "../../lib/school";

import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Input, Select } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  {
    to: "/secretaria",
    label: "Dashboard",
    icon: Users,
  },
  {
    to: "/secretaria/alunos",
    label: "Alunos",
    icon: Users,
  },
  {
    to: "/secretaria/turmas",
    label: "Turmas",
    icon: Users,
  },
];

type AlunoWithTurma = Aluno & {
  turma?: Turma | null;
};

function formatDataNascimento(dataStr?: string | null) {
  if (!dataStr) return "—";

  const parts = dataStr.split("T")[0].split("-");

  if (parts.length !== 3) return dataStr;

  const [ano, mes, dia] = parts;

  return `${dia}/${mes}/${ano}`;
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

export function AlunosPage() {
  const [alunos, setAlunos] = useState<AlunoWithTurma[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Visualização
  const [viewingAluno, setViewingAluno] =
    useState<AlunoWithTurma | null>(null);

  // Filtro inteligente de turma
  const [turmaSearchText, setTurmaSearchText] = useState("");
  const [turmaDropdownOpen, setTurmaDropdownOpen] = useState(false);

  const turmaDropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cadastro / edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aluno | null>(null);

  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Exclusão
  const [deleteTarget, setDeleteTarget] = useState<Aluno | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        turmaDropdownRef.current &&
        !turmaDropdownRef.current.contains(event.target as Node)
      ) {
        setTurmaDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Carrega alunos e turmas
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [resAlunos, resTurmas] = await Promise.all([
        supabase
          .from("alunos")
          .select("*, turma:turmas(*)")
          .order("nome", { ascending: true }),

        supabase
          .from("turmas")
          .select("*")
          .order("nome", { ascending: true }),
      ]);

      if (resAlunos.error) {
        throw resAlunos.error;
      }

      setAlunos((resAlunos.data ?? []) as AlunoWithTurma[]);

      if (
        resTurmas.error ||
        !resTurmas.data ||
        resTurmas.data.length === 0
      ) {
        setTurmas(fallbackTurmas);
      } else {
        setTurmas(resTurmas.data as Turma[]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os dados iniciais."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Limpa seleção quando os filtros/página mudarem
  useEffect(() => {
    setSelectedIds([]);
  }, [search, turmaFilter, currentPage, pageSize]);

  function openCreate() {
    setEditing(null);

    setNome("");
    setMatricula("");
    setTurmaId("");
    setDataNascimento("");

    setError("");
    setModalOpen(true);
  }

  function openEdit(aluno: Aluno) {
    setEditing(aluno);

    setNome(aluno.nome ?? "");
    setMatricula(aluno.matricula ?? "");
    setTurmaId(aluno.turma_id ?? "");

    setDataNascimento(
      aluno.data_nascimento
        ? aluno.data_nascimento.split("T")[0]
        : ""
    );

    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setError("");

    const nomeLimpo = nome.trim();
    const matriculaLimpa = matricula.trim();

    if (!nomeLimpo) {
      setError("Informe o nome completo do aluno.");
      return;
    }

    if (!matriculaLimpa) {
      setError("Informe a matrícula do aluno.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nome: nomeLimpo,
        matricula: matriculaLimpa,
        turma_id: turmaId || null,
        data_nascimento: dataNascimento
          ? dataNascimento.trim()
          : null,
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from("alunos")
          .update(payload)
          .eq("id", editing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("alunos")
          .insert(payload);

        if (insertError) throw insertError;
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o aluno."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("alunos")
        .delete()
        .eq("id", deleteTarget.id);

      if (deleteError) throw deleteError;

      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir o aluno."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0 || deleting) return;

    setDeleting(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("alunos")
        .delete()
        .in("id", selectedIds);

      if (deleteError) throw deleteError;

      setSelectedIds([]);
      setBulkDeleteOpen(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir os alunos selecionados."
      );
    } finally {
      setDeleting(false);
    }
  }

  // Importação CSV
  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setError("");

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = String(event.target?.result ?? "");

        const linhas = text
          .split(/\r?\n/)
          .map((linha) => linha.trim())
          .filter(Boolean);

        if (linhas.length <= 1) {
          throw new Error(
            "O arquivo CSV não possui alunos para importar."
          );
        }

        const novosAlunos: Array<{
          nome: string;
          matricula: string;
          turma_id: string | null;
        }> = [];

        for (let i = 1; i < linhas.length; i++) {
          const partes = linhas[i]
            .split(",")
            .map((valor) =>
              valor.trim().replace(/^"|"$/g, "")
            );

          const nomeAluno = partes[0];
          const matriculaAluno = partes[1];
          const turmaIdCsv = partes[2];

          if (!nomeAluno || !matriculaAluno) {
            continue;
          }

          novosAlunos.push({
            nome: nomeAluno,
            matricula: matriculaAluno,
            turma_id:
              turmaIdCsv ||
              turmaFilter ||
              null,
          });
        }

        if (novosAlunos.length === 0) {
          throw new Error(
            "Nenhum dado válido encontrado. Use o formato: Nome,Matricula,turma_id"
          );
        }

        const { error: insertError } = await supabase
          .from("alunos")
          .insert(novosAlunos);

        if (insertError) throw insertError;

        await loadData();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao importar o arquivo CSV."
        );
      } finally {
        setLoading(false);

        if (e.target) {
          e.target.value = "";
        }
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setError("Não foi possível ler o arquivo CSV.");

      if (e.target) {
        e.target.value = "";
      }
    };

    reader.readAsText(file, "UTF-8");
  }

  // Exportação CSV
  function handleExportCsv() {
    if (filtered.length === 0) return;

    const header =
      "Nome,Matricula,DataNascimento,Turma\n";

    const rows = filtered
      .map((aluno) => {
        return [
          escapeCsvValue(aluno.nome),
          escapeCsvValue(aluno.matricula),
          escapeCsvValue(
            aluno.data_nascimento
              ? aluno.data_nascimento.split("T")[0]
              : ""
          ),
          escapeCsvValue(
            aluno.turma?.nome || "Sem turma"
          ),
        ].join(",");
      })
      .join("\n");

    const csvContent = `\uFEFF${header}${rows}`;

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio_alunos.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // Filtros
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return alunos.filter((aluno) => {
      const matchSearch =
        !searchLower ||
        aluno.nome.toLowerCase().includes(searchLower) ||
        aluno.matricula.toLowerCase().includes(searchLower);

      const matchTurma =
        !turmaFilter ||
        aluno.turma_id === turmaFilter;

      return matchSearch && matchTurma;
    });
  }, [alunos, search, turmaFilter]);

  // Paginação
  const totalPages =
    Math.ceil(filtered.length / pageSize) || 1;

  const paginatedAlunos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return filtered.slice(
      start,
      start + pageSize
    );
  }, [filtered, currentPage, pageSize]);

  // Corrige página caso a quantidade de registros diminua
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pendentesCount = useMemo(
    () =>
      alunos.filter(
        (aluno) =>
          !aluno.turma_id ||
          !aluno.data_nascimento
      ).length,
    [alunos]
  );

  const filteredTurmasList = useMemo(() => {
    const searchLower =
      turmaSearchText.toLowerCase().trim();

    return turmas.filter((turma) =>
      turma.nome
        .toLowerCase()
        .includes(searchLower)
    );
  }, [turmas, turmaSearchText]);

  const selectedTurmaObj = useMemo(
    () =>
      turmas.find(
        (turma) => turma.id === turmaFilter
      ),
    [turmas, turmaFilter]
  );

  // Seleção múltipla
  const allCurrentPageSelected =
    paginatedAlunos.length > 0 &&
    paginatedAlunos.every((aluno) =>
      selectedIds.includes(aluno.id)
    );

  const someCurrentPageSelected =
    paginatedAlunos.some((aluno) =>
      selectedIds.includes(aluno.id)
    );

  function toggleSelectAll() {
    const currentPageIds = paginatedAlunos.map(
      (aluno) => aluno.id
    );

    if (allCurrentPageSelected) {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => !currentPageIds.includes(id)
        )
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([
          ...prev,
          ...currentPageIds,
        ]),
      ]);
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  }

  return (
    <AppLayout navItems={navItems}>
      <PageHeader
        title="Alunos"
        description="Cadastre, edite, importe, exporte e gerencie os alunos."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              variant="ghost"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              title="Exportar alunos para CSV"
            >
              <Download
                size={16}
                className="mr-1.5"
              />
              Exportar CSV
            </Button>

            <Button
              variant="ghost"
              onClick={() =>
                fileInputRef.current?.click()
              }
              title="Importar alunos via CSV"
            >
              <Upload
                size={16}
                className="mr-1.5"
              />
              Importar CSV
            </Button>

            <Button onClick={openCreate}>
              <Plus
                size={16}
                className="mr-1.5"
              />
              Novo aluno
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* Alerta de dados incompletos */}
      {pendentesCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">
          <AlertCircle
            size={20}
            className="shrink-0 text-amber-400"
          />

          <span className="text-sm">
            Existem{" "}
            <strong className="font-semibold">
              {pendentesCount}
            </strong>{" "}
            aluno(s) com dados incompletos
            (sem turma ou sem data de nascimento).
          </span>
        </div>
      )}

      {/* Ações em lote */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-sky-500/30 bg-sky-950/80 px-4 py-3 text-sky-200 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">
            {selectedIds.length} aluno(s)
            selecionado(s).
          </span>

          <Button
            variant="danger"
            onClick={() =>
              setBulkDeleteOpen(true)
            }
          >
            <Trash2
              size={15}
              className="mr-1"
            />
            Excluir Selecionados
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* Filtros */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Buscar por nome ou matrícula..."
                className="sm:w-64"
              />

              {/* Filtro de turma */}
              <div
                className="relative sm:w-64"
                ref={turmaDropdownRef}
              >
                <div
                  onClick={() =>
                    setTurmaDropdownOpen(
                      (prev) => !prev
                    )
                  }
                  className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 text-sm text-slate-200 transition-colors hover:border-slate-500"
                >
                  <span className="truncate">
                    {selectedTurmaObj
                      ? selectedTurmaObj.nome
                      : "Filtrar por turma..."}
                  </span>

                  {turmaFilter && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurmaFilter("");
                      }}
                      className="ml-2 text-slate-400 hover:text-white"
                      aria-label="Limpar filtro de turma"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {turmaDropdownOpen && (
                  <div className="absolute left-0 top-12 z-50 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                    <div className="border-b border-slate-800 p-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Digite para buscar turma..."
                        value={turmaSearchText}
                        onChange={(e) =>
                          setTurmaSearchText(
                            e.target.value
                          )
                        }
                        className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto p-1">
                      <div
                        onClick={() => {
                          setTurmaFilter("");
                          setTurmaDropdownOpen(
                            false
                          );
                          setTurmaSearchText("");
                        }}
                        className="cursor-pointer rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        Todas as turmas
                      </div>

                      {filteredTurmasList.length ===
                      0 ? (
                        <div className="px-2 py-2 text-center text-xs text-slate-500">
                          Nenhuma turma encontrada
                        </div>
                      ) : (
                        filteredTurmasList.map(
                          (turma) => (
                            <div
                              key={turma.id}
                              onClick={() => {
                                setTurmaFilter(
                                  turma.id
                                );
                                setTurmaDropdownOpen(
                                  false
                                );
                                setTurmaSearchText("");
                              }}
                              className={`cursor-pointer rounded px-2 py-1.5 text-xs transition-colors ${
                                turmaFilter ===
                                turma.id
                                  ? "bg-sky-500/20 font-medium text-sky-300"
                                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              {turma.nome}
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>
                Exibindo{" "}
                {paginatedAlunos.length} de{" "}
                {filtered.length} aluno(s)
              </span>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(
                    Number(e.target.value)
                  );
                  setCurrentPage(1);
                }}
                className="h-8 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value={10}>
                  10 por pág
                </option>
                <option value={25}>
                  25 por pág
                </option>
                <option value={50}>
                  50 por pág
                </option>
              </select>
            </div>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2
                className="animate-spin"
                size={24}
              />
            </div>
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    key: "select",
                    header: (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-white"
                        aria-label="Selecionar todos"
                      >
                        {allCurrentPageSelected ? (
                          <CheckSquare
                            size={16}
                            className="text-sky-400"
                          />
                        ) : (
                          <Square
                            size={16}
                            className={
                              someCurrentPageSelected
                                ? "text-sky-400"
                                : ""
                            }
                          />
                        )}
                      </button>
                    ),
                    render: (aluno) => (
                      <button
                        type="button"
                        onClick={() =>
                          toggleSelectOne(
                            aluno.id
                          )
                        }
                        className="text-slate-400 hover:text-white"
                        aria-label={`Selecionar ${aluno.nome}`}
                      >
                        {selectedIds.includes(
                          aluno.id
                        ) ? (
                          <CheckSquare
                            size={16}
                            className="text-sky-400"
                          />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    ),
                  },

                  {
                    key: "nome",
                    header: "Nome",
                    render: (aluno) => (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {aluno.nome}
                        </span>

                        {(!aluno.turma_id ||
                          !aluno.data_nascimento) && (
                          <span
                            title="Cadastro incompleto"
                            className="inline-block h-2 w-2 rounded-full bg-amber-400"
                          />
                        )}
                      </div>
                    ),
                  },

                  {
                    key: "matricula",
                    header: "Matrícula",
                    render: (aluno) => (
                      <span className="font-mono text-xs text-slate-400">
                        {aluno.matricula}
                      </span>
                    ),
                  },

                  {
                    key: "data_nascimento",
                    header: "Nascimento",
                    render: (aluno) => (
                      <span
                        className={`text-xs ${
                          !aluno.data_nascimento
                            ? "italic text-amber-400/80"
                            : "text-slate-400"
                        }`}
                      >
                        {formatDataNascimento(
                          aluno.data_nascimento
                        )}
                      </span>
                    ),
                  },

                  {
                    key: "turma",
                    header: "Turma",
                    render: (aluno) =>
                      aluno.turma ? (
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {aluno.turma.nome}
                        </span>
                      ) : (
                        <span className="text-xs italic text-amber-400/80">
                          Sem turma
                        </span>
                      ),
                  },

                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (aluno) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setViewingAluno(aluno)
                          }
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-300"
                          aria-label="Ver detalhes"
                          title="Detalhes do aluno"
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(aluno)
                          }
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-sky-300"
                          aria-label="Editar"
                          title="Editar aluno"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(aluno)
                          }
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
                          aria-label="Excluir"
                          title="Excluir aluno"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={paginatedAlunos}
                rowKey={(aluno) => aluno.id}
                emptyMessage="Nenhum aluno cadastrado. Clique em 'Novo aluno'."
              />

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-xs text-slate-400">
                    Página {currentPage} de{" "}
                    {totalPages}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setCurrentPage(
                          (prev) =>
                            Math.max(
                              prev - 1,
                              1
                            )
                        )
                      }
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() =>
                        setCurrentPage(
                          (prev) =>
                            Math.min(
                              prev + 1,
                              totalPages
                            )
                        )
                      }
                      disabled={
                        currentPage === totalPages
                      }
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de perfil */}
      <Modal
        open={!!viewingAluno}
        onClose={() =>
          setViewingAluno(null)
        }
        title="Perfil do Aluno"
        description="Informações detalhadas do cadastro."
        footer={
          <Button
            variant="ghost"
            onClick={() =>
              setViewingAluno(null)
            }
          >
            Fechar
          </Button>
        }
      >
        {viewingAluno && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <div>
                <span className="block text-xs text-slate-500">
                  Nome completo
                </span>

                <span className="text-base font-medium text-white">
                  {viewingAluno.nome}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-500">
                    Matrícula
                  </span>

                  <span className="font-mono text-slate-200">
                    {viewingAluno.matricula}
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-slate-500">
                    Data de Nascimento
                  </span>

                  <span className="text-slate-200">
                    {formatDataNascimento(
                      viewingAluno.data_nascimento
                    )}
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-xs text-slate-500">
                  Turma Atual
                </span>

                <span className="text-slate-200">
                  {viewingAluno.turma?.nome ||
                    "Nenhuma turma vinculada"}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cadastro/edição */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        title={
          editing
            ? "Editar aluno"
            : "Novo aluno"
        }
        description={
          editing
            ? "Atualize os dados do aluno."
            : "Preencha os dados do novo aluno."
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
              form="aluno-form"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2
                    size={16}
                    className="mr-1.5 animate-spin"
                  />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </>
        }
      >
        <form
          id="aluno-form"
          onSubmit={handleSave}
          className="space-y-4"
        >
          {error && (
            <ErrorBanner message={error} />
          )}

          <Input
            label="Nome completo"
            required
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            placeholder="Ex.: João Silva"
          />

          <Input
            label="Matrícula"
            required
            value={matricula}
            onChange={(e) =>
              setMatricula(e.target.value)
            }
            placeholder="Ex.: 2025001"
          />

          <Input
            label="Data de nascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) =>
              setDataNascimento(
                e.target.value
              )
            }
          />

          <Select
            label="Turma"
            value={turmaId}
            onChange={(e) =>
              setTurmaId(e.target.value)
            }
          >
            <option value="">
              Selecione uma turma
            </option>

            {turmas.map((turma) => (
              <option
                key={turma.id}
                value={turma.id}
              >
                {turma.nome} —{" "}
                {turma.ano_letivo}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* Modal exclusão individual */}
      <Modal
        open={!!deleteTarget}
        onClose={() =>
          !deleting &&
          setDeleteTarget(null)
        }
        title="Excluir aluno"
        description="Esta ação não pode ser desfeita."
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
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2
                    size={16}
                    className="mr-1.5 animate-spin"
                  />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Deseja realmente excluir{" "}
          <span className="font-semibold text-white">
            {deleteTarget?.nome}
          </span>
          ?
          <br />
          <span className="mt-2 block text-xs text-slate-500">
            As notas vinculadas também poderão
            ser removidas conforme as regras do
            banco de dados.
          </span>
        </p>
      </Modal>

      {/* Modal exclusão em lote */}
      <Modal
        open={bulkDeleteOpen}
        onClose={() =>
          !deleting &&
          setBulkDeleteOpen(false)
        }
        title="Excluir alunos selecionados"
        description="Esta ação não pode ser desfeita."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() =>
                setBulkDeleteOpen(false)
              }
              disabled={deleting}
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2
                    size={16}
                    className="mr-1.5 animate-spin"
                  />
                  Excluindo...
                </>
              ) : (
                "Excluir Todos"
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Deseja realmente excluir{" "}
          <span className="font-semibold text-white">
            {selectedIds.length}
          </span>{" "}
          aluno(s) selecionado(s)?
          <br />
          <span className="mt-2 block text-xs text-slate-500">
            Essa ação não poderá ser desfeita.
          </span>
        </p>
      </Modal>
    </AppLayout>
  );
}