import { useEffect, useMemo, useState } from "react";
import { CalendarDays, School, Users, BookOpen, Loader2, Upload, FileText, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Select } from "../../components/ui/Input";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/coordenacao", label: "Dashboard", icon: <School size={18} /> },
  { to: "/coordenacao/professores", label: "Professores", icon: <Users size={18} /> },
  { to: "/coordenacao/disciplinas", label: "Disciplinas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/turmas", label: "Turmas", icon: <BookOpen size={18} /> },
  { to: "/coordenacao/associacoes", label: "Atribuir Disciplinas", icon: <Users size={18} /> },
  { to: "/coordenacao/horarios", label: "Horários", icon: <CalendarDays size={18} /> },
  { to: "/coordenacao/avisos", label: "Avisos", icon: <School size={18} /> },
  { to: "/coordenacao/usuarios", label: "Usuários", icon: <Users size={18} /> },
];

export function CoordenacaoHorariosPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState("");
  
  const [arquivoImportado, setArquivoImportado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Carrega as turmas ao abrir a página
  useEffect(() => {
    async function loadTurmas() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("turmas").select("*").order("nome", { ascending: true });
        if (error) throw error;
        setTurmas(data ?? []);
        if (data && data.length > 0) {
          setSelectedTurma(data[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    loadTurmas();
  }, []);

  // Quando trocar de turma, busca a grade já salva (se houver)
  useEffect(() => {
    if (!selectedTurma) return;

    async function fetchHorarioTurma() {
      try {
        const { data, error } = await supabase
          .from("horarios")
          .select("arquivo_url")
          .eq("turma_id", selectedTurma)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPreviewUrl(data.arquivo_url);
        } else {
          setPreviewUrl(null);
        }
      } catch (err) {
        console.error("Erro ao buscar grade da turma:", err);
      }
    }

    fetchHorarioTurma();
  }, [selectedTurma]);

  // Manipular upload da foto da grade para o Storage do Supabase
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTurma) return;

    setUploading(true);
    setError("");
    setSucesso("");

    try {
      setArquivoImportado(file);

      // 1. Enviar arquivo para o Storage do Supabase (bucket chamado "grades")
      const fileName = `${selectedTurma}-${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("grades")
        .upload(fileName, file, { upsert: true });

      if (storageError) throw storageError;

      // 2. Obter a URL pública do arquivo enviado
      const { data: publicUrlData } = supabase.storage
        .from("grades")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      setPreviewUrl(publicUrl);

      // 3. Verificar se já existe registro para esta turma no banco
      const { data: existente } = await supabase
        .from("horarios")
        .select("id")
        .eq("turma_id", selectedTurma)
        .maybeSingle();

      let dbError;
      if (existente) {
        // Se já existe, atualiza
        const { error } = await supabase
          .from("horarios")
          .update({ arquivo_url: publicUrl })
          .eq("turma_id", selectedTurma);
        dbError = error;
      } else {
        // Se não existe, insere um novo
        const { error } = await supabase
          .from("horarios")
          .insert([{ turma_id: selectedTurma, arquivo_url: publicUrl }]);
        dbError = error;
      }

      if (dbError) throw dbError;

      setSucesso(`Grade horária da turma salva e vinculada com sucesso!`);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar e salvar o arquivo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const turmaOptions = useMemo(() => turmas, [turmas]);

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Painel da Coordenação">
      <PageHeader
        title="Mural de Horários por Foto / Documento"
        description="Envie a foto oficial ou o documento da grade horária para cada turma."
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
      {sucesso && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{sucesso}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Coluna de Seleção e Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Turma e Enviar Foto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select 
              label="Turma Destino" 
              value={selectedTurma} 
              onChange={(e) => setSelectedTurma(e.target.value)} 
              required
            >
              <option value="">Selecione a turma...</option>
              <option value="geral">Geral (Todas as Turmas / Escola)</option>
              {turmaOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Select>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Arquivo da Grade (Foto ou PDF)</label>
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/50 p-6 text-center cursor-pointer transition hover:border-slate-500 hover:bg-slate-900">
                {uploading ? (
                  <Loader2 size={24} className="animate-spin text-sky-400 mb-2" />
                ) : (
                  <Upload size={24} className="text-sky-400 mb-2" />
                )}
                <span className="text-sm font-medium text-slate-200">Clique para enviar a foto da grade</span>
                <span className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP ou PDF</span>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {arquivoImportado && (
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 truncate">
                  {arquivoImportado.type.startsWith("image/") ? <ImageIcon size={16} className="text-sky-400" /> : <FileText size={16} className="text-amber-400" />}
                  <span className="font-medium truncate">{arquivoImportado.name}</span>
                </div>
                <span className="text-emerald-400 font-semibold">Salvo</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna de Visualização da Foto da Grade */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Atual da Turma Selecionada</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2">
                  <img 
                    src={previewUrl} 
                    alt="Grade Horária da Turma" 
                    className="w-full h-auto max-h-[350px] object-contain rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  Esta imagem está ativa e visível para os alunos desta turma.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-slate-400 p-6 text-center">
                <ImageIcon size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Nenhuma foto de grade enviada para esta turma ainda.</p>
                <p className="text-xs text-slate-500 mt-1">Utilize o painel ao lado para fazer o upload.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}