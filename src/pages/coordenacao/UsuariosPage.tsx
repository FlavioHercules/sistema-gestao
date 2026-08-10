import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Mail,
  Shield,
  KeyRound,
  GraduationCap,
  BookOpen,
  UserCheck,
  CalendarDays,
  Bell,
  Link2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { createUser } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import {
  PageHeader,
  ErrorBanner,
} from "../../components/ui/Misc";

const navItems = [
  {
    to: "/coordenacao",
    label: "Dashboard",
    icon: Users,
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
    icon: GraduationCap,
  },
  {
    to: "/coordenacao/associacoes",
    label: "Atribuir Disciplinas",
    icon: Link2,
  },
  {
    to: "/coordenacao/horarios",
    label: "Horários",
    icon: CalendarDays,
  },
  {
    to: "/coordenacao/avisos",
    label: "Avisos",
    icon: Bell,
  },
  {
    to: "/coordenacao/usuarios",
    label: "Usuários",
    icon: Users,
  },
];

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo_usuario:
    | "secretaria"
    | "coordenacao"
    | "professor"
    | "admin";
  created_at?: string;
};

export function UsuariosPage() {
  const { session } = useAuth();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal de criação
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [tipoUsuario, setTipoUsuario] = useState<
    "secretaria" | "coordenacao" | "professor"
  >("secretaria");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Exclusão
  const [deleteTarget, setDeleteTarget] =
    useState<Usuario | null>(null);

  const [deleting, setDeleting] = useState(false);

  /**
   * Carrega os usuários da tabela usuarios.
   */
  async function loadUsuarios() {
    setLoading(true);

    try {
      const { data, error: err } = await supabase
        .from("usuarios")
        .select("*")
        .order("nome", {
          ascending: true,
        });

      if (err) {
        throw err;
      }

      setUsuarios(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar usuários."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsuarios();
  }, []);

  /**
   * Abre o modal de criação.
   */
  function openCreateModal() {
    setNome("");
    setEmail("");
    setSenha("");
    setTipoUsuario("secretaria");
    setError("");
    setModalOpen(true);
  }

  /**
   * Cria um usuário.
   */
  async function handleSaveUsuario(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (saving) return;

    if (!nome || !email || !senha) {
      setError(
        "Preencha todos os campos obrigatórios."
      );
      return;
    }

    if (senha.length < 6) {
      setError(
        "A senha deve possuir pelo menos 6 caracteres."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createUser(
        {
          nome,
          email,
          senha,
          tipo_usuario: tipoUsuario,
        },
        session?.access_token ?? ""
      );

      setModalOpen(false);

      setNome("");
      setEmail("");
      setSenha("");
      setTipoUsuario("secretaria");

      await loadUsuarios();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao criar usuário."
      );
    } finally {
      setSaving(false);
    }
  }

  /**
   * Exclui um usuário.
   */
  async function handleDeleteUsuario() {
    if (!deleteTarget) return;

    if (deleting) return;

    setDeleting(true);
    setError("");

    try {
      const token =
        session?.access_token ?? "";

      if (!token) {
        throw new Error(
          "Sessão expirada. Faça login novamente."
        );
      }

      const response = await fetch(
        `https://xjtipfdevnwhioclwlsg.supabase.co/functions/v1/manage-users?id=${encodeURIComponent(
          deleteTarget.id
        )}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let responseData: {
        error?: string;
        message?: string;
      } = {};

      try {
        responseData =
          await response.json();
      } catch {
        responseData = {};
      }

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            responseData.message ||
            "Erro ao excluir o usuário de acesso."
        );
      }

      setDeleteTarget(null);

      await loadUsuarios();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao excluir usuário."
      );
    } finally {
      setDeleting(false);
    }
  }

  /**
   * Filtro de pesquisa.
   */
  const filteredUsuarios =
    usuarios.filter((u) => {
      const searchTerm =
        search.toLowerCase();

      return (
        u.nome
          .toLowerCase()
          .includes(searchTerm) ||
        u.email
          .toLowerCase()
          .includes(searchTerm) ||
        u.tipo_usuario
          .toLowerCase()
          .includes(searchTerm)
      );
    });

  /**
   * Cor do badge de perfil.
   */
  function getBadgeColor(tipo: string) {
    switch (tipo) {
      case "coordenacao":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";

      case "secretaria":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";

      case "professor":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  }

  /**
   * Nome amigável do tipo de usuário.
   */
  function getTipoUsuarioLabel(
    tipo: Usuario["tipo_usuario"]
  ) {
    switch (tipo) {
      case "secretaria":
        return "Secretaria";

      case "coordenacao":
        return "Coordenação";

      case "professor":
        return "Professor";

      case "admin":
        return "Administrador";

      default:
        return tipo;
    }
  }

  return (
    <AppLayout
      navItems={navItems}
      brandLabel="EduGrade"
      brandSub="Coordenação"
    >
      <PageHeader
        title="Gestão de Usuários do Sistema"
        description="Cadastre e gerencie os acessos de Secretários, Coordenadores e Professores."
        action={
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            Novo Usuário
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
          <div className="mb-4 max-w-md">
            <SearchInput
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Buscar por nome, e-mail ou perfil..."
            />
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
                  header: "Nome",
                  render: (u) => (
                    <span className="font-semibold text-white">
                      {u.nome}
                    </span>
                  ),
                },

                {
                  key: "email",
                  header: "E-mail de Acesso",
                  render: (u) => (
                    <span className="text-xs text-slate-400">
                      {u.email}
                    </span>
                  ),
                },

                {
                  key: "tipo_usuario",
                  header: "Perfil de Acesso",
                  render: (u) => (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${getBadgeColor(
                        u.tipo_usuario
                      )}`}
                    >
                      <Shield size={12} />

                      {getTipoUsuarioLabel(
                        u.tipo_usuario
                      )}
                    </span>
                  ),
                },

                {
                  key: "actions",
                  header: "",
                  className: "text-right",

                  render: (u) => (
                    <button
                      onClick={() =>
                        setDeleteTarget(u)
                      }
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-rose-300"
                      title="Revogar Acesso"
                    >
                      <Trash2 size={15} />
                    </button>
                  ),
                },
              ]}
              data={filteredUsuarios}
              rowKey={(u) => u.id}
              emptyMessage="Nenhum usuário cadastrado."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Usuário */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
          }
        }}
        title="Cadastrar Novo Usuário"
        description="Defina os dados e o nível de acesso no sistema."
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
              onClick={() =>
                document
                  .getElementById(
                    "create-user-form"
                  )
                  ?.requestSubmit()
              }
              disabled={saving}
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Criar Usuário"
              )}
            </Button>
          </>
        }
      >
        <form
          id="create-user-form"
          onSubmit={handleSaveUsuario}
          className="space-y-4"
        >
          <Input
            label="Nome Completo"
            required
            value={nome}
            onChange={(e) =>
              setNome(e.target.value)
            }
            placeholder="Ex.: Maria Souza"
          />

          <Input
            label="E-mail de Acesso"
            type="email"
            required
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="maria.souza@escola.com"
            icon={<Mail size={16} />}
          />

          <Input
            label="Senha Inicial"
            type="password"
            required
            minLength={6}
            value={senha}
            onChange={(e) =>
              setSenha(e.target.value)
            }
            placeholder="Mínimo de 6 caracteres"
            icon={<KeyRound size={16} />}
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Perfil / Nível de Permissão
            </label>

            <select
              value={tipoUsuario}
              onChange={(e) =>
                setTipoUsuario(
                  e.target.value as
                    | "secretaria"
                    | "coordenacao"
                    | "professor"
                )
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="secretaria">
                Secretaria (Acesso total administrativo)
              </option>

              <option value="coordenacao">
                Coordenação (Gestão de turmas e professores)
              </option>

              <option value="professor">
                Professor (Lançamento de notas/frequência)
              </option>
            </select>
          </div>
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
        title="Revogar Acesso"
        description="Tem certeza que deseja revogar o acesso deste usuário?"
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
              onClick={handleDeleteUsuario}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                "Revogar Acesso"
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          O usuário{" "}
          <strong className="text-white">
            {deleteTarget?.nome}
          </strong>{" "}
          deixará de ter acesso ao painel de{" "}
          <strong className="text-white">
            {getTipoUsuarioLabel(
              deleteTarget?.tipo_usuario ?? "secretaria"
            )}
          </strong>{" "}
          e seus registros vinculados serão removidos.
        </p>
      </Modal>
    </AppLayout>
  );
}