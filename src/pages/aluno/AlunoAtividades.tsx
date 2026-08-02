import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getAtividadesByAluno } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Select } from "../../components/ui/Input";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";
import { BookOpen, Calendar, CheckSquare2, GraduationCap, Loader2, BellRing, Award } from "lucide-react";
import { supabase } from "../../lib/supabase";

const navItems = [
  { to: "/aluno", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/aluno/boletim", label: "Boletim", icon: <Award size={18} /> },
  { to: "/aluno/horarios", label: "Horários", icon: <Calendar size={18} /> },
  { to: "/aluno/atividades", label: "Atividades", icon: <BookOpen size={18} /> },
];

export function AlunoAtividades() {
  const { aluno } = useAuth();
  const [atividades, setAtividades] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [disciplinaFilter, setDisciplinaFilter] = useState("TODAS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!aluno?.id) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const turmaIdValido = aluno?.turma_id || aluno?.turma?.id;
        
        const data = await getAtividadesByAluno(aluno.id, turmaIdValido);
        setAtividades(data ?? []);

        const { data: avisosData, error: avisosError } = await supabase
          .from("avisos")
          .select("id,titulo,conteudo,tipo,turma_id,created_at,turmas(nome)")
          .order("created_at", { ascending: false });

        if (avisosError) {
          setAvisos([]);
        } else {
          const filtrados = (avisosData ?? []).filter(
            (aviso: any) => aviso.tipo === "geral" || aviso.turma_id === turmaIdValido
          );
          setAvisos(filtrados as any[]);
        }
      } catch (err: any) {
        setError(`Erro ao carregar: ${err?.message || "Desconhecido"}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [aluno?.id]);

  const disciplinas = useMemo(() => {
    const set = new Set<string>();
    atividades.forEach((atividade) => {
      if (atividade.disciplina?.nome) set.add(atividade.disciplina.nome);
    });
    return Array.from(set);
  }, [atividades]);

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((atividade) => {
      if (disciplinaFilter === "TODAS") return true;
      return atividade.disciplina?.nome === disciplinaFilter;
    });
  }, [atividades, disciplinaFilter]);

  const pendentesCount = atividadesFiltradas.filter((atividade) => !atividade.prazo || new Date(atividade.prazo) >= new Date()).length;

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Aluno">
      <PageHeader
        title="Atividades e Simulados"
        description="Consulte as tarefas e simulados disponíveis para a sua turma."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400"><BookOpen size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Total de atividades</p>
              <p className="text-lg font-semibold text-white">{atividades.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><CheckSquare2 size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Atividades ativas</p>
              <p className="text-lg font-semibold text-white">{pendentesCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400"><Calendar size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Sua turma</p>
              <p className="text-lg font-semibold text-white">{aluno?.turma?.nome || "Não definida"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader><CardTitle>Lista de atividades</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select label="Filtrar por disciplina" value={disciplinaFilter} onChange={(e) => setDisciplinaFilter(e.target.value)}>
                <option value="TODAS">Todas as disciplinas</option>
                {disciplinas.map((disciplina) => (
                  <option key={disciplina} value={disciplina}>{disciplina}</option>
                ))}
              </Select>
            </div>
            {loading ? (
              <div className="py-10 text-center text-slate-500 flex justify-center items-center"><Loader2 size={24} className="animate-spin" /></div>
            ) : atividadesFiltradas.length === 0 ? (
              <p className="py-10 text-center text-slate-500">Nenhuma atividade ou simulado disponível no momento.</p>
            ) : (
              <div className="space-y-4">
                {atividadesFiltradas.map((atividade) => {
                  const isToday = atividade.prazo && atividade.prazo.split("T")[0] === new Date().toISOString().split("T")[0];
                  return (
                    <div key={atividade.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{atividade.titulo}</p>
                            {isToday && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">Vence hoje</span>}
                          </div>
                          <p className="text-xs text-slate-400">{atividade.disciplina?.nome || "Sem disciplina"}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${atividade.tipo === "simulado" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}>
                          {atividade.tipo === "simulado" ? "Simulado" : "Atividade"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{atividade.descricao || "Sem descrição adicional."}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mural de avisos</CardTitle></CardHeader>
          <CardContent>
            {avisos.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhum aviso disponível.</p>
            ) : (
              <div className="space-y-3">
                {avisos.map((aviso) => (
                  <div key={aviso.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2 text-sky-300">
                      <BellRing size={16} />
                      <span className="text-sm font-semibold">{aviso.titulo}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{aviso.conteudo}</p>
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