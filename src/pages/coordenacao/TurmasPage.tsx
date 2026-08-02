import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, GraduationCap, Loader2, Users, BookOpen, Filter, UserCheck, Shield } from "lucide-react";
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
  { to: "/coordenacao", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/coordenacao/professores", label: "Professores", icon: <UserCheck size={18} /> },
  { to: "/coordenacao/disciplinas", label: "Disciplinas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/turmas", label: "Turmas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/associacoes", label: "Atribuir Disciplinas", icon: <Users size={18} /> },
  { to: "/coordenacao/horarios", label: "Horários", icon: <GraduationCap size={18} /> },
  { to: "/coordenacao/avisos", label: "Avisos", icon: <Users size={18} /> },
  { to: "/coordenacao/usuarios", label: "Usuários", icon: <Shield size={18} /> },
];

const CURSOS = [
  "Agropecuária",
  "Nutrição",
  "Segurança do Trabalho",
  "Edificações",
  "Informática"
];

const ANOS_SERIES = ["1º Ano", "2º Ano", "3º Ano", "4º Ano"];

type TurmaComTotal = Turma & {
  aluno_count?: number;
  professor_count?: number;
  curso?: string;
  ano?: string;
};

export function CoordenacaoTurmasPage() {
  const [turmas, setTurmas] = useState<TurmaComTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Filtros
  const [selectedCurso, setSelectedCurso] = useState<string>("TODOS");
  const [selectedAno, setSelectedAno] = useState<string>("TODOS");

  // Modal de Formulário
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);

  // Estados do Formulário de Turma
  const [nomeTurma, setNomeTurma] = useState("");
  const [curso, setCurso] = useState(CURSOS[0]);
  const [anoSerie, setAnoSerie] = useState(ANOS_SERIES[0]);
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear().toString());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal de Exclusão
  const [deleteTarget, setDeleteTarget] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadTurmas() {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("turmas")
        .select("*")
        .order("nome", { ascending: true });

      if (err) throw err;

      setTurmas(data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTurmas();
  }, []);

  function openCreateModal() {
    setEditing(null);
    setNomeTurma("");
    setCurso(CURSOS[0]);
    setAnoSerie(ANOS_SERIES[0]);
    setAnoLetivo(new Date().getFullYear().toString());
    setError("");
    setModalOpen(true);
  }

  function openEditModal(t: TurmaComTotal) {
    setEditing(t);
    setNomeTurma(t.nome);
    if (t.curso) setCurso(t.curso);
    if (t.ano) setAnoSerie(t.ano);
    setAnoLetivo(t.ano_letivo.toString());
    setError("");
    setModalOpen(true);
  }

  async function handleSaveTurma(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        nome: nomeTurma,
        curso: curso,
        ano: anoSerie,
        ano_letivo: parseInt(anoLetivo, 10),
      };

      if (editing) {
        const { error: err } = await supabase
          .from("turmas")
          .update(payload)
          .eq("id", editing.id);

        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("turmas")
          .insert(payload);

        if (err) throw err;
      }

      setModalOpen(false);
      await loadTurmas();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTurma() {
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
      await loadTurmas();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  // Filtragem local de turmas
  const filteredTurmas = useMemo(() => {
    return turmas.filter((t) => {
      const matchesText = t.nome.toLowerCase().includes(search.toLowerCase());
      const matchesCurso = selectedCurso === "TODOS" || t.curso === selectedCurso;
      const matchesAno = selectedAno === "TODOS" || t.ano === selectedAno;

      return matchesText && matchesCurso && matchesAno;
    });
  }, [turmas, search, selectedCurso, selectedAno]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Gestão de Turmas"
        description="Cadastre e organize as turmas da instituição por curso e ano."
        action={
          <Button onClick={openCreateModal}>
            <Plus size={16} />
            Nova Turma
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          {/* Filtros */}
          <div className="mb-6 space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Filter size={14} className="text-sky-400" />
              <span>Filtrar Turmas</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome da turma..."
              />

              <select
                value={selectedCurso}
                onChange={(e) => setSelectedCurso(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">Todos os Cursos</option>
                {CURSOS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={selectedAno}
                onChange={(e) => setSelectedAno(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
              >
                <option value="TODOS">Todos os Anos/Séries</option>
                {ANOS_SERIES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
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
                  header: "Nome da Turma",
                  render: (t) => <span className="font-semibold text-white">{t.nome}</span>,
                },
                {
                  key: "curso",
                  header: "Curso",
                  render: (t) => (
                    <span className="rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400 border border-sky-500/20">
                      {t.curso || "Não definido"}
                    </span>
                  ),
                },
                {
                  key: "ano",
                  header: "Série / Ano",
                  render: (t) => (
                    <span className="text-xs text-slate-300">
                      {t.ano || "-"}
                    </span>
                  ),
                },
                {
                  key: "ano_letivo",
                  header: "Ano Letivo",
                  render: (t) => <span className="text-xs text-slate-400">{t.ano_letivo}</span>,
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (t) => (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(t)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-sky-300 transition-colors"
                        title="Editar turma"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors"
                        title="Excluir turma"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={filteredTurmas}
              rowKey={(t) => t.id}
              emptyMessage="Nenhuma turma cadastrada ou encontrada para esses filtros."
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Criar / Editar Turma */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Turma" : "Cadastrar Nova Turma"}
        description="Defina a turma, selecione o curso e a série correspondente."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveTurma} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar Turma"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTurma} className="space-y-4">
          <Input
            label="Nome da Turma"
            required
            value={nomeTurma}
            onChange={(e) => setNomeTurma(e.target.value)}
            placeholder="Ex.: INFO-1A, AGRO-2B"
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Curso</label>
            <select
              value={curso}
              onChange={(e) => setCurso(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {CURSOS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Série / Ano</label>
              <select
                value={anoSerie}
                onChange={(e) => setAnoSerie(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                {ANOS_SERIES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <Input
              label="Ano Letivo"
              type="number"
              required
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(e.target.value)}
              placeholder="2026"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Turma"
        description="Tem certeza que deseja remover esta turma?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteTurma} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : "Excluir Turma"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Você está prestes a excluir a turma <strong className="text-white">{deleteTarget?.nome}</strong>. Os vínculos de alunos e notas nesta turma também serão afetados.
        </p>
      </Modal>
    </AppLayout>
  );
}