import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Plus, Pencil, Trash2, Users, Loader2, Upload, AlertCircle, X, Eye, Download, CheckSquare, Square } from "lucide-react";
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
  { to: "/secretaria", label: "Dashboard", icon: <Users size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <Users size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <Users size={18} /> },
];

type AlunoWithTurma = Aluno & { turma?: Turma | null };

function formatDataNascimento(dataStr?: string | null) {
  if (!dataStr) return "—";
  const parts = dataStr.split("T")[0].split("-");
  if (parts.length !== 3) return dataStr;
  const [ano, mes, dia] = parts;
  return `${dia}/${mes}/${ano}`;
}

export function AlunosPage() {
  const [alunos, setAlunos] = useState<AlunoWithTurma[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("");
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Estados para seleção múltipla (Ações em Lote)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Estados para visualização de detalhes (Modal de Perfil)
  const [viewingAluno, setViewingAluno] = useState<AlunoWithTurma | null>(null);

  // Estados para o filtro inteligente de turmas
  const [turmaSearchText, setTurmaSearchText] = useState("");
  const [turmaDropdownOpen, setTurmaDropdownOpen] = useState(false);
  const turmaDropdownRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Modal de Cadastro/Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aluno | null>(null);
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Estados dos Modais de Exclusão (Único ou em Lote)
  const [deleteTarget, setDeleteTarget] = useState<Aluno | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fecha o dropdown de turmas ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (turmaDropdownRef.current && !turmaDropdownRef.current.contains(event.target as Node)) {
        setTurmaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [resAlunos, resTurmas] = await Promise.all([
        supabase.from("alunos").select("*, turma: turmas(*)").order("nome", { ascending: true }),
        supabase.from("turmas").select("*").order("nome", { ascending: true })
      ]);

      setAlunos((resAlunos.data ?? []) as AlunoWithTurma[]);

      if (resTurmas.error || !resTurmas.data || resTurmas.data.length === 0) {
        setTurmas(fallbackTurmas);
      } else {
        setTurmas(resTurmas.data as Turma[]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Não foi possível carregar os dados iniciais.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setNome("");
    setMatricula("");
    setTurmaId("");
    setDataNascimento("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(a: Aluno) {
    setEditing(a);
    setNome(a.nome);
    setMatricula(a.matricula);
    setTurmaId(a.turma_id ?? "");
    setDataNascimento(a.data_nascimento ? a.data_nascimento.split("T")[0] : "");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    
    setSaving(true);
    setError("");

    try {
      const payload = {
        nome: nome.trim(),
        matricula: matricula.trim(),
        turma_id: turmaId || null,
        data_nascimento: dataNascimento ? dataNascimento.trim() : null,
      };

      if (editing) {
        const { error: err } = await supabase
          .from("alunos")
          .update(payload)
          .eq("id", editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("alunos").insert(payload);
        if (err) throw err;
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    
    setDeleting(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("alunos")
        .delete()
        .eq("id", deleteTarget.id);
      if (err) throw err;

      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  // Exclusão em lote
  async function handleBulkDelete() {
    if (selectedIds.length === 0 || deleting) return;

    setDeleting(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("alunos")
        .delete()
        .in("id", selectedIds);
      if (err) throw err;

      setSelectedIds([]);
      setBulkDeleteOpen(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  // Importação via CSV
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const linhas = text.split("\n").map(l => l.trim()).filter(Boolean);
        
        const novosAlunos = [];
        for (let i = 1; i < linhas.length; i++) {
          const [nomeAluno, matriculaAluno, turmaIdCsv] = linhas[i].split(",").map(val => val?.trim());
          
          if (nomeAluno && matriculaAluno) {
            novosAlunos.push({
              nome: nomeAluno,
              matricula: matriculaAluno,
              turma_id: turmaIdCsv || turmaFilter || null
            });
          }
        }

        if (novosAlunos.length === 0) {
          throw new Error("Nenhum dado válido encontrado. Certifique-se do formato: Nome, Matricula, turma_id");
        }

        const { error: err } = await supabase.from("alunos").insert(novosAlunos);
        if (err) throw err;

        await loadData();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
        if (e.target) e.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  // Exportar para CSV
  function handleExportCsv() {
    if (filtered.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Nome,Matricula,DataNascimento,Turma\n";
    filtered.forEach(a => {
      const row = [
        `"${a.nome}"`,
        `"${a.matricula}"`,
        `"${a.data_nascimento ? a.data_nascimento.split("T")[0] : ""}"`,
        `"${a.turma?.nome || "Sem turma"}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_alunos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtros aplicados
  const filtered = useMemo(() => {
    return alunos.filter((a) => {
      const matchSearch =
        a.nome.toLowerCase().includes(search.toLowerCase()) ||
        a.matricula.toLowerCase().includes(search.toLowerCase());
      const matchTurma = !turmaFilter || a.turma_id === turmaFilter;
      return matchSearch && matchTurma;
    });
  }, [alunos, search, turmaFilter]);

  // Paginação computada
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedAlunos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Reseta para a página 1 ao filtrar ou buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [search, turmaFilter]);

  const pendentesCount = alunos.filter(a => !a.turma_id || !a.data_nascimento).length;

  const filteredTurmasList = turmas.filter(t => 
    t.nome.toLowerCase().includes(turmaSearchText.toLowerCase())
  );

  const selectedTurmaObj = turmas.find(t => t.id === turmaFilter);

  // Manipulação da seleção múltipla
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedAlunos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedAlunos.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Alunos"
        description="Cadastre, edite, importe, exporte e gerencie alunos"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <Button variant="ghost" onClick={handleExportCsv} title="Exportar relatório em CSV">
              <Download size={15} />
              Exportar CSV
            </Button>
            <Button variant="ghost" onClick={() => fileInputRef.current?.click()} title="Importar alunos via CSV">
              <Upload size={15} />
              Importar CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} />
              Novo aluno
            </Button>
          </div>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Alerta de dados incompletos */}
      {pendentesCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">
          <AlertCircle size={20} className="text-amber-400 shrink-0" />
          <span className="text-sm">
            Existem <strong className="font-semibold">{pendentesCount}</strong> aluno(s) com dados incompletos (sem turma ou sem data de nascimento).
          </span>
        </div>
      )}

      {/* Barra Flutuante de Ações em Lote */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-sky-950/80 border border-sky-500/30 px-4 py-3 text-sky-200 shadow-md">
          <span className="text-sm font-medium">
            {selectedIds.length} aluno(s) selecionado(s) nesta página.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="danger" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 size={15} className="mr-1" /> Excluir Selecionados
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center relative">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="sm:w-64"
              />

              {/* Filtro de Turmas Inteligente */}
              <div className="relative sm:w-64" ref={turmaDropdownRef}>
                <div 
                  onClick={() => setTurmaDropdownOpen(!turmaDropdownOpen)}
                  className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 text-sm text-slate-200 hover:border-slate-500 transition-colors"
                >
                  <span className="truncate">
                    {selectedTurmaObj ? selectedTurmaObj.nome : "Filtrar por turma..."}
                  </span>
                  {turmaFilter && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurmaFilter("");
                      }}
                      className="ml-2 text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {turmaDropdownOpen && (
                  <div className="absolute left-0 top-12 z-50 w-full rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                    <div className="p-2 border-b border-slate-800">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Digite para buscar turma..."
                        value={turmaSearchText}
                        onChange={(e) => setTurmaSearchText(e.target.value)}
                        className="w-full rounded bg-slate-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      <div
                        onClick={() => {
                          setTurmaFilter("");
                          setTurmaDropdownOpen(false);
                          setTurmaSearchText("");
                        }}
                        className="cursor-pointer rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                      >
                        Todas as turmas
                      </div>
                      {filteredTurmasList.length === 0 ? (
                        <div className="px-2 py-2 text-center text-xs text-slate-500">Nenhuma turma encontrada</div>
                      ) : (
                        filteredTurmasList.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setTurmaFilter(t.id);
                              setTurmaDropdownOpen(false);
                              setTurmaSearchText("");
                            }}
                            className={`cursor-pointer rounded px-2 py-1.5 text-xs ${turmaFilter === t.id ? "bg-sky-500/20 text-sky-300 font-medium" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                          >
                            {t.nome}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Exibindo {paginatedAlunos.length} de {filtered.length} aluno(s)</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value={10}>10 por pág</option>
                <option value={25}>25 por pág</option>
                <option value={50}>50 por pág</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              <DataTable
                columns={[
                  {
                    key: "select",
                    header: (
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                        {paginatedAlunos.length > 0 && selectedIds.length === paginatedAlunos.length ? (
                          <CheckSquare size={16} className="text-sky-400" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    ),
                    render: (a) => (
                      <button onClick={() => toggleSelectOne(a.id)} className="text-slate-400 hover:text-white">
                        {selectedIds.includes(a.id) ? (
                          <CheckSquare size={16} className="text-sky-400" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    ),
                  },
                  { 
                    key: "nome", 
                    header: "Nome", 
                    render: (a) => (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{a.nome}</span>
                        {(!a.turma_id || !a.data_nascimento) && (
                          <span title="Cadastro incompleto" className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                    ) 
                  },
                  { key: "matricula", header: "Matrícula", render: (a) => <span className="font-mono text-xs text-slate-400">{a.matricula}</span> },
                  {
                    key: "data_nascimento",
                    header: "Nascimento",
                    render: (a) => <span className={`text-xs ${!a.data_nascimento ? "text-amber-400/80 italic" : "text-slate-400"}`}>{formatDataNascimento(a.data_nascimento)}</span>,
                  },
                  {
                    key: "turma",
                    header: "Turma",
                    render: (a) =>
                      a.turma ? (
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{a.turma.nome}</span>
                      ) : (
                        <span className="text-xs text-amber-400/80 italic">Sem turma</span>
                      ),
                  },
                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (a) => (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingAluno(a)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors"
                          aria-label="Ver detalhes"
                          title="Detalhes do aluno"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-sky-300 transition-colors"
                          aria-label="Editar"
                          title="Editar aluno"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors"
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
                rowKey={(a) => a.id}
                emptyMessage="Nenhum aluno cadastrado. Clique em 'Novo aluno'."
              />

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-xs text-slate-400">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
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

      {/* Modal de Detalhes / Perfil do Aluno */}
      <Modal
        open={!!viewingAluno}
        onClose={() => setViewingAluno(null)}
        title="Perfil do Aluno"
        description="Informações detalhadas do cadastro."
        footer={
          <Button variant="ghost" onClick={() => setViewingAluno(null)}>Fechar</Button>
        }
      >
        {viewingAluno && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500 block">Nome completo</span>
                <span className="font-medium text-white text-base">{viewingAluno.nome}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block">Matrícula</span>
                  <span className="font-mono text-slate-200">{viewingAluno.matricula}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Data de Nascimento</span>
                  <span className="text-slate-200">{formatDataNascimento(viewingAluno.data_nascimento)}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Turma Atual</span>
                <span className="text-slate-200">{viewingAluno.turma?.nome || "Nenhuma turma vinculada"}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Cadastro/Edição */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar aluno" : "Novo aluno"}
        description={editing ? "Atualize os dados do aluno." : "Preencha os dados do novo aluno."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="aluno-form" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
            </Button>
          </>
        }
      >
        <form id="aluno-form" onSubmit={handleSave} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input label="Nome completo" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João Silva" />
          <Input label="Matrícula" required value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex.: 2025001" />
          <Input label="Data de nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
          <Select label="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Selecione uma turma</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome} — {t.ano_letivo}</option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* Modal de Exclusão (Único) */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir aluno"
        description="Esta ação não pode ser desfeita."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : "Excluir"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Deseja realmente excluir <span className="font-semibold text-white">{deleteTarget?.nome}</span>?
          As notas vinculadas também serão removidas.
        </p>
      </Modal>

      {/* Modal de Exclusão em Lote */}
      <Modal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Excluir alunos selecionados"
        description="Esta ação não pode ser desfeita."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : "Excluir Todos"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Deseja realmente excluir os <span className="font-semibold text-white">{selectedIds.length}</span> alunos selecionados?
          As notas vinculadas a eles também serão removidas.
        </p>
      </Modal>
    </AppLayout>
  );
}