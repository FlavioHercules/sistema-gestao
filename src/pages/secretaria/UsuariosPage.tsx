import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Loader2, Shield, Mail, KeyRound } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Usuario, Professor, Aluno, TipoUsuario } from "../../lib/supabase";
import { createUser, updateUser, deleteUser } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
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
  { to: "/secretaria/professores", label: "Professores", icon: <Users size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <Users size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <Users size={18} /> },
  { to: "/secretaria/associacoes", label: "Associações", icon: <Users size={18} /> },
  { to: "/secretaria/usuarios", label: "Usuários", icon: <Users size={18} /> },
];

type UsuarioWithProfessor = Usuario & { professor?: Professor | null; aluno?: Aluno | null };

export function UsuariosPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const [usuarios, setUsuarios] = useState<UsuarioWithProfessor[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState<TipoUsuario>("professor");
  const [professorId, setProfessorId] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("usuarios")
      .select("*, professor: professores(*), aluno: alunos(*)")
      .order("nome", { ascending: true });
    setUsuarios((data ?? []) as UsuarioWithProfessor[]);

    const { data: profs } = await supabase
      .from("professores")
      .select("*")
      .order("nome", { ascending: true });
    const { data: alunosData } = await supabase
      .from("alunos")
      .select("*")
      .order("nome", { ascending: true });
    setProfessores((profs ?? []) as Professor[]);
    setAlunos((alunosData ?? []) as Aluno[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setNome("");
    setEmail("");
    setSenha("");
    setTipo("professor");
    setProfessorId("");
    setAlunoId("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditing(u);
    setNome(u.nome);
    setEmail(u.email);
    setSenha("");
    setTipo(u.tipo_usuario);
    setProfessorId(u.professor_id ?? "");
    setAlunoId((u as UsuarioWithProfessor).aluno?.id ?? "");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateUser(
          {
            id: editing.id,
            nome,
            senha: senha || undefined,
            professor_id: tipo === "professor" ? professorId || null : null,
            aluno_id: tipo === "aluno" ? alunoId || null : null,
          },
          token
        );
      } else {
        if (!senha) throw new Error("Informe uma senha para o novo usuário.");
        await createUser(
          {
            nome,
            email,
            senha,
            tipo_usuario: tipo,
            professor_id: tipo === "professor" ? professorId || null : null,
            aluno_id: tipo === "aluno" ? alunoId || null : null,
          },
          token
        );
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
      await deleteUser(deleteTarget.id, token);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Professores already linked to a user (to exclude from the dropdown when creating)
  const linkedProfessorIds = new Set(
    usuarios
      .filter((u) => u.professor_id && (!editing || u.id !== editing.id))
      .map((u) => u.professor_id as string)
  );

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Usuários"
        description="Gerencie contas de acesso ao sistema"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Novo usuário
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="sm:max-w-xs"
            />
            <span className="text-sm text-slate-500">{filtered.length} usuário(s)</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "nome", header: "Nome", render: (u) => <span className="font-medium text-white">{u.nome}</span> },
                { key: "email", header: "E-mail", render: (u) => <span className="text-slate-400">{u.email}</span> },
                {
                  key: "tipo_usuario",
                  header: "Tipo",
                  render: (u) => (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
                        u.tipo_usuario === "secretaria"
                          ? "bg-violet-500/15 text-violet-300"
                          : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      <Shield size={11} />
                      {u.tipo_usuario === "secretaria" ? "Secretaria" : u.tipo_usuario === "aluno" ? "Aluno" : "Professor"}
                    </span>
                  ),
                },
                {
                  key: "professor",
                  header: "Vínculo",
                  render: (u) =>
                    u.tipo_usuario === "aluno" ? (
                      u.aluno ? (
                        <span className="text-xs text-slate-300">{u.aluno.nome} — {u.aluno.matricula}</span>
                      ) : (
                        <span className="text-xs text-slate-500">Sem aluno vinculado</span>
                      )
                    ) : u.professor ? (
                      <span className="text-xs text-slate-300">{u.professor.nome} — {u.professor.disciplina}</span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (u) => (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-sky-300 transition-colors" aria-label="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors" aria-label="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(u) => u.id}
              emptyMessage="Nenhum usuário cadastrado."
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar usuário" : "Novo usuário"}
        description={editing ? "Atualize os dados de acesso." : "Crie uma conta de acesso ao sistema."}
        size="lg"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" icon={<Users size={16} />} />
            <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" icon={<Mail size={16} />} disabled={!!editing} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Tipo de usuário" value={tipo} onChange={(e) => setTipo(e.target.value as TipoUsuario)} disabled={!!editing}>
              <option value="professor">Professor</option>
              <option value="aluno">Aluno</option>
              <option value="secretaria">Secretaria</option>
            </Select>
            {tipo === "professor" ? (
              <Select label="Professor vinculado" value={professorId} onChange={(e) => setProfessorId(e.target.value)}>
                <option value="">Selecione um professor</option>
                {professores
                  .filter((p) => !linkedProfessorIds.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} — {p.disciplina}</option>
                  ))}
              </Select>
            ) : tipo === "aluno" ? (
              <Select label="Aluno vinculado" value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
                <option value="">Selecione um aluno</option>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome} — {a.matricula}</option>
                ))}
              </Select>
            ) : (
              <div className="flex items-end">
                <p className="text-xs text-slate-500">
                  Contas de secretaria têm acesso administrativo total.
                </p>
              </div>
            )}
          </div>
          <Input
            label={editing ? "Nova senha (deixe vazio para manter)" : "Senha"}
            type="password"
            required={!editing}
            minLength={6}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            icon={<KeyRound size={16} />}
          />
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir usuário"
        description="Esta ação removerá o acesso permanentemente."
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
          Excluir <span className="font-semibold text-white">{deleteTarget?.nome}</span>?
        </p>
      </Modal>
    </AppLayout>
  );
}
