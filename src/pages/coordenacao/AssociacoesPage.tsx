import { useEffect, useState, useMemo } from "react";
import { GraduationCap, BookOpen, Users, Plus, Trash2, Loader2, UserCheck, Shield, Layers } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Professor, Turma, Disciplina } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Input";
import { DataTable } from "../../components/ui/DataTable";
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

interface AssociacaoItem {
  id: string;
  professor_id: string;
  turma_id: string;
  disciplina_id: string;
  professores?: { nome: string };
  turmas?: { nome: string; curso?: string };
  disciplinas?: { nome: string };
}

export function CoordenacaoAssociacoesPage() {
  const [associacoes, setAssociacoes] = useState<AssociacaoItem[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState("");
  const [selectedTurma, setSelectedTurma] = useState("");
  const [selectedDisciplina, setSelectedDisciplina] = useState("");

  // Modal Exclusão
  const [deleteTarget, setDeleteTarget] = useState<AssociacaoItem | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const { data: assocData, error: assocErr } = await supabase
        .from("professor_turma_disciplina")
        .select(`
          id,
          professor_id,
          turma_id,
          disciplina_id,
          professores (nome),
          turmas (nome, curso),
          disciplinas (nome)
        `);

      if (assocErr) throw assocErr;

      const [{ data: profs }, { data: turm }, { data: disc }] = await Promise.all([
        supabase.from("professores").select("*").order("nome"),
        supabase.from("turmas").select("*").order("nome"),
        supabase.from("disciplinas").select("*").order("nome"),
      ]);

      setAssociacoes((assocData as unknown as AssociacaoItem[]) ?? []);
      setProfessores(profs ?? []);
      setTurmas(turm ?? []);
      setDisciplinas(disc ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // --- FILTRAGEM DINÂMICA DE DISCIPLINAS POR CURSO ---
  const disciplinasFiltradas = useMemo(() => {
    if (!selectedTurma) return disciplinas;

    const turmaObjeto = turmas.find((t) => t.id === selectedTurma);
    const cursoTurma = turmaObjeto?.curso?.trim().toLowerCase();

    if (!cursoTurma) return disciplinas;

    return disciplinas.filter((d) => {
      if (!d.curso || d.curso.trim() === "") return true;
      return d.curso.trim().toLowerCase() === cursoTurma;
    });
  }, [selectedTurma, turmas, disciplinas]);

  function openCreateModal() {
    setSelectedProfessor("");
    setSelectedTurma(""); // Define como vazio para vir pré-selecionado "Escolha uma turma"
    setSelectedDisciplina("");
    setError("");
    setModalOpen(true);
  }

  function handleTurmaChange(turmaId: string) {
    setSelectedTurma(turmaId);
    setSelectedDisciplina("");
  }

  async function handleSaveAssociacao(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfessor || !selectedTurma || !selectedDisciplina) {
      setError("Selecione o professor, a turma e a disciplina.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("professor_turma_disciplina")
        .insert({
          professor_id: selectedProfessor,
          turma_id: selectedTurma,
          disciplina_id: selectedDisciplina,
        });

      if (err) throw err;

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAssociacao() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");

    try {
      const { error: err } = await supabase
        .from("professor_turma_disciplina")
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

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Atribuição de Disciplinas"
        description="Vincule professores às suas turmas e disciplinas correspondentes."
        action={
          <Button onClick={openCreateModal} disabled={loading}>
            <Plus size={16} />
            Nova Atribuição
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-sky-300">
                  <Layers size={16} />
                  <span className="text-sm font-semibold">Visão rápida dos vínculos</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Cada card representa um vínculo professor × turma × disciplina, facilitando a conferência e ajustes.</p>
              </div>
              <DataTable
              columns={[
                {
                  key: "professor",
                  header: "Professor",
                  render: (a) => (
                    <div>
                      <p className="font-semibold text-white">{a.professores?.nome || "N/A"}</p>
                    </div>
                  ),
                },
                {
                  key: "turma",
                  header: "Turma",
                  render: (a) => (
                    <div>
                      <span className="font-medium text-slate-200">{a.turmas?.nome || "N/A"}</span>
                      {a.turmas?.curso && (
                        <span className="ml-2 rounded bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400 border border-sky-500/20">
                          {a.turmas.curso}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "disciplina",
                  header: "Disciplina Atribuída",
                  render: (a) => (
                    <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      {a.disciplinas?.nome || "N/A"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "",
                  className: "text-right",
                  render: (a) => (
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition-colors"
                      title="Remover atribuição"
                    >
                      <Trash2 size={15} />
                    </button>
                  ),
                },
              ]}
              data={associacoes}
              rowKey={(a) => a.id}
              emptyMessage="Nenhuma atribuição de disciplina cadastrada até o momento."
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Atribuição */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Atribuir Disciplina a Professor"
        description="Escolha o professor, a turma e a disciplina que ele lecionará."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveAssociacao} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar Atribuição"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveAssociacao} className="space-y-4">
          <Select
            label="Professor"
            value={selectedProfessor}
            onChange={(e) => setSelectedProfessor(e.target.value)}
            required
          >
            <option value="">Selecione um professor</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>

          <Select
            label="Turma"
            value={selectedTurma}
            onChange={(e) => handleTurmaChange(e.target.value)}
            required
          >
            <option value="">Escolha uma turma</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} {t.curso ? `(${t.curso})` : ""}
              </option>
            ))}
          </Select>

          <Select
            label="Disciplina"
            value={selectedDisciplina}
            onChange={(e) => setSelectedDisciplina(e.target.value)}
            required
            disabled={!selectedTurma}
          >
            <option value="">
              {!selectedTurma
                ? "Escolha uma turma primeiro"
                : disciplinasFiltradas.length === 0
                ? "Nenhuma disciplina encontrada para este curso"
                : "Selecione a disciplina"}
            </option>
            {disciplinasFiltradas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome} {d.curso ? `[Curso: ${d.curso}]` : "[Geral]"}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover Atribuição"
        description="Deseja remover essa atribuição de disciplina?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteAssociacao} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : "Remover"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Você removerá o vínculo do professor{" "}
          <strong className="text-white">{deleteTarget?.professores?.nome}</strong> com a
          disciplina <strong className="text-white">{deleteTarget?.disciplinas?.nome}</strong> na
          turma <strong className="text-white">{deleteTarget?.turmas?.nome}</strong>.
        </p>
      </Modal>
    </AppLayout>
  );
}