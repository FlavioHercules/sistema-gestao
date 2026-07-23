import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, GraduationCap, Loader2, Mail, KeyRound, BookOpen, ShieldAlert, Filter } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Professor } from "../../lib/supabase";
import { createUser } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
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
  { to: "/secretaria/professores", label: "Professores", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/associacoes", label: "Associações", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/usuarios", label: "Usuários", icon: <GraduationCap size={18} /> },
];

type ProfessorWithTurmas = Professor & { 
  turma_count?: number;
  cursos?: string[];
  anos?: string[];
};

// Mapeamento opcional de referência de disciplinas por curso (para quando o professor não estiver vinculado a turmas ainda)
const DISCIPLINAS_POR_CURSO: Record<string, string[]> = {
  "Informatica": ["Programacao Web", "Banco de Dados", "Redes de Computadores", "Algoritmos", "Hardware"],
  "Administracao": ["Contabilidade", "Gestao de Pessoas", "Marketing", "Economia", "Logistica"],
  "Enfermagem": ["Anatomia", "Farmacologia", "Primeiros Socorros", "Enfermagem Cirurgica", "Saude Publica"],
  "Geral / Base Comum": ["Matematica", "Portugues", "Historia", "Geografia", "Fisica", "Quimica", "Biologia", "Ingles"]
};

export function ProfessoresPage() {
  const { session } = useAuth();
  const [professores, setProfessores] = useState<ProfessorWithTurmas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Estados dos Filtros
  const [selectedCurso, setSelectedCurso] = useState<string>("TODOS");
  const [selectedAno, setSelectedAno] = useState<string>("TODOS");
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>("TODAS");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [deleteTarget, setDeleteTarget] = useState<Professor | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data: profsData, error: profsErr } = await supabase
        .from("professores")
        .select("*")
        .order("nome", { ascending: true });

      if (profsErr) throw profsErr;

      const list = (profsData ?? []) as Professor[];

      // Busca vinculos com turmas para extrair Curso e Ano de atuação do professor
      const { data: tp } = await supabase
        .from("turma_professores")
        .select("professor_id, turmas(curso, ano)");

      const counts = new Map<string, number>();
      const cursosMap = new Map<string, Set<string>>();
      const anosMap = new Map<string, Set<string>>();

      for (const row of tp ?? []) {
        const profId = row.professor_id;
        counts.set(profId, (counts.get(profId) ?? 0) + 1);

        // Agrupa cursos e anos vinculados ao professor
        if (row.turmas) {
          const t = row.turmas as unknown as { curso?: string; ano?: string };
          if (t.curso) {
            if (!cursosMap.has(profId)) cursosMap.set(profId, new Set());
            cursosMap.get(profId)?.add(t.curso);
          }
          if (t.ano) {
            if (!anosMap.has(profId)) anosMap.set(profId, new Set());
            anosMap.get(profId)?.add(t.ano);
          }
        }
      }

      setProfessores(
        list.map((p) => ({
          ...p,
          turma_count: counts.get(p.id) ?? 0,
          cursos: Array.from(cursosMap.get(p.id) ?? []),
          anos: Array.from(anosMap.get(p.id) ?? []),
        }))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Listas Dinâmicas para os Selects

  // 1. Cursos únicos
  const cursosDisponiveis = useMemo(() => {
    const list = new Set<string>();
    // Adiciona cursos predefinidos ou vindos das turmas
    Object.keys(DISCIPLINAS_POR_CURSO).forEach((c) => list.add(c));
    professores.forEach((p) => p.cursos?.forEach((c) => list.add(c)));
    return Array.from(list).sort();
  }, [professores]);

  // 2. Anos / Séries únicos
  const anosDisponiveis = useMemo(() => {
    const list = new Set<string>(["1º Ano", "2º Ano", "3º Ano", "4º Ano"]);
    professores.forEach((p) => p.anos?.forEach((a) => list.add(a)));
    return Array.from(list).sort();
  }, [professores]);

  // 3. Disciplinas filtradas com base no Curso selecionado
  const disciplinasDisponiveis = useMemo(() => {
    if (selectedCurso !== "TODOS" && DISCIPLINAS_POR_CURSO[selectedCurso]) {
      return DISCIPLINAS_POR_CURSO[selectedCurso].sort();
    }

    // Se nenhum curso específico estiver selecionado, exibe todas as disciplinas cadastradas
    const list = Array.from(new Set(professores.map((p) => p.disciplina.trim()).filter(Boolean)));
    return list.sort();
  }, [professores, selectedCurso]);

  // Limpa a disciplina selecionada caso mude o curso e a disciplina não pertença mais a ele
  function handleCursoChange(curso: string) {
    setSelectedCurso(curso);
    setSelectedDisciplina("TODAS");
  }

  function openCreate() {
    setEditing(null);
    setNome("");
    setDisciplina("");
    setEmail("");
    setSenha("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: Professor) {
    setEditing(p);
    setNome(p.nome);
    setDisciplina(p.disciplina);
    setEmail("");
    setSenha("");
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      if (editing) {
        const { error: err } = await supabase
          .from("professores")
          .update({ nome, disciplina })
          .eq("id", editing.id);

        if (err) throw err;
      } else {
        if (!email || !senha) {
          throw new Error("Informe e-mail e senha para criar o acesso do professor.");
        }

        const { data: profData, error: profErr } = await supabase
          .from("professores")
          .insert({ nome, disciplina })
          .select("id")
          .single();

        if (profErr) throw profErr;

        try {
          await createUser(
            {
              nome,
              email,
              senha,
              tipo_usuario: "professor",
              professor_id: profData.id,
            },
            session?.access_token ?? ""
          );
        } catch (apiError: any) {
          const isDuplicate =
            apiError?.message?.includes("duplicate key") ||
            apiError?.message?.includes("already registered");

          if (!isDuplicate) {
            await supabase.from("professores").delete().eq("id", profData.id);
            throw apiError;
          }
        }
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
      const { data: usr } = await supabase
        .from("usuarios")
        .select("id")
        .eq("professor_id", deleteTarget.id)
        .maybeSingle();

      if (usr?.id) {
        const response = await fetch(
          `https://xjtipfdevnwhioclwlsg.supabase.co/functions/v1/manage-users?id=${usr.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
          }
        );

        if (!response.ok) {
          const resData = await response.json();
          throw new Error(resData.error || "Erro ao excluir o usuário de acesso.");
        }
      }

      const { error: err } = await supabase
        .from("professores")
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

  // Lógica de Filtragem Composta (Texto + Curso + Ano + Disciplina)
  const filtered = useMemo(() => {
    return professores.filter((p) => {
      const matchesText =
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.disciplina.toLowerCase().includes(search.toLowerCase());

      const matchesCurso =
        selectedCurso === "TODOS" || (p.cursos && p.cursos.includes(selectedCurso));

      const matchesAno =
        selectedAno === "TODOS" || (p.anos && p.anos.includes(selectedAno));

      const matchesDisciplina =
        selectedDisciplina === "TODAS" || p.disciplina === selectedDisciplina;

      return matchesText && matchesCurso && matchesAno && matchesDisciplina;
    });
  }, [professores, search, selectedCurso, selectedAno, selectedDisciplina]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Professores"
        description="Gerencie os professores por curso, ano e disciplina."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Novo professor
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          {/* Painel de Filtros Avançados */}
          <div className="mb-6 space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Filter size={14} className="text-sky-400" />
              <span>Filtros de Busca</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Pesquisa por Texto */}
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full"
              />

              {/* Seletor de Curso */}
              <select
                value={selectedCurso}
                onChange={(e) => handleCursoChange(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">Todos os Cursos</option>
                {cursosDisponiveis.map((curso) => (
                  <option key={curso} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>

              {/* Seletor de Ano / Série */}
              <select
                value={selectedAno}
                onChange={(e) => setSelectedAno(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">Todos os Anos</option>
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>

              {/* Seletor de Disciplina (Vinculado ao Curso) */}
              <select
                value={selectedDisciplina}
                onChange={(e) => setSelectedDisciplina(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODAS">
                  {selectedCurso !== "TODOS"
                    ? `Disciplinas de ${selectedCurso}`
                    : "Todas as Disciplinas"}
                </option>
                {disciplinasDisponiveis.map((disc) => (
                  <option key={disc} value={disc}>
                    {disc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                Exibindo <strong className="text-slate-300">{filtered.length}</strong> de{" "}
                {professores.length} professores
              </span>

              {(selectedCurso !== "TODOS" || selectedAno !== "TODOS" || selectedDisciplina !== "TODAS" || search) && (
                <button
                  onClick={() => {
                    setSelectedCurso("TODOS");
                    setSelectedAno("TODOS");
                    setSelectedDisciplina("TODAS");
                    setSearch("");
                  }}
                  className="text-xs font-medium text-sky-400 hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "nome",
                  header: "Nome",
                  render: (p) => (
                    <div>
                      <p className="font-medium text-white">{p.nome}</p>
                    </div>
                  ),
                },
                {
                  key: "disciplina",
                  header: "Disciplina",
                  render: (p) => (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400 border border-sky-500/20">
                      <BookOpen size={12} />
                      {p.disciplina}
                    </span>
                  ),
                },
                {
                  key: "turma_count",
                  header: "Turmas Atribuídas",
                  render: (p) => (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                      {p.turma_count ?? 0} turma{(p.turma_count ?? 0) !== 1 ? "s" : ""}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (p) => (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-sky-300 transition-colors"
                        title="Editar professor"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors"
                        title="Excluir professor"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(p) => p.id}
              emptyMessage="Nenhum professor encontrado para os filtros selecionados."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Criar / Editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar dados do professor" : "Novo professor"}
        description={
          editing
            ? "Atualize o nome ou a disciplina lecionada."
            : "Cadastre os dados pessoais e crie as credenciais de acesso."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Input
            label="Nome completo"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Carlos Eduardo Silva"
          />
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Disciplina principal</label>
            <input
              type="text"
              required
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              placeholder="Ex.: Programação Web"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {!editing && (
            <div className="pt-2 space-y-4 border-t border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Credenciais de Acesso
              </p>
              <Input
                label="E-mail de acesso"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professor@escola.com"
                icon={<Mail size={16} />}
              />
              <Input
                label="Senha inicial"
                type="password"
                required
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                icon={<KeyRound size={16} />}
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir cadastro"
        description="Esta ação removerá o professor e revogará os acessos."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : "Excluir permanentemente"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-xs">
            <ShieldAlert size={18} className="shrink-0" />
            <span>Atenção: Os lançamentos de notas associados a este professor podem ser afetados.</span>
          </div>
          <p className="text-sm text-slate-300">
            Deseja realmente excluir <strong className="text-white">{deleteTarget?.nome}</strong>?
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}