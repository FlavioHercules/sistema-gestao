import { useEffect, useState } from "react";
import { GraduationCap, Award, BookOpen, AlertCircle, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Turma, Nota } from "../../lib/supabase";
import { getAlunoData, getNotasByAluno, calculateMedia } from "../../lib/school";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/aluno", label: "Meu Boletim", icon: <GraduationCap size={18} /> },
];

interface NotaComDetalhes extends Nota {
  disciplina_nome?: string;
  professor_nome?: string;
}

export function AlunoDashboard() {
  const { aluno } = useAuth();
  const [turma, setTurma] = useState<Turma | null>(null);
  const [notas, setNotas] = useState<NotaComDetalhes[]>([]);
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
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [aluno]);

  // Estatísticas gerais
  const totalFaltas = notas.reduce((acc, curr) => acc + (curr.faltas || 0), 0);
  
  const mediasValidas = notas
    .map((n) => calculateMedia([n.nota_1, n.nota_2, n.nota_3]))
    .filter((m): m is number => m !== null);

  const mediaGeral =
    mediasValidas.length > 0
      ? (mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1)
      : "—";

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Aluno">
      <PageHeader
        title={`Olá, ${aluno?.nome?.split(" ")[0] || "Aluno"}!`}
        description="Acompanhe suas notas, faltas e desempenho escolar no ano letivo."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Cartões de Resumo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Turma Atual</p>
              <p className="text-lg font-semibold text-white">
                {turma ? turma.nome : loading ? "Carregando..." : "Sem turma"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Média Geral</p>
              <p className="text-lg font-semibold text-white">{mediaGeral}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total de Faltas</p>
              <p className="text-lg font-semibold text-white">{totalFaltas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Boletim */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-slate-200">
            Boletim Escolar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Carregando notas...</p>
          ) : notas.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhuma nota lançada até o momento.
            </p>
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
                          {n.professor_nome && (
                            <span className="block text-xs text-slate-500 font-normal">
                              Prof. {n.professor_nome}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300">
                          {n.nota_1 != null ? n.nota_1.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300">
                          {n.nota_2 != null ? n.nota_2.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300">
                          {n.nota_3 != null ? n.nota_3.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-white">
                          {media !== null ? media.toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300">
                          {faltas}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                            {reprovadoFaltas && <AlertCircle size={12} />}
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}