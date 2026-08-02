import { useEffect, useMemo, useState } from "react";
import { BellRing, BookOpen, GraduationCap, Loader2, Plus, Send, Shield, Trash2, Users } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Input";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";
import { useToast } from "../../components/ui/Toast";
import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";

const navItems = [
  { to: "/coordenacao", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/coordenacao/professores", label: "Professores", icon: <Users size={18} /> },
  { to: "/coordenacao/disciplinas", label: "Disciplinas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/turmas", label: "Turmas", icon: <GraduationCap size={18} /> },
  { to: "/coordenacao/associacoes", label: "Atribuir Disciplinas", icon: <Users size={18} /> },
  { to: "/coordenacao/horarios", label: "Horários", icon: <BellRing size={18} /> },
  { to: "/coordenacao/avisos", label: "Avisos", icon: <BellRing size={18} /> },
  { to: "/coordenacao/usuarios", label: "Usuários", icon: <Shield size={18} /> },
];

interface AvisoItem {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: "geral" | "turma";
  turma_id?: string | null;
  created_at?: string;
  turmas?: { nome?: string | null } | null;
}

export function CoordenacaoAvisosPage() {
  const { addToast } = useToast();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<"geral" | "turma">("geral");
  const [turmaId, setTurmaId] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [{ data: turmasData }, { data: avisosData, error: avisosError }] = await Promise.all([
        supabase.from("turmas").select("id,nome,ano_letivo").order("nome"),
        supabase.from("avisos").select("id,titulo,conteudo,tipo,turma_id,created_at,turmas(nome)").order("created_at", { ascending: false }),
      ]);

      if (turmasData) setTurmas(turmasData as Turma[]);
      if (avisosError) {
        console.warn("Avisos não disponíveis ainda no schema atual:", avisosError.message);
        setAvisos([]);
      } else if (avisosData) {
        setAvisos(avisosData as AvisoItem[]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const avisosVisiveis = useMemo(() => avisos, [avisos]);

  async function handleCreateAviso(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) {
      setError("Informe título e conteúdo para publicar o aviso.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        tipo,
        turma_id: tipo === "turma" ? turmaId || null : null,
      };

      const { error: insertError } = await supabase.from("avisos").insert(payload);
      if (insertError) throw insertError;
      setTitulo("");
      setConteudo("");
      setTipo("geral");
      setTurmaId("");
      await loadData();
      addToast({ title: "Aviso publicado", description: "O comunicado já está disponível para os estudantes.", tone: "success" });
    } catch (err) {
      setError((err as Error).message);
      addToast({ title: "Falha ao publicar aviso", description: (err as Error).message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAviso(id: string) {
    try {
      const { error } = await supabase.from("avisos").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      addToast({ title: "Aviso removido", description: "O comunicado foi removido da lista.", tone: "info" });
    } catch (err) {
      setError((err as Error).message);
      addToast({ title: "Falha ao remover aviso", description: (err as Error).message, tone: "error" });
    }
  }

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Mural de Avisos"
        description="Publique comunicados gerais ou por turma para os estudantes e professores."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Publicar novo aviso</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAviso} className="space-y-4">
              <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Reunião de pais e mestres" required />
              <label className="block">
                <span className="block mb-1.5 text-sm font-medium text-slate-300">Tipo</span>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setTipo("geral")} className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${tipo === "geral" ? "border-sky-500 bg-sky-500/10 text-sky-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>
                    Geral
                  </button>
                  <button type="button" onClick={() => setTipo("turma")} className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${tipo === "turma" ? "border-emerald-500 bg-emerald-500/10 text-emerald-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>
                    Por turma
                  </button>
                </div>
              </label>
              {tipo === "turma" && (
                <Select label="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required>
                  <option value="">Selecione a turma</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>{turma.nome}</option>
                  ))}
                </Select>
              )}
              <label className="block">
                <span className="block mb-1.5 text-sm font-medium text-slate-300">Conteúdo</span>
                <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} className="min-h-[140px] w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-3 text-slate-100" placeholder="Escreva o comunicado para a comunidade escolar." />
              </label>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Publicar aviso</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avisos publicados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-500"><Loader2 className="animate-spin" size={20} /></div>
            ) : avisosVisiveis.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhum aviso publicado até o momento.</p>
            ) : (
              <div className="space-y-3">
                {avisosVisiveis.map((aviso) => (
                  <div key={aviso.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{aviso.titulo}</p>
                        <p className="text-xs text-slate-400">{aviso.tipo === "turma" ? `Turma: ${aviso.turmas?.nome || "Não informada"}` : "Aviso geral"}</p>
                      </div>
                      <button type="button" onClick={() => void handleDeleteAviso(aviso.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300" title="Remover aviso">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{aviso.conteudo}</p>
                    <p className="mt-3 text-xs text-slate-500">Publicação: {aviso.created_at ? new Date(aviso.created_at).toLocaleString("pt-BR") : "Agora"}</p>
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
