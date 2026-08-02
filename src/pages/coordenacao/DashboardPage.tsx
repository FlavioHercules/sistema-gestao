import { useEffect, useState } from "react";
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  School, 
  ArrowRight, 
  Loader2, 
  UserCheck, 
  Shield,
  BellRing,
  ClipboardList,
  CalendarDays 
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/Misc";

const navItems = [
  { to: "/coordenacao", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/coordenacao/professores", label: "Professores", icon: <UserCheck size={18} /> },
  { to: "/coordenacao/disciplinas", label: "Disciplinas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/turmas", label: "Turmas", icon: <School size={18} /> },
  { to: "/coordenacao/associacoes", label: "Atribuir Disciplinas", icon: <Users size={18} /> },
  { to: "/coordenacao/horarios", label: "Horários", icon: <CalendarDays size={18} /> },
  { to: "/coordenacao/avisos", label: "Avisos", icon: <BellRing size={18} /> },
  { to: "/coordenacao/usuarios", label: "Usuários", icon: <Shield size={18} /> },
];

export function CoordenacaoDashboardPage() {
  const [stats, setStats] = useState({
    turmas: 0,
    professores: 0,
    alunos: 0,
    disciplinas: 0,
    atividades: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [
          { count: countTurmas },
          { count: countProfessores },
          { count: countAlunos },
          { count: countDisciplinas },
          { count: countAtividades },
        ] = await Promise.all([
          supabase.from("turmas").select("*", { count: "exact", head: true }),
          supabase.from("professores").select("*", { count: "exact", head: true }),
          supabase.from("alunos").select("*", { count: "exact", head: true }),
          supabase.from("disciplinas").select("*", { count: "exact", head: true }),
          supabase.from("atividades").select("*", { count: "exact", head: true }),
        ]);

        setStats({
          turmas: countTurmas || 0,
          professores: countProfessores || 0,
          alunos: countAlunos || 0,
          disciplinas: countDisciplinas || 0,
          atividades: countAtividades || 0,
        });
      } catch (err) {
        console.error("Erro ao carregar estatísticas:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Painel da Coordenação"
        description="Acompanhamento geral de turmas, docentes e disciplinas."
      />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Métricas / Cards de Resumo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                  <School size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Turmas Cadastradas</p>
                  <p className="text-2xl font-bold text-white">{stats.turmas}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Disciplinas</p>
                  <p className="text-2xl font-bold text-white">{stats.disciplinas}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <UserCheck size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Professores</p>
                  <p className="text-2xl font-bold text-white">{stats.professores}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Total de Alunos</p>
                  <p className="text-2xl font-bold text-white">{stats.alunos}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Atividades Publicadas</p>
                  <p className="text-2xl font-bold text-white">{stats.atividades}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Visão geral de publicações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-400">
              <p>Os professores podem publicar atividades, simulados e avisos, enquanto a coordenação acompanha a rotina escolar em tempo real.</p>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="font-semibold text-white">Resumo operacional</p>
                <ul className="mt-2 space-y-2">
                  <li>• {stats.professores} professores cadastrados.</li>
                  <li>• {stats.turmas} turmas ativas no sistema.</li>
                  <li>• {stats.atividades} atividades publicadas para acompanhamento.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Atalhos de Ação Rápida */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle>Gestão de Turmas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Cadastre novas turmas por curso (Informática, Administração, etc.) e organize o ano letivo.
                </p>
                <Link
                  to="/coordenacao/turmas"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300"
                >
                  Ir para Turmas <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gestão de Disciplinas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Cadastre as disciplinas da instituição e associe-as às respetivas turmas da grade curricular.
                </p>
                <Link
                  to="/coordenacao/disciplinas"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Gerir Disciplinas <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atribuição de Professores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Vincule os professores cadastrados às suas respetivas disciplinas e turmas.
                </p>
                <Link
                  to="/coordenacao/associacoes"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Gerir Atribuições <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Organize a grade semanal por turma, disciplina e professor.
                </p>
                <Link
                  to="/coordenacao/horarios"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
                >
                  Abrir Horários <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mural de Avisos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Publique comunicados gerais ou por turma para os estudantes e o corpo escolar.
                </p>
                <Link
                  to="/coordenacao/avisos"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
                >
                  Gerir Avisos <ArrowRight size={16} />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}