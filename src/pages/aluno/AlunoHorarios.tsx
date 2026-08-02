import { useEffect, useState } from "react";
import { CalendarDays, School, Users, BookOpen, FileText, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/aluno", label: "Dashboard", icon: <School size={18} /> },
  
  
  
  
  { to: "/aluno/boletim", label: "Boletim", icon: <BookOpen size={18} /> },
    { to: "/aluno/horarios", label: "Meus Horários", icon: <CalendarDays size={18} /> },

  { to: "/aluno/atividades", label: "Atividades", icon: <BookOpen size={18} /> },
];

export function AlunoHorariosPage() {
  // Pega tanto o 'usuario' quanto o objeto 'aluno' do AuthContext
  const { usuario, aluno, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gradeUrl, setGradeUrl] = useState<string | null>(null);
  const [nomeTurma, setNomeTurma] = useState<string>("Sua Turma");

  useEffect(() => {
    async function loadAlunoGrade() {
      if (authLoading) return;

      setLoading(true);
      setError("");

      try {
        // Identifica o turma_id de forma segura olhando no objeto 'aluno' ou 'usuario'
        const turmaId = aluno?.turma_id || usuario?.aluno_id;

        if (!turmaId) {
          console.error("🔍 DEBUG Auth:", { usuario, aluno });
          throw new Error("Erro de Vínculo: O objeto do usuário logado não possui um 'turma_id' associado.");
        }

        // 1. Buscar informações da turma
        const { data: turmaData, error: turmaError } = await supabase
          .from("turmas")
          .select("nome")
          .eq("id", turmaId)
          .single();

        if (turmaError) {
          console.error("🔍 Erro ao buscar turma no Supabase:", turmaError);
          throw new Error(`Erro na tabela turmas: ${turmaError.message}`);
        }

        if (turmaData) {
          setNomeTurma(turmaData.nome);
        }

        // 2. Buscar a grade horária correta na tabela "horarios"
        const { data: gradeData, error: gradeError } = await supabase
          .from("horarios")
          .select("arquivo_url")
          .eq("turma_id", turmaId)
          .maybeSingle();

        if (gradeError) {
          console.error("🔍 Erro ao buscar grade na tabela horarios:", gradeError);
          throw new Error(`Erro na tabela horarios: ${gradeError.message}`);
        }

        if (gradeData) {
          setGradeUrl(gradeData.arquivo_url);
        } else {
          setGradeUrl(null);
        }
      } catch (err) {
        const mensagemErro = (err as Error).message;
        console.error("❌ ERRO CAPTURADO NA GRADE:", err);
        setError(mensagemErro);
      } finally {
        setLoading(false);
      }
    }

    loadAlunoGrade();
  }, [usuario, aluno, authLoading]);

  const isPdf = gradeUrl?.toLowerCase().includes(".pdf") || false;

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Aluno">
      <PageHeader
        title="Grade Horária da Turma"
        description={`Consulte abaixo os horários oficiais da turma ${nomeTurma}.`}
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="text-sky-400" size={20} />
            <span>Horários - {nomeTurma}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || authLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 size={32} className="animate-spin text-sky-400 mb-2" />
              <p className="text-sm">Carregando grade horária...</p>
            </div>
          ) : gradeUrl ? (
            <div className="space-y-4">
              {isPdf ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-slate-800 bg-slate-950 text-center space-y-3">
                  <FileText size={48} className="text-amber-400" />
                  <p className="text-sm font-medium text-slate-200">A grade horária está disponível em formato PDF.</p>
                  <a
                    href={gradeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition"
                  >
                    <Download size={16} />
                    <span>Baixar / Visualizar PDF</span>
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2 flex justify-center">
                    <img 
                      src={gradeUrl} 
                      alt={`Grade Horária - ${nomeTurma}`} 
                      className="w-full h-auto max-h-[600px] object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex justify-end">
                    <a
                      href={gradeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                    >
                      <Download size={14} />
                      <span>Abrir imagem em tamanho real</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-slate-400 p-6 text-center">
              <ImageIcon size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Ainda não há nenhuma grade horária cadastrada para a sua turma.</p>
              <p className="text-xs text-slate-500 mt-1">Assim que a coordenação fizer o envio, ela aparecerá aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}