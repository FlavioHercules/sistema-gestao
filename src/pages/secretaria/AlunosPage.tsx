import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Loader2 } from "lucide-react";
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

// Função auxiliar para exibir datas de nascimento sem alteração de fuso horário
function formatDataNascimento(dataStr?: string | null) {
  if (!dataStr) return "—";
  // dataStr é "YYYY-MM-DD"
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Aluno | null>(null);
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Aluno | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("alunos")
      .select("*, turma: turmas(*)")
      .order("nome", { ascending: true });
    setAlunos((data ?? []) as AlunoWithTurma[]);

    const { data: t, error } = await supabase
      .from("turmas")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      setTurmas(fallbackTurmas);
    } else {
      setTurmas(t && t.length > 0 ? (t as Turma[]) : fallbackTurmas);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
    // Pega somente a parte 'YYYY-MM-DD' para o input type="date"
    setDataNascimento(a.data_nascimento ? a.data_nascimento.split("T")[0] : "");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        nome,
        matricula,
        turma_id: turmaId || null,
        // Envia a string limpa YYYY-MM-DD para evitar conversão de fuso
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
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const { error: err } = await supabase
        .from("alunos")
        .delete()
        .eq("id", deleteTarget.id);
      if (err) throw err;
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = alunos.filter((a) => {
    const matchSearch =
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.matricula.toLowerCase().includes(search.toLowerCase());
    const matchTurma = !turmaFilter || a.turma_id === turmaFilter;
    return matchSearch && matchTurma;
  });

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Alunos"
        description="Cadastre, edite e remova alunos"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Novo aluno
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="sm:w-64"
              />
              <select
                value={turmaFilter}
                onChange={(e) => setTurmaFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-700 bg-slate-800/60 px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              >
                <option value="">Todas as turmas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <span className="text-sm text-slate-500">
              {filtered.length} aluno{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "nome", header: "Nome", render: (a) => <span className="font-medium text-white">{a.nome}</span> },
                { key: "matricula", header: "Matrícula", render: (a) => <span className="font-mono text-xs text-slate-400">{a.matricula}</span> },
                {
                  key: "data_nascimento",
                  header: "Nascimento",
                  render: (a) => <span className="text-xs text-slate-400">{formatDataNascimento(a.data_nascimento)}</span>,
                },
                {
                  key: "turma",
                  header: "Turma",
                  render: (a) =>
                    a.turma ? (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{a.turma.nome}</span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (a) => (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-sky-300 transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors"
                        aria-label="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(a) => a.id}
              emptyMessage="Nenhum aluno cadastrado. Clique em 'Novo aluno'."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar aluno" : "Novo aluno"}
        description={editing ? "Atualize os dados do aluno." : "Preencha os dados do novo aluno."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave as unknown as () => void} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
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
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir aluno"
        description="Esta ação não pode ser desfeita."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
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
    </AppLayout>
  );
}