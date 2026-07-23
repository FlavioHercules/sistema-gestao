import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { School, ClipboardList, TrendingUp, GraduationCap, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { StatCard } from "../../components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/Charts";
import { PageHeader } from "../../components/ui/Misc";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: <TrendingUp size={18} /> },
  { to: "/professor/turmas", label: "Minhas turmas", icon: <School size={18} /> },
  { to: "/professor/notas", label: "Notas", icon: <ClipboardList size={18} /> },
  { to: "/professor/boletim", label: "Boletins", icon: <GraduationCap size={18} /> },
];

export function ProfessorDashboard() {
  const { professor } = useAuth();
  const [turmas, setTurmas] = useState<{ id: string; nome: string; ano_letivo: number; aluno_count: number }[]>([]);
  const [stats, setStats] = useState({ turmas: 0, alunos: 0, notas: 0, mediaGeral: 0 });
  const [mediaPorTurma, setMediaPorTurma] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!professor) return;
    (async () => {
      // Turmas do professor
      const { data: tp } = await supabase
        .from("turma_professores")
        .select("turma: turmas(*)")
        .eq("professor_id", professor.id);
      const profTurmas = ((tp ?? []) as unknown as { turma: { id: string; nome: string; ano_letivo: number } }[]).map(
        (r) => r.turma
      );

      // Alunos por turma
      const turmaIds = profTurmas.map((t) => t.id);
      let alunoCount = 0;
      const turmasComContagem = [];
      for (const t of profTurmas) {
        const { count } = await supabase
          .from("alunos")
          .select("id", { count: "exact", head: true })
          .eq("turma_id", t.id);
        turmasComContagem.push({ ...t, aluno_count: count ?? 0 });
        alunoCount += count ?? 0;
      }
      setTurmas(turmasComContagem);

      // Notas do professor
      const { data: notas, count: notasCount } = await supabase
        .from("notas")
        .select("media, turma_id", { count: "exact" })
        .eq("professor_id", professor.id)
        .not("media", "is", null);

      const mediaGeral =
        notas && notas.length > 0
          ? notas.reduce((s, n) => s + Number(n.media), 0) / notas.length
          : 0;

      // média por turma
      const porTurma = new Map<string, { soma: number; count: number }>();
      for (const n of notas ?? []) {
        const turma = profTurmas.find((t) => t.id === n.turma_id);
        const nome = turma?.nome ?? "—";
        const cur = porTurma.get(nome) ?? { soma: 0, count: 0 };
        cur.soma += Number(n.media);
        cur.count += 1;
        porTurma.set(nome, cur);
      }
      setMediaPorTurma(
        Array.from(porTurma.entries()).map(([label, v]) => ({
          label,
          value: v.count ? v.soma / v.count : 0,
        }))
      );

      setStats({
        turmas: profTurmas.length,
        alunos: alunoCount,
        notas: notasCount ?? 0,
        mediaGeral,
      });
      setLoading(false);
    })();
  }, [professor]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Professor">
      <PageHeader
        title={`Olá, ${professor?.nome?.split(" ")[0] ?? "Professor"}`}
        description={`${professor?.disciplina ?? ""} — aqui está o resumo da sua atividade`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Minhas turmas" value={stats.turmas} icon={<School size={22} />} accent="sky" />
        <StatCard label="Alunos" value={stats.alunos} icon={<GraduationCap size={22} />} accent="emerald" />
        <StatCard label="Notas lançadas" value={stats.notas} icon={<ClipboardList size={22} />} accent="amber" />
        <StatCard
          label="Média geral"
          value={stats.mediaGeral.toFixed(1)}
          icon={<TrendingUp size={22} />}
          accent="violet"
          hint="Média das suas notas lançadas"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Desempenho por turma</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-500">Carregando...</p>
            ) : mediaPorTurma.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma nota lançada ainda.</p>
            ) : (
              <BarChart
                data={mediaPorTurma.map((m) => ({ label: m.label, value: m.value, max: 10 }))}
                color="bg-gradient-to-t from-emerald-600 to-emerald-400"
                height={200}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Minhas turmas</CardTitle>
          </CardHeader>
          <CardContent>
            {turmas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma turma vinculada a você.</p>
            ) : (
              <div className="space-y-2">
                {turmas.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    to={`/professor/notas?turma=${t.id}`}
                    className="group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3.5 py-2.5 transition-colors hover:border-sky-500/40 hover:bg-slate-800/70"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{t.nome}</p>
                      <p className="text-xs text-slate-500">{t.aluno_count} aluno(s) · {t.ano_letivo}</p>
                    </div>
                    <ArrowRight size={15} className="text-slate-500 group-hover:text-sky-300 transition-colors" />
                  </Link>
                ))}
                {turmas.length > 5 && (
                  <Link
                    to="/professor/turmas"
                    className="block rounded-lg px-3.5 py-2 text-center text-sm text-sky-300 hover:bg-slate-800/50"
                  >
                    Ver todas as turmas
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
