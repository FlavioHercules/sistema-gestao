import { useEffect, useState } from "react";
import {
  CalendarDays,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Download,
  ExternalLink,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type { Turma } from "../../lib/supabase";

import { coordenacaoNavItems } from "../../lib/navigation";
import { AppLayout } from "../../components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Select } from "../../components/ui/Input";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

export function CoordenacaoHorariosPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState("");

  const [arquivoImportado, setArquivoImportado] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [arquivoTipo, setArquivoTipo] = useState<
    "image" | "pdf" | null
  >(null);

  const [uploading, setUploading] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(true);

  const [sucesso, setSucesso] = useState("");
  const [error, setError] = useState("");

  /*
   * Carrega todas as turmas
   */
  useEffect(() => {
    async function loadTurmas() {
      setLoadingTurmas(true);
      setError("");

      try {
        const { data, error: turmasError } = await supabase
          .from("turmas")
          .select("*")
          .order("nome", { ascending: true });

        if (turmasError) {
          throw turmasError;
        }

        const lista = data ?? [];

        setTurmas(lista);

        if (lista.length > 0) {
          setSelectedTurma(lista[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar as turmas."
        );
      } finally {
        setLoadingTurmas(false);
      }
    }

    void loadTurmas();
  }, []);

  /*
   * Busca a grade da turma selecionada
   */
  useEffect(() => {
    if (!selectedTurma) {
      setPreviewUrl(null);
      setArquivoTipo(null);
      setArquivoImportado(null);
      return;
    }

    async function fetchHorarioTurma() {
      setError("");
      setSucesso("");

      try {
        const { data, error: horarioError } = await supabase
          .from("horarios")
          .select("arquivo_url")
          .eq("turma_id", selectedTurma)
          .maybeSingle();

        if (horarioError) {
          throw horarioError;
        }

        if (data?.arquivo_url) {
          setPreviewUrl(data.arquivo_url);

          const url = data.arquivo_url.toLowerCase();

          if (url.includes(".pdf")) {
            setArquivoTipo("pdf");
          } else {
            setArquivoTipo("image");
          }
        } else {
          setPreviewUrl(null);
          setArquivoTipo(null);
        }

        setArquivoImportado(null);
      } catch (err) {
        console.error("Erro ao buscar grade:", err);

        setPreviewUrl(null);
        setArquivoTipo(null);
      }
    }

    void fetchHorarioTurma();
  }, [selectedTurma]);

  /*
   * Upload da grade
   */
  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file || !selectedTurma) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError("");
    setSucesso("");

    try {
      /*
       * Validação do arquivo
       */
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Formato inválido. Envie uma imagem PNG, JPG, WEBP ou um PDF."
        );
      }

      /*
       * Limite de 10 MB
       */
      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        throw new Error("O arquivo deve ter no máximo 10 MB.");
      }

      setArquivoImportado(file);

      /*
       * Define o tipo do arquivo
       */
      const tipoArquivo = file.type === "application/pdf"
        ? "pdf"
        : "image";

      setArquivoTipo(tipoArquivo);

      /*
       * Nome seguro para o arquivo
       */
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "arquivo";

      const fileName = `${selectedTurma}/${Date.now()}.${extension}`;

      /*
       * Upload para o Storage
       */
      const { error: storageError } = await supabase.storage
        .from("grades")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (storageError) {
        throw storageError;
      }

      /*
       * URL pública
       */
      const { data: publicUrlData } = supabase.storage
        .from("grades")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      if (!publicUrl) {
        throw new Error("Não foi possível obter a URL do arquivo.");
      }

      /*
       * Atualiza preview
       */
      setPreviewUrl(publicUrl);

      /*
       * Verifica se a turma já possui uma grade
       */
      const { data: existente, error: buscaError } = await supabase
        .from("horarios")
        .select("id")
        .eq("turma_id", selectedTurma)
        .maybeSingle();

      if (buscaError) {
        throw buscaError;
      }

      /*
       * Atualiza ou cria registro
       */
      if (existente) {
        const { error: updateError } = await supabase
          .from("horarios")
          .update({
            arquivo_url: publicUrl,
          })
          .eq("id", existente.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("horarios")
          .insert({
            turma_id: selectedTurma,
            arquivo_url: publicUrl,
          });

        if (insertError) {
          throw insertError;
        }
      }

      const turmaSelecionada = turmas.find(
        (turma) => turma.id === selectedTurma
      );

      setSucesso(
        `Grade horária ${
          turmaSelecionada?.nome
            ? `da turma ${turmaSelecionada.nome}`
            : ""
        } salva com sucesso!`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao carregar e salvar o arquivo.";

      setError(message);
      setArquivoImportado(null);
      setPreviewUrl(null);
      setArquivoTipo(null);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  /*
   * Turma selecionada
   */
  const turmaAtual = turmas.find(
    (turma) => turma.id === selectedTurma
  );

  return (
    <AppLayout navItems={coordenacaoNavItems}>
      <PageHeader
        title="Gestão de Horários"
        description="Envie e gerencie a grade horária de cada turma da instituição."
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {sucesso && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2
            size={18}
            className="shrink-0 text-emerald-400"
          />
          <span>{sucesso}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Painel de gerenciamento */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Grade Horária</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <Select
              label="Turma"
              value={selectedTurma}
              onChange={(e) => {
                setSelectedTurma(e.target.value);
                setSucesso("");
              }}
              disabled={loadingTurmas || uploading}
            >
              <option value="">
                {loadingTurmas
                  ? "Carregando turmas..."
                  : "Selecione uma turma"}
              </option>

              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                  {turma.curso ? ` — ${turma.curso}` : ""}
                </option>
              ))}
            </Select>

            {turmaAtual && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Turma selecionada
                </p>

                <p className="mt-1 text-base font-semibold text-white">
                  {turmaAtual.nome}
                </p>

                {turmaAtual.curso && (
                  <p className="mt-1 text-xs text-slate-400">
                    Curso: {turmaAtual.curso}
                  </p>
                )}

                {turmaAtual.ano_letivo && (
                  <p className="mt-1 text-xs text-slate-500">
                    Ano letivo: {turmaAtual.ano_letivo}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Arquivo da Grade
              </label>

              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition ${
                  !selectedTurma || uploading
                    ? "cursor-not-allowed border-slate-800 bg-slate-950/40 opacity-60"
                    : "border-slate-700 bg-slate-900/50 hover:border-sky-500/50 hover:bg-slate-900"
                }`}
              >
                {uploading ? (
                  <Loader2
                    size={28}
                    className="mb-3 animate-spin text-sky-400"
                  />
                ) : (
                  <Upload
                    size={28}
                    className="mb-3 text-sky-400"
                  />
                )}

                <span className="text-sm font-semibold text-slate-200">
                  {uploading
                    ? "Enviando arquivo..."
                    : "Clique para enviar a grade"}
                </span>

                <span className="mt-1 text-xs text-slate-500">
                  PNG, JPG, WEBP ou PDF — máximo 10 MB
                </span>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleImageUpload}
                  disabled={!selectedTurma || uploading}
                  className="hidden"
                />
              </label>
            </div>

            {arquivoImportado && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {arquivoImportado.type === "application/pdf" ? (
                    <FileText
                      size={20}
                      className="shrink-0 text-amber-400"
                    />
                  ) : (
                    <ImageIcon
                      size={20}
                      className="shrink-0 text-sky-400"
                    />
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {arquivoImportado.name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {(arquivoImportado.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {!uploading && (
                  <span className="shrink-0 text-xs font-semibold text-emerald-400">
                    Salvo
                  </span>
                )}
              </div>
            )}

            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-xs font-semibold text-sky-300">
                Como funciona?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Se a turma já possuir uma grade cadastrada, o novo
                arquivo substituirá a grade anterior automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Visualização */}
        <Card>
          <CardHeader>
            <CardTitle>
              Grade Atual
              {turmaAtual ? ` — ${turmaAtual.nome}` : ""}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {!selectedTurma ? (
              <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center">
                <CalendarDays
                  size={36}
                  className="mb-3 text-slate-600"
                />

                <p className="text-sm text-slate-400">
                  Selecione uma turma para visualizar sua grade.
                </p>
              </div>
            ) : previewUrl ? (
              <div className="space-y-4">
                {arquivoTipo === "pdf" ? (
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    <iframe
                      src={previewUrl}
                      title={`Grade horária ${turmaAtual?.nome ?? ""}`}
                      className="h-[500px] w-full"
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2">
                    <img
                      src={previewUrl}
                      alt={`Grade horária da turma ${
                        turmaAtual?.nome ?? ""
                      }`}
                      className="max-h-[500px] w-full rounded-lg object-contain"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Esta é a grade atualmente vinculada à turma.
                  </p>

                  <div className="flex gap-2">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      <ExternalLink size={14} />
                      Abrir
                    </a>

                    <a
                      href={previewUrl}
                      download
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      <Download size={14} />
                      Baixar
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center">
                <ImageIcon
                  size={36}
                  className="mb-3 text-slate-600"
                />

                <p className="text-sm text-slate-400">
                  Nenhuma grade cadastrada para esta turma.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Envie uma imagem ou PDF pelo painel ao lado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}