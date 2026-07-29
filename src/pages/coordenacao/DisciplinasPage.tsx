import { useEffect, useState, useMemo } from "react";
import { Plus, GraduationCap, Loader2, BookOpen, UserCheck, Users, Shield, PlusCircle } from "lucide-react";
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
  { to: "/coordenacao", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/coordenacao/professores", label: "Professores", icon: <UserCheck size={18} /> },
  { to: "/coordenacao/disciplinas", label: "Disciplinas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/turmas", label: "Turmas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/associacoes", label: "Atribuir Disciplinas", icon: <Users size={18} /> },
  { to: "/coordenacao/usuarios", label: "Usuários", icon: <Shield size={18} /> },
];

type Disciplina = {
  id: string;
  nome: string;
  carga_horaria?: number;
  curso?: string;
};

type Turma = {
  id: string;
  nome: string;
  curso: string;
  ano: string;
};

export function CoordenacaoDisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modais
  const [modalDisciplinaOpen, setModalDisciplinaOpen] = useState(false);
  const [modalAtribuirOpen, setModalAtribuirOpen] = useState(false);

  // Form Disciplina
  const [nome, setNome] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [curso, setCurso] = useState("");

  // Form Atribuição
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [discRes, turmasRes] = await Promise.all([
        supabase.from("disciplinas").select("*").order("nome"),
        supabase.from("turmas").select("*").order("nome"),
      ]);

      if (discRes.error) throw discRes.error;
      if (turmasRes.error) throw turmasRes.error;

      setDisciplinas(discRes.data || []);
      setTurmas(turmasRes.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Extrai uma lista de cursos únicos cadastrados nas turmas para o autocompletar
  const cursosCadastrados = useMemo(() => {
    const lista = turmas.map((t) => t.curso).filter(Boolean);
    return Array.from(new Set(lista));
  }, [turmas]);

  // Filtra as turmas do modal de vinculação com base no curso da disciplina selecionada
  const turmasFiltradasPorCurso = useMemo(() => {
    if (!selectedDisciplina || !selectedDisciplina.curso) return turmas;
    
    const cursoDisc = selectedDisciplina.curso.trim().toLowerCase();
    return turmas.filter((t) => t.curso && t.curso.trim().toLowerCase() === cursoDisc);
  }, [turmas, selectedDisciplina]);

  // Salvar Nova Disciplina
  async function handleSaveDisciplina(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { error: err } = await supabase.from("disciplinas").insert({
        nome,
        carga_horaria: cargaHoraria ? Number(cargaHoraria) : null,
        curso: curso ? curso.trim() : null,
      });

      if (err) throw err;

      setModalDisciplinaOpen(false);
      setNome("");
      setCargaHoraria("");
      setCurso("");
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Vincular Disciplina a uma Turma
  async function handleAtribuirTurma(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDisciplina || !selectedTurmaId || saving) return;

    setSaving(true);
    setError("");

    try {
      const { error: err } = await supabase.from("turma_disciplinas").insert({
        disciplina_id: selectedDisciplina.id,
        turma_id: selectedTurmaId,
      });

      if (err) throw err;

      setModalAtribuirOpen(false);
      setSelectedDisciplina(null);
      setSelectedTurmaId("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    return disciplinas.filter((d) =>
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      (d.curso && d.curso.toLowerCase().includes(search.toLowerCase()))
    );
  }, [disciplinas, search]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Gestão de Disciplinas"
        description="Cadastre as componentes curriculares e vincule às turmas."
        action={
          <Button onClick={() => setModalDisciplinaOpen(true)}>
            <Plus size={16} />
            Nova Disciplina
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por disciplina ou curso..."
              className="max-w-xs"
            />
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
                  header: "Nome da Disciplina",
                  render: (d) => <span className="font-semibold text-white">{d.nome}</span>,
                },
                {
                  key: "curso",
                  header: "Curso Vinculado",
                  render: (d) => (
                    <span className="text-xs text-slate-300">
                      {d.curso || "Geral / Base Comum"}
                    </span>
                  ),
                },
                {
                  key: "carga_horaria",
                  header: "Carga Horária",
                  render: (d) => (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {d.carga_horaria ? `${d.carga_horaria}h` : "N/I"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (d) => (
                    <Button
                      variant="ghost"
                      className="text-xs text-sky-400 hover:text-sky-300"
                      onClick={() => {
                        setSelectedDisciplina(d);
                        setSelectedTurmaId("");
                        setModalAtribuirOpen(true);
                      }}
                    >
                      <PlusCircle size={14} />
                      Vincular à Turma
                    </Button>
                  ),
                },
              ]}
              data={filtered}
              rowKey={(d) => d.id}
              emptyMessage="Nenhuma disciplina cadastrada."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Criar Disciplina */}
      <Modal
        open={modalDisciplinaOpen}
        onClose={() => setModalDisciplinaOpen(false)}
        title="Cadastrar Disciplina"
        description="Preencha as informações da disciplina."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalDisciplinaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveDisciplina} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar Disciplina"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveDisciplina} className="space-y-4">
          <Input
            label="Nome da Disciplina"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Programação Web, Algoritmos..."
          />
          
          <div className="space-y-1">
            <Input
              label="Curso (Opcional)"
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
              placeholder="Digite ou selecione um curso existente..."
              list="cursos-list"
            />
            <datalist id="cursos-list">
              {cursosCadastrados.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <Input
            label="Carga Horária (horas)"
            type="number"
            value={cargaHoraria}
            onChange={(e) => setCargaHoraria(e.target.value)}
            placeholder="Ex.: 80"
          />
        </form>
      </Modal>

      {/* Modal Atribuir a Turma */}
      <Modal
        open={modalAtribuirOpen}
        onClose={() => setModalAtribuirOpen(false)}
        title={`Vincular "${selectedDisciplina?.nome}" a uma Turma`}
        description={
          selectedDisciplina?.curso
            ? `Exibindo apenas turmas do curso "${selectedDisciplina.curso}".`
            : "Escolha qual turma receberá esta disciplina na grade."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalAtribuirOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAtribuirTurma} disabled={saving || !selectedTurmaId}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Vincular Turma"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAtribuirTurma} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Selecione a Turma</label>
            <select
              value={selectedTurmaId}
              onChange={(e) => setSelectedTurmaId(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              required
            >
              <option value="">Selecione uma turma...</option>
              {turmasFiltradasPorCurso.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} - {t.curso} ({t.ano})
                </option>
              ))}
            </select>
            {turmasFiltradasPorCurso.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                Nenhuma turma cadastrada para o curso "{selectedDisciplina?.curso}".
              </p>
            )}
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}