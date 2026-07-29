import { useEffect, useState } from "react";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  ShieldCheck 
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

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <Users size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <BookOpen size={18} /> },
];

type TurmaWithCounts = Turma & { aluno_count?: number; professor_count?: number };

export function ListaTurmas() {
  const [turmas, setTurmas] = useState<TurmaWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);
  const [nome, setNome] = useState("");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("turmas")
      .select("*")
      .order("nome", { ascending: true });
    const list = (data ?? []) as Turma[];

    const [{ data: alu }, { data: tp }] = await Promise.all([
      supabase.from("alunos").select("turma_id"),
      supabase.from("turma_professores").select("turma_id"),
    ]);

    const aluCount = new Map<string, number>();
    for (const r of alu ?? []) {
      if (r.turma_id) aluCount.set(r.turma_id, (aluCount.get(r.turma_id) ?? 0) + 1);
    }
    const profCount = new Map<string, number>();
    for (const r of tp ?? []) {
      profCount.set(r.turma_id, (profCount.get(r.turma_id) ?? 0) + 1);
    }

    setTurmas(
      list.map((t) => ({
        ...t,
        aluno_count: aluCount.get(t.id) ?? 0,
        professor_count: profCount.get(t.id) ?? 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setNome("");
    setAnoLetivo(new Date().getFullYear().toString());
    setError("");
    setModalOpen(true);
  }

  function openEdit(t: Turma) {
    setEditing(t);
    setNome(t.nome);
    setAnoLetivo(String(t.ano_letivo));
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { nome, ano_letivo: Number(anoLetivo) };
      if (editing) {
        const { error: err } = await supabase
          .from("turmas")
          .update(payload)
          .eq("id", editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("turmas").insert(payload);
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
        .from("turmas")
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

  const filtered = turmas.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    String(t.ano_letivo).includes(search)
  );

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Turmas"
        description="Crie e gerencie as turmas da escola"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nova turma
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar turma..."
                className="sm:max-w-xs"
              />
              <span className="text-sm text-slate-500">{filtered.length} turma(s)</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="animate-spin" />
              </div>
            ) : (
              <DataTable
                columns={[
                  { key: "nome", header: "Turma", render: (t) => <span className="font-medium text-white">{t.nome}</span> },
                  { key: "ano_letivo", header: "Ano letivo" },
                  {
                    key: "aluno_count",
                    header: "Alunos",
                    render: (t) => (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                        <Users size={12} /> {t.aluno_count ?? 0}
                      </span>
                    ),
                  },
                  {
                    key: "professor_count",
                    header: "Professores",
                    render: (t) => (
                      <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                        {t.professor_count ?? 0}
                      </span>
                    ),
                  },
                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (t) => (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(t)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-sky-300 transition-colors" aria-label="Editar">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(t)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors" aria-label="Excluir">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={filtered}
                rowKey={(t) => t.id}
                emptyMessage="Nenhuma turma cadastrada."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-white mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Total de turmas</span>
                <span className="text-lg font-bold text-white">{turmas.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Ano letivo atual</span>
                <span className="text-lg font-bold text-white">{new Date().getFullYear()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Total de alunos</span>
                <span className="text-lg font-bold text-white">
                  {turmas.reduce((s, t) => s + (t.aluno_count ?? 0), 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar turma" : "Nova turma"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input label="Nome da turma" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: 9º Ano A" />
          <Input label="Ano letivo" type="number" required value={anoLetivo} onChange={(e) => setAnoLetivo(e.target.value)} />
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir turma"
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
          Deseja realmente excluir a turma <span className="font-semibold text-white">{deleteTarget?.nome}</span>?
        </p>
      </Modal>
    </AppLayout>
  );
}