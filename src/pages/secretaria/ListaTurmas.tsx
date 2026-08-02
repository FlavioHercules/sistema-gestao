import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Loader2, 
  Users, 
  GraduationCap, 
  BookOpen,
  Eye,
  Calendar,
  Filter
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { DataTable } from "../../components/ui/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: <GraduationCap size={18} /> },
  { to: "/secretaria/alunos", label: "Alunos", icon: <Users size={18} /> },
  { to: "/secretaria/turmas", label: "Turmas", icon: <BookOpen size={18} /> },
];

type TurmaWithCounts = Turma & { aluno_count?: number; professor_count?: number };

export function ListaTurmas() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState<TurmaWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAno, setSelectedAno] = useState<string>("todos");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      // 1. Busca as turmas
      const { data: turmasData, error: errTurmas } = await supabase
        .from("turmas")
        .select("*")
        .order("nome", { ascending: true });
      
      if (errTurmas) throw errTurmas;
      const list = (turmasData ?? []) as Turma[];

      // 2. Busca contagem de alunos e professores vinculados em paralelo
      const [{ data: alunosData, error: errAlunos }, { data: profsData, error: errProfs }] = await Promise.all([
        supabase.from("alunos").select("turma_id"),
        supabase.from("turma_professores").select("turma_id"),
      ]);

      if (errAlunos) console.error("Erro ao buscar contagem de alunos:", errAlunos);
      if (errProfs) console.error("Erro ao buscar contagem de professores:", errProfs);

      // Mapeia contagem de alunos por turma_id
      const aluCount = new Map<string, number>();
      for (const r of alunosData ?? []) {
        if (r.turma_id) {
          aluCount.set(r.turma_id, (aluCount.get(r.turma_id) ?? 0) + 1);
        }
      }

      // Mapeia contagem de professores por turma_id
      const profCount = new Map<string, number>();
      for (const r of profsData ?? []) {
        if (r.turma_id) {
          profCount.set(r.turma_id, (profCount.get(r.turma_id) ?? 0) + 1);
        }
      }

      // 3. Mescla os dados calculados nas turmas
      setTurmas(
        list.map((t) => ({
          ...t,
          aluno_count: aluCount.get(t.id) ?? 0,
          professor_count: profCount.get(t.id) ?? 0,
        }))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(turmas.map((t) => String(t.ano_letivo)));
    return Array.from(anos).sort().reverse();
  }, [turmas]);

  const filtered = useMemo(() => {
    return turmas.filter((t) => {
      const matchSearch = 
        t.nome.toLowerCase().includes(search.toLowerCase()) ||
        String(t.ano_letivo).includes(search);
      
      const matchAno = selectedAno === "todos" || String(t.ano_letivo) === selectedAno;

      return matchSearch && matchAno;
    });
  }, [turmas, search, selectedAno]);

  const totalAlunosGeral = useMemo(() => {
    return turmas.reduce((s, t) => s + (t.aluno_count ?? 0), 0);
  }, [turmas]);

  const totalProfessoresGeral = useMemo(() => {
    return turmas.reduce((s, t) => s + (t.professor_count ?? 0), 0);
  }, [turmas]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Secretaria">
      <PageHeader
        title="Turmas"
        description="Consulte e acompanhe as turmas cadastradas na instituição"
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome da turma..."
                className="w-full sm:max-w-xs"
              />
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Filter size={14} /> Ano:
                </div>
                <select
                  value={selectedAno}
                  onChange={(e) => setSelectedAno(e.target.value)}
                  aria-label="Filtrar por ano letivo"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-400"
                >
                  <option value="todos">Todos os anos</option>
                  {anosDisponiveis.map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>{filtered.length} turma(s) encontrada(s)</span>
              {selectedAno !== "todos" && (
                <button 
                  onClick={() => setSelectedAno("todos")} 
                  className="text-sky-400 hover:underline"
                >
                  Limpar filtro de ano
                </button>
              )}
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
                    header: "Turma", 
                    render: (t) => (
                      <span 
                        onClick={() => navigate(`/secretaria?turma=${t.id}`)}
                        className="font-medium text-white hover:text-sky-300 cursor-pointer transition-colors"
                        title="Ver alunos e notas desta turma"
                      >
                        {t.nome}
                      </span>
                    ) 
                  },
                  { key: "ano_letivo", header: "Ano letivo" },
                  {
                    key: "aluno_count",
                    header: "Alunos",
                    render: (t) => (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                        <Users size={12} /> {t.aluno_count ?? 0}
                      </span>
                    ),
                  },
                  {
                    key: "professor_count",
                    header: "Professores",
                    render: (t) => (
                      <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                        {t.professor_count ?? 0}
                      </span>
                    ),
                  },
                  {
                    key: "actions",
                    header: "",
                    className: "text-right",
                    render: (t) => (
                      <button
                        onClick={() => navigate(`/secretaria?turma=${t.id}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-sky-500/20 hover:text-sky-300 transition-colors"
                        title="Ver alunos e boletins da turma"
                      >
                        <Eye size={14} /> Ver Turma
                      </button>
                    ),
                  },
                ]}
                data={filtered}
                rowKey={(t) => t.id}
                emptyMessage="Nenhuma turma cadastrada ou encontrada."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-sky-400" /> Resumo Institucional
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Total de turmas</span>
                <span className="text-lg font-bold text-white">{turmas.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Ano letivo atual</span>
                <span className="text-lg font-bold text-white">{new Date().getFullYear()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Alunos matriculados</span>
                <span className="text-lg font-bold text-emerald-400">{totalAlunosGeral}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3">
                <span className="text-sm text-slate-400">Vínculos de profs.</span>
                <span className="text-lg font-bold text-sky-400">{totalProfessoresGeral}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}