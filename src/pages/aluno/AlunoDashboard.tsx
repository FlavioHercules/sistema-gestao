import { useEffect, useState } from "react";
import { GraduationCap, Award, BookOpen, Calendar, BellRing } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Turma } from "../../lib/supabase";
import { getAlunoData, getNotasByAluno, calculateMedia, getHorariosByAluno } from "../../lib/school";
import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";
import { AgendaDoDia } from "../../components/ui/AgendaDoDia";

const navItems = [
  { to: "/aluno", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/aluno/boletim", label: "Boletim", icon: <Award size={18} /> },
  { to: "/aluno/horarios", label: "Horários", icon: <Calendar size={18} /> },
  { to: "/aluno/atividades", label: "Atividades", icon: <BookOpen size={18} /> },
];

export function AlunoDashboard() {
  const { aluno } = useAuth();
  const [turma, setTurma] = useState<Turma | null>(null);
  const [notas, setNotas] = useState<any[]>([]);
  const [horarios, setHorarios] = useState<any[] | string | null>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!aluno) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getAlunoData(aluno.id);
        setTurma(data.turma);

        const notasData = await getNotasByAluno(aluno.id);
        setNotas(notasData);

        const horariosData = await getHorariosByAluno(aluno.id);
        setHorarios(horariosData);

        const { data: avisosData, error: avisosError } = await supabase
          .from("avisos")
          .select("id,titulo,conteudo,tipo,turma_id,created_at,turmas(nome)")
          .order("created_at", { ascending: false });

        if (!avisosError) {
          setAvisos((avisosData ?? []) as any[]);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [aluno]);

  const totalFaltas = notas.reduce((acc, curr) => acc + (curr.faltas || 0), 0);
  const mediasValidas = notas
    .map((n) => calculateMedia([n.nota_1, n.nota_2, n.nota_3]))
    .filter((m): m is number => m !== null);
  const mediaGeral = mediasValidas.length > 0 ? (mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1) : "—";

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Aluno">
      <PageHeader
        title={`Olá, ${aluno?.nome?.split(" ")[0] || "Aluno"}!`}
        description="Acompanhe suas notas, faltas e desempenho escolar no ano letivo."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400"><BookOpen size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Turma Atual</p>
              <p className="text-lg font-semibold text-white">{turma ? turma.nome : loading ? "Carregando..." : "Sem turma"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><Award size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Média Geral</p>
              <p className="text-lg font-semibold text-white">{mediaGeral}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400"><Calendar size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Total de Faltas</p>
              <p className="text-lg font-semibold text-white">{totalFaltas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle className="text-base font-medium text-slate-200">Horários da semana</CardTitle></CardHeader>
          <CardContent>
            <AgendaDoDia horarios={Array.isArray(horarios) ? horarios : []} title="Seu horário de aulas" emptyMessage="Nenhuma aula cadastrada para o seu turno hoje." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-medium text-slate-200">Avisos recebidos</CardTitle></CardHeader>
          <CardContent>
            {avisos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum aviso publicado pela coordenação ainda.</p>
            ) : (
              <div className="space-y-3">
                {avisos.slice(0, 3).map((aviso) => (
                  <div key={aviso.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center gap-2 text-sky-300">
                      <BellRing size={15} />
                      <span className="text-sm font-semibold text-white">{aviso.titulo}</span>
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