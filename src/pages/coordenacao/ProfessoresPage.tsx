import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, GraduationCap, Loader2, Mail, KeyRound, BookOpen, Filter, UserCheck, Users, Shield } from "lucide-react";
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
 
    { to: "/coordenacao", label: "Dashboard", icon: <GraduationCap size={18} /> },
    { to: "/coordenacao/professores", label: "Professores", icon: <UserCheck size={18} /> },
    { to: "/coordenacao/disciplinas", label: "Disciplinas", icon: <BookOpen size={18} /> },

    { to: "/coordenacao/turmas", label: "Turmas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/associacoes", label: "Atribuir Disciplinas", icon: <Users size={18} /> },
  { to: "/coordenacao/usuarios", label: "Usuários", icon: <Shield size={18} /> },
];

type ProfessorWithTurmas = Professor & {
  disciplina_principal?: string;
  email?: string;
  turma_count?: number;
  cursos?: string[];
  anos?: string[];
};

const DISCIPLINAS_POR_CURSO: Record<string, string[]> = {
  "Informatica": ["Programacao Web", "Banco de Dados", "Redes de Computadores", "Algoritmos", "Hardware"],
  "Administracao": ["Contabilidade", "Gestao de Pessoas", "Marketing", "Economia", "Logistica"],
  "Enfermagem": ["Anatomia", "Farmacologia", "Primeiros Socorros", "Enfermagem Cirurgica", "Saude Publica"],
  "Geral / Base Comum": ["Matematica", "Portugues", "Historia", "Geografia", "Fisica", "Quimica", "Biologia", "Ingles"]
};

export function CoordenacaoProfessoresPage() {
  const { session } = useAuth();
  const [professores, setProfessores] = useState<ProfessorWithTurmas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filtros
  const [selectedCurso, setSelectedCurso] = useState<string>("TODOS");
  const [selectedAno, setSelectedAno] = useState<string>("TODOS");
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>("TODAS");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProfessorWithTurmas | null>(null);
  
  // Campos do formulário
  const [nome, setNome] = useState("");
  const [disciplinaPrincipal, setDisciplinaPrincipal] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data: profsData, error: profsErr } = await supabase
        .from("professores")
        .select("*")
        .order("nome", { ascending: true });

      if (profsErr) throw profsErr;

      const list = (profsData ?? []) as ProfessorWithTurmas[];

      const { data: tp } = await supabase
        .from("turma_professores")
        .select("professor_id, turmas(curso, ano)");

      const counts = new Map<string, number>();
      const cursosMap = new Map<string, Set<string>>();
      const anosMap = new Map<string, Set<string>>();

      for (const row of tp ?? []) {
        const profId = row.professor_id;
        counts.set(profId, (counts.get(profId) ?? 0) + 1);

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

  const cursosDisponiveis = useMemo(() => {
    const list = new Set<string>();
    Object.keys(DISCIPLINAS_POR_CURSO).forEach((c) => list.add(c));
    professores.forEach((p) => p.cursos?.forEach((c) => list.add(c)));
    return Array.from(list).sort();
  }, [professores]);

  const anosDisponiveis = useMemo(() => {
    const list = new Set<string>(["1º Ano", "2º Ano", "3º Ano", "4º Ano"]);
    professores.forEach((p) => p.anos?.forEach((a) => list.add(a)));
    return Array.from(list).sort();
  }, [professores]);

  const disciplinasDisponiveis = useMemo(() => {
    if (selectedCurso !== "TODOS" && DISCIPLINAS_POR_CURSO[selectedCurso]) {
      return DISCIPLINAS_POR_CURSO[selectedCurso].sort();
    }
    const list = Array.from(
      new Set(
        professores
          .map((p) => (p.disciplina_principal || "").trim())
          .filter(Boolean)
      )
    );
    return list.sort();
  }, [professores, selectedCurso]);

  function handleCursoChange(curso: string) {
    setSelectedCurso(curso);
    setSelectedDisciplina("TODAS");
  }

  function openCreate() {
    setEditing(null);
    setNome("");
    setDisciplinaPrincipal("");
    setEmail("");
    setSenha("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(p: ProfessorWithTurmas) {
    setEditing(p);
    setNome(p.nome);
    setDisciplinaPrincipal(p.disciplina_principal || "");
    setEmail(p.email || "");
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
          .update({
            nome,
            email: email || null,
            disciplina_principal: disciplinaPrincipal,
          })
          .eq("id", editing.id);

        if (err) throw err;
      } else {
        const { data: profData, error: profErr } = await supabase
          .from("professores")
          .insert({
            nome,
            email: email || null,
            disciplina_principal: disciplinaPrincipal,
          })
          .select("id")
          .single();

        if (profErr) throw profErr;

        if (email && senha) {
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
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    return professores.filter((p) => {
      const matchesText =
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        (p.disciplina_principal && p.disciplina_principal.toLowerCase().includes(search.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(search.toLowerCase()));

      const matchesCurso =
        selectedCurso === "TODOS" || (p.cursos && p.cursos.includes(selectedCurso));

      const matchesAno =
        selectedAno === "TODOS" || (p.anos && p.anos.includes(selectedAno));

      const matchesDisciplina =
        selectedDisciplina === "TODAS" || p.disciplina_principal === selectedDisciplina;

      return matchesText && matchesCurso && matchesAno && matchesDisciplina;
    });
  }, [professores, search, selectedCurso, selectedAno, selectedDisciplina]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Gestão de Professores"
        description="Gerencie os docentes da instituição, turmas e disciplinas."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            Novo Professor
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Filter size={14} className="text-sky-400" />
              <span>Filtros de Busca</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail..."
                className="w-full"
              />

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
                  header: "Nome do Professor",
                  render: (p) => (
                    <div>
                      <p className="font-semibold text-white">{p.nome}</p>
                      {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                    </div>
                  ),
                },
                {
                  key: "disciplina",
                  header: "Disciplina Principal",
                  render: (p) => (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <BookOpen size={12} />
                      {p.disciplina_principal || "Não informada"}
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
                    </div>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(p) => p.id}
              emptyMessage="Nenhum professor encontrado."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Professor" : "Cadastrar Novo Professor"}
        description={
          editing
            ? "Atualize o nome, e-mail ou disciplina lecionada."
            : "Cadastre os dados pessoais e crie as credenciais de acesso."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar Professor"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome Completo"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Prof. Carlos Silva"
          />

          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="carlos.silva@escola.com"
            icon={<Mail size={16} />}
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Disciplina Principal</label>
            <input
              type="text"
              required
              value={disciplinaPrincipal}
              onChange={(e) => setDisciplinaPrincipal(e.target.value)}
              placeholder="Ex.: Programação Web, Matemática"
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {!editing && (
            <div className="pt-2 space-y-4 border-t border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Credenciais de Acesso (Opcional)
              </p>
              <Input
                label="Senha Inicial"
                type="password"
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Preencha caso queira liberar login"
                icon={<KeyRound size={16} />}
              />
            </div>
          )}
        </form>
      </Modal>
    </AppLayout>
  );
}