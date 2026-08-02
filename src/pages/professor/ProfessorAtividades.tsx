import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import type { Turma, Disciplina } from "../../lib/supabase";
import { createAtividade, getAtividadesByTurma } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Input";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";
import { useToast } from "../../components/ui/Toast";
import { GraduationCap, School, ClipboardList, BookOpen, Plus, Loader2, Upload, Pencil, Trash2 } from "lucide-react";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/professor/turmas", label: "Minhas turmas", icon: <School size={18} /> },
  { to: "/professor/notas", label: "Notas", icon: <ClipboardList size={18} /> },
  { to: "/professor/boletim", label: "Boletins", icon: <GraduationCap size={18} /> },
  { to: "/professor/atividades", label: "Atividades", icon: <BookOpen size={18} /> },
];

interface VínculoTurmaDisciplina {
  turma_id: string;
  disciplina_id: string;
  turmas?: Turma | Turma[];
  disciplinas?: Disciplina | Disciplina[];
}

export function ProfessorAtividades() {
  const { professor } = useAuth();
  const { addToast } = useToast();
  const [vinculos, setVinculos] = useState<VínculoTurmaDisciplina[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"atividade" | "simulado">("atividade");
  const [prazo, setPrazo] = useState("");
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const professorId = professor?.id;
    if (!professorId) return;

    async function loadVinculos() {
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from("professor_turma_disciplina")
          .select("turma_id, disciplina_id, turmas (id, nome, ano_letivo), disciplinas (id, nome)")
          .eq("professor_id", professorId);

        if (err) throw err;
        const vinculosData = (data as VínculoTurmaDisciplina[]) ?? [];
        setVinculos(vinculosData);
        const firstTurma = vinculosData[0]?.turma_id;
        setTurmaId(firstTurma ?? "");
      } catch (err) {
        console.error("Erro ao carregar vínculos de atividades:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadVinculos();
  }, [professor?.id]);

  useEffect(() => {
    if (!turmaId) {
      setAtividades([]);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const listaAtividades = await getAtividadesByTurma(turmaId);
        setAtividades(listaAtividades);
      } catch (err) {
        console.error("Erro ao carregar atividades da turma:", err);
        setAtividades([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [turmaId]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      
      if (lines.length > 0) {
        if (lines[0].length < 80) {
          setTitulo(lines[0]);
          setDescricao(lines.slice(1).join("\n"));
        } else {
          setTitulo(file.name.replace(/\.[^/.]+$/, ""));
          setDescricao(text);
        }
      }
    } catch (err) {
      console.error("Erro ao ler arquivo:", err);
      setError("Não foi possível ler o arquivo enviado.");
    }
    e.target.value = "";
  }

  const disciplinasDaTurma = useMemo(() => {
    return vinculos
      .filter((v) => v.turma_id === turmaId)
      .flatMap((v) => {
        const disciplinasValue = v.disciplinas;
        return Array.isArray(disciplinasValue) ? disciplinasValue : disciplinasValue ? [disciplinasValue] : [];
      })
      .filter(Boolean) as Disciplina[];
  }, [turmaId, vinculos]);

  const turmaOptions = useMemo(() => {
    const map = new Map<string, Turma>();
    vinculos.forEach((v) => {
      const turmasValue = v.turmas;
      const turmasArray = Array.isArray(turmasValue) ? turmasValue : turmasValue ? [turmasValue] : [];
      turmasArray.forEach((turma) => {
        if (turma && !map.has(turma.id)) {
          map.set(turma.id, turma);
        }
      });
    });
    return Array.from(map.values());
  }, [vinculos]);

  async function handleCreateAtividade(e: React.FormEvent) {
    e.preventDefault();
    if (!professor?.id || !turmaId || !titulo.trim()) {
      setError("Selecione a turma e informe um título para a atividade.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("atividades")
          .update({
            titulo: titulo.trim(),
            descricao: descricao.trim(),
            tipo,
            prazo: prazo || null,
            disciplina_id: disciplinaId || null,
          })
          .eq("id", editingId);
        if (updateError) throw updateError;
        addToast({ title: "Atividade atualizada", description: "Os detalhes da atividade foram salvos.", tone: "success" });
      } else {
        await createAtividade({
          turmaId,
          professorId: professor.id,
          disciplinaId: disciplinaId || null,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          tipo,
          prazo: prazo || null,
        });
        addToast({ title: "Atividade publicada", description: "A tarefa já está disponível para a turma.", tone: "success" });
      }
      setTitulo("");
      setDescricao("");
      setPrazo("");
      setDisciplinaId("");
      setTipo("atividade");
      setEditingId(null);
      setAtividades(await getAtividadesByTurma(turmaId));
    } catch (err) {
      setError((err as Error).message);
      addToast({ title: "Falha ao salvar atividade", description: (err as Error).message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setTitulo(item.titulo || "");
    setDescricao(item.descricao || "");
    setTipo(item.tipo || "atividade");
    setPrazo(item.prazo ? item.prazo.split("T")[0] : "");
    setDisciplinaId(item.disciplina_id || "");
  }

  async function handleDeleteAtividade(id: string) {
    try {
      const { error } = await supabase.from("atividades").delete().eq("id", id);
      if (error) throw error;
      setAtividades((prev) => prev.filter((item) => item.id !== id));
      addToast({ title: "Atividade removida", description: "A atividade foi excluída da turma.", tone: "info" });
    } catch (err) {
      setError((err as Error).message);
      addToast({ title: "Falha ao excluir atividade", description: (err as Error).message, tone: "error" });
    }
  }

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Professor">
      <PageHeader
        title="Atividades e Simulados"
        description="Cadastre tarefas e simulados para sua turma, com prazos e descrição detalhada."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Criar nova atividade</CardTitle>
            
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:border-slate-600">
              <Upload size={14} />
              Importar arquivo
              <input type="file" accept=".txt,.md,.doc,.docx" onChange={handleFileUpload} className="hidden" />
            </label>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAtividade} className="space-y-4">
              {editingId && <p className="text-sm text-amber-300">Editando atividade publicada.</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required>
                  <option value="">Escolha a turma</option>
                  {turmaOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </Select>
                <Select
                  label="Disciplina"
                  value={disciplinaId}
                  onChange={(e) => setDisciplinaId(e.target.value)}
                >
                  <option value="">Sem disciplina / Geral</option>
                  {disciplinasDaTurma.map((d) => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </Select>
              </div>

              <Input
                label="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Estudo de caso, Revisão de Conteúdo"
                required
              />

              <label className="block">
                <span className="block mb-1.5 text-sm font-medium text-slate-300">Tipo</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipo("atividade")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      tipo === "atividade"
                        ? "border-sky-500 bg-sky-500/10 text-sky-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    Atividade
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("simulado")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      tipo === "simulado"
                        ? "border-amber-500 bg-amber-500/10 text-amber-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    Simulado
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="block mb-1.5 text-sm font-medium text-slate-300">Descrição</span>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full min-h-[120px] rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-3 text-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-400/60"
                  placeholder="Detalhe os tópicos, o conteúdo e instruções para a turma."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Prazo"
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                />
                <div className="pt-5">
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : editingId ? <><Pencil size={14} /> Salvar</> : <><Plus size={14} /> Publicar</>}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades da turma</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">Carregando atividades...</p>
            ) : atividades.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma atividade cadastrada para a turma selecionada.</p>
            ) : (
              <div className="space-y-4">
                {atividades.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.titulo}</p>
                        <p className="text-xs text-slate-400">{item.disciplina?.nome || "Sem disciplina"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tipo === "simulado" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}>
                        {item.tipo === "simulado" ? "Simulado" : "Atividade"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">{item.descricao || "Sem descrição adicional."}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Prazo: {item.prazo ? item.prazo.split("T")[0] : "Indefinido"}</span>
                      <span>Prof.: {item.professor?.nome || "Você"}</span>
                      <span>Turma: {item.turma?.nome || "-"}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                        <Pencil size={14} /> Editar
                      </button>
                      <button type="button" onClick={() => void handleDeleteAtividade(item.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                        <Trash2 size={14} /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}