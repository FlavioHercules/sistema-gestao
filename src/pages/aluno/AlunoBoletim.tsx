import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Award, BookOpen, Calendar, BellRing } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Turma, Nota } from "../../lib/supabase";
import { getAlunoData, getNotasByAluno, calculateMedia } from "../../lib/school";
import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/aluno", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/aluno/boletim", label: "Boletim", icon: <Award size={18} /> },
  { to: "/aluno/horarios", label: "Horários", icon: <Calendar size={18} /> },
  { to: "/aluno/atividades", label: "Atividades", icon: <BookOpen size={18} /> },
];

interface NotaComDetalhes extends Nota {
  disciplina_nome?: string;
  professor_nome?: string;
}

export function AlunoBoletim() {
  const { aluno } = useAuth();
  const [turma, setTurma] = useState<Turma | null>(null);
  const [notas, setNotas] = useState<NotaComDetalhes[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!aluno) return;
    (async () => {
      setLoading(true);
      try {
        const data = await getAlunoData(aluno.id);
        setTurma(data.turma || aluno.turma || null);

        const notasData = await getNotasByAluno(aluno.id);
        setNotas(notasData);

        const { data: avisosData, error: avisosError } = await supabase
          .from("avisos")
          .select("id,titulo,conteudo,tipo,turma_id,created_at,turmas(nome)")
          .order("created_at", { ascending: false });

        if (avisosError) {
          setAvisos([]);
        } else {
          // Identifica o ID da turma com segurança de ambas as fontes possíveis
          const turmaIdValida = aluno?.turma_id || aluno?.turma?.id || data?.turma?.id;
          
          const filtrados = (avisosData ?? []).filter(
            (aviso: any) => aviso.tipo === "geral" || aviso.turma_id === turmaIdValida
          );
          setAvisos(filtrados as any[]);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [aluno]);

  const totalFaltas = useMemo(() => notas.reduce((acc, curr) => acc + (curr.faltas || 0), 0), [notas]);
  const mediasValidas = useMemo(
    () => notas.map((n) => calculateMedia([n.nota_1, n.nota_2, n.nota_3])).filter((m): m is number => m !== null),
    [notas]
  );
  const mediaGeral = mediasValidas.length > 0 ? (mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1) : "—";

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Aluno">
      <PageHeader title="Boletim escolar" description="Acompanhe notas, faltas e mensagens da coordenação." />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400"><BookOpen size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Turma atual</p>
              <p className="text-lg font-semibold text-white">{turma ? turma.nome : loading ? "Carregando..." : "Sem turma"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><Award size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Média geral</p>
              <p className="text-lg font-semibold text-white">{mediaGeral}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400"><Calendar size={24} /></div>
            <div>
              <p className="text-xs text-slate-400">Total de faltas</p>
              <p className="text-lg font-semibold text-white">{totalFaltas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Boletim escolar</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">Carregando notas...</p>
            ) : notas.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhuma nota lançada até o momento.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900/80 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">Disciplina</th>
                      <th className="px-3 py-3 font-medium text-center">Nota 1</th>
                      <th className="px-3 py-3 font-medium text-center">Nota 2</th>
                      <th className="px-3 py-3 font-medium text-center">Nota 3</th>
                      <th className="px-3 py-3 font-medium text-center">Média</th>
                      <th className="px-3 py-3 font-medium text-center">Faltas</th>
                      <th className="px-4 py-3 font-medium text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {notas.map((n) => {
                      const media = calculateMedia([n.nota_1, n.nota_2, n.nota_3]);
                      const faltas = n.faltas || 0;
                      const reprovadoFaltas = faltas > 25;
                      let statusText = "Em Andamento";
                      let statusColor = "bg-slate-800 text-slate-300 border-slate-700";

                      if (reprovadoFaltas) {
                        statusText = "Reprovado por Faltas";
                        statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                      } else if (media !== null) {
                        if (media >= 7) {
                          statusText = "Aprovado";
                          statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        } else if (media >= 5) {
                          statusText = "Recuperação";
                          statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                        } else {
                          statusText = "Reprovado";
                          statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                        }
                      }

                      return (
                        <tr key={n.id} className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">
                            {n.disciplina_nome || "Disciplina"}
                            {n.professor_nome && <span className="block text-xs text-slate-500 font-normal">Prof. {n.professor_nome}</span>}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-300">{n.nota_1 != null ? n.nota_1.toFixed(1) : "—"}</td>
                          <td className="px-3 py-3 text-center text-slate-300">{n.nota_2 != null ? n.nota_2.toFixed(1) : "—"}</td>
                          <td className="px-3 py-3 text-center text-slate-300">{n.nota_3 != null ? n.nota_3.toFixed(1) : "—"}</td>
                          <td className="px-3 py-3 text-center font-semibold text-white">{media !== null ? media.toFixed(1) : "—"}</td>
                          <td className="px-3 py-3 text-center text-slate-300">{faltas}</td>
                          <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>{statusText}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Avisos recebidos</CardTitle></CardHeader>
          <CardContent>
            {avisos.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum aviso da coordenação para a sua turma.</p>
            ) : (
              <div className="space-y-3">
                {avisos.slice(0, 4).map((aviso) => (
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