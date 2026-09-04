import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  School,
  Loader2,
  Save,
  CheckCircle2,
  Edit2,
  Layers,
  GraduationCap,
  BookOpen,
  Upload,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import type { Turma, Aluno, Nota } from "../../lib/supabase";
import {
  calculateMedia,
  getAlunosByTurma,
  getNotasByProfessorAndTurma,
  saveProfessorNote,
} from "../../lib/school";
import { supabase } from "../../lib/supabase";

import { professorNavItems } from "../../lib/navigation";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const UNIDADES = [
  { id: 1, label: "1ª Unidade" },
  { id: 2, label: "2ª Unidade" },
  { id: 3, label: "3ª Unidade" },
  { id: 4, label: "4ª Unidade" },
];

interface AlunoComNota extends Aluno {
  nota?: Nota | null;
}

interface DraftAluno {
  n1: string;
  n2: string;
  n3: string;
  faltas: string;
  observacao: string;
  notaId?: string;
  isDirty?: boolean;
}

interface VinculoProf {
  turma_id: string;
  disciplina_id: string;
  turmas: Turma;
}

export function ProfessorNotas() {
  const { professor } = useAuth();

  const [params, setParams] = useSearchParams();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [vinculos, setVinculos] = useState<VinculoProf[]>([]);
  const [alunos, setAlunos] = useState<AlunoComNota[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [error, setError] = useState("");

  const [columnNames, setColumnNames] = useState({
    n1: "Avaliação 1",
    n2: "Avaliação 2",
    n3: "Trabalho / Ativ.",
  });

  const [editingHeader, setEditingHeader] = useState<
    "n1" | "n2" | "n3" | null
  >(null);

  const selectedUnidade = Number(params.get("unidade") ?? "1");
  const selectedTurma = params.get("turma") ?? "";

  const [draft, setDraft] = useState<Record<string, DraftAluno>>({});

  const selectedDisciplinaId = useMemo(() => {
    const vinculo = vinculos.find(
      (v) => v.turma_id === selectedTurma
    );

    if (vinculo) {
      return vinculo.disciplina_id;
    }

    return "";
  }, [vinculos, selectedTurma]);

  const hasChanges = useMemo(() => {
    const drafts = Object.values(draft);

    return drafts.some((d) => d.isDirty === true);
  }, [draft]);

  /*
   * CARREGA TURMAS DO PROFESSOR
   */
  useEffect(() => {
    if (!professor?.id) {
      return;
    }

    let cancelled = false;

    const fetchTurmas = async () => {
      try {
        const { data: vData, error: vErr } = await supabase
          .from("professor_turma_disciplina")
          .select(
            "turma_id, disciplina_id, turmas (id, nome, ano_letivo, curso)"
          )
          .eq("professor_id", professor.id);

        if (vErr) {
          throw vErr;
        }

        if (cancelled) {
          return;
        }

        const listaVinculos =
          (vData ?? []) as unknown as VinculoProf[];

        setVinculos(listaVinculos);

        const turmasMap = new Map<string, Turma>();

        listaVinculos.forEach((vinculo) => {
          if (vinculo.turmas) {
            if (!turmasMap.has(vinculo.turmas.id)) {
              turmasMap.set(
                vinculo.turmas.id,
                vinculo.turmas
              );
            }
          }
        });

        const profTurmas = Array.from(turmasMap.values());

        setTurmas(profTurmas);

        const turmaAtualValida = profTurmas.some(
          (turma) => turma.id === selectedTurma
        );

        if (profTurmas.length > 0) {
          if (!selectedTurma || !turmaAtualValida) {
            setParams(
              {
                turma: profTurmas[0].id,
                unidade: String(selectedUnidade),
              },
              { replace: true }
            );
          }
        }
      } catch (err) {
        console.error(
          "Erro ao carregar turmas:",
          err
        );

        setTurmas([]);
        setVinculos([]);
        setError(
          "Não foi possível carregar as turmas do professor."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTurmas();

    return () => {
      cancelled = true;
    };
  }, [professor?.id]);

  /*
   * CARREGA ALUNOS E NOTAS
   */
  useEffect(() => {
    if (!professor?.id || !selectedTurma) {
      setAlunos([]);
      setDraft({});
      return;
    }

    let cancelled = false;

    const fetchAlunosENotas = async () => {
      setLoading(true);
      setError("");

      try {
        const alunosList =
          await getAlunosByTurma(selectedTurma);

        const notasList =
          await getNotasByProfessorAndTurma(
            professor.id,
            selectedTurma,
            selectedUnidade
          );

        if (cancelled) {
          return;
        }

        const notaByAluno = new Map<string, Nota>();

        notasList.forEach((nota) => {
          notaByAluno.set(nota.aluno_id, nota);
        });

        const merged: AlunoComNota[] = alunosList.map(
          (aluno) => {
            return {
              ...aluno,
              nota: notaByAluno.get(aluno.id) ?? null,
            };
          }
        );

        setAlunos(merged);

        const newDraft: Record<
          string,
          DraftAluno
        > = {};

        merged.forEach((aluno) => {
          newDraft[aluno.id] = {
            n1:
              aluno.nota?.nota_1 != null
                ? String(aluno.nota.nota_1)
                : "",

            n2:
              aluno.nota?.nota_2 != null
                ? String(aluno.nota.nota_2)
                : "",

            n3:
              aluno.nota?.nota_3 != null
                ? String(aluno.nota.nota_3)
                : "",

            faltas:
              aluno.nota?.faltas != null
                ? String(aluno.nota.faltas)
                : "0",

            observacao:
              aluno.nota?.observacao ??
              aluno.observacao ??
              "",

            notaId: aluno.nota?.id,
            isDirty: false,
          };
        });

        setDraft(newDraft);
      } catch (err) {
        console.error(
          "Erro ao carregar alunos e notas:",
          err
        );

        setError(
          "Erro ao carregar os dados dos alunos."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAlunosENotas();

    return () => {
      cancelled = true;
    };
  }, [
    professor?.id,
    selectedTurma,
    selectedUnidade,
  ]);

  /*
   * IMPORTAÇÃO DE PDF / CSV
   */
  const handleImportArquivo = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    try {
      let textoExtraido = "";

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const arrayBuffer =
          await file.arrayBuffer();

        const pdf = await pdfjsLib
          .getDocument({
            data: arrayBuffer,
          })
          .promise;

        let textoCompleto = "";

        for (
          let pagina = 1;
          pagina <= pdf.numPages;
          pagina++
        ) {
          const page =
            await pdf.getPage(pagina);

          const textContent =
            await page.getTextContent();

          const pageText =
            textContent.items
              .map((item) => {
                if ("str" in item) {
                  return item.str;
                }

                return "";
              })
              .join(" ");

          textoCompleto +=
            pageText + "\n";
        }

        textoExtraido = textoCompleto;
      } else {
        textoExtraido =
          await new Promise<string>(
            (resolve, reject) => {
              const reader =
                new FileReader();

              reader.onload = (e) => {
                const result =
                  e.target?.result;

                if (
                  typeof result === "string"
                ) {
                  resolve(result);
                  return;
                }

                resolve("");
              };

              reader.onerror = () => {
                reject(
                  new Error(
                    "Erro ao ler arquivo."
                  )
                );
              };

              reader.readAsText(file);
            }
          );
      }

      if (!textoExtraido.trim()) {
        setError(
          "O arquivo enviado está vazio ou não pôde ser lido."
        );

        return;
      }

      const lines =
        textoExtraido.split(/\r\n|\n/);

      let importadasCount = 0;

      setDraft((prev) => {
        const next = { ...prev };

        lines.forEach((line) => {
          const cleanLine = line.trim();

          if (!cleanLine) {
            return;
          }

          alunos.forEach((aluno) => {
            const identificador =
              aluno.matricula ||
              aluno.nome;

            if (!identificador) {
              return;
            }

            const encontrouAluno =
              cleanLine
                .toLowerCase()
                .includes(
                  identificador.toLowerCase()
                );

            if (!encontrouAluno) {
              return;
            }

            const numeros =
              cleanLine.match(
                /\b(10|[0-9](?:[,.][0-9]{1,2})?)\b/g
              );

            if (!numeros) {
              return;
            }

            if (numeros.length === 0) {
              return;
            }

            const atual =
              next[aluno.id];

            if (!atual) {
              return;
            }

            next[aluno.id] = {
              ...atual,

              n1:
                numeros[0]
                  ? numeros[0].replace(
                      ",",
                      "."
                    )
                  : atual.n1,

              n2:
                numeros[1]
                  ? numeros[1].replace(
                      ",",
                      "."
                    )
                  : atual.n2,

              n3:
                numeros[2]
                  ? numeros[2].replace(
                      ",",
                      "."
                    )
                  : atual.n3,

              isDirty: true,
            };

            importadasCount += 1;
          });
        });

        return next;
      });

      if (importadasCount > 0) {
        setSavedSuccess(false);
        setError("");
      } else {
        setError(
          "Não foi possível correlacionar automaticamente os dados com os alunos desta turma. Verifique se as matrículas ou nomes conferem."
        );
      }
    } catch (err) {
      console.error(
        "Erro ao ler o arquivo:",
        err
      );

      setError(
        "Erro ao processar o arquivo. Certifique-se de que é um PDF ou CSV válido."
      );
    } finally {
      event.target.value = "";
    }
  };

  /*
   * ATUALIZAÇÃO DAS NOTAS
   */
  const updateDraftNote = (
    alunoId: string,
    field: "n1" | "n2" | "n3",
    rawValue: string
  ) => {
    const value =
      rawValue.replace(",", ".");

    const regex =
      /^\d{0,2}(\.\d{0,2})?$/;

    if (value !== "" && !regex.test(value)) {
      return;
    }

    if (
      value !== "" &&
      Number(value) > 10
    ) {
      return;
    }

    setDraft((prev) => {
      const alunoAtual =
        prev[alunoId];

      if (!alunoAtual) {
        return prev;
      }

      return {
        ...prev,

        [alunoId]: {
          ...alunoAtual,
          [field]: value,
          isDirty: true,
        },
      };
    });
  };

  /*
   * ATUALIZAÇÃO DAS FALTAS
   */
  const updateFaltas = (
    alunoId: string,
    value: string
  ) => {
    if (
      value !== "" &&
      !/^\d+$/.test(value)
    ) {
      return;
    }

    setDraft((prev) => {
      const alunoAtual =
        prev[alunoId];

      if (!alunoAtual) {
        return prev;
      }

      return {
        ...prev,

        [alunoId]: {
          ...alunoAtual,
          faltas: value,
          isDirty: true,
        },
      };
    });
  };

  /*
   * ATUALIZAÇÃO DA OBSERVAÇÃO
   */
  const updateObservacao = (
    alunoId: string,
    value: string
  ) => {
    setDraft((prev) => {
      const alunoAtual =
        prev[alunoId];

      if (!alunoAtual) {
        return prev;
      }

      return {
        ...prev,

        [alunoId]: {
          ...alunoAtual,
          observacao: value,
          isDirty: true,
        },
      };
    });
  };

  /*
   * MÉDIA EM TEMPO REAL
   */
  const mediaOf = (
    alunoId: string
  ): number | null => {
    const d = draft[alunoId];

    if (!d) {
      return null;
    }

    return calculateMedia([
      d.n1 === ""
        ? null
        : Number(d.n1),

      d.n2 === ""
        ? null
        : Number(d.n2),

      d.n3 === ""
        ? null
        : Number(d.n3),
    ]);
  };

  /*
   * SALVAMENTO EM LOTE
   */
  const handleSaveAll = async () => {
    if (
      !professor?.id ||
      !selectedTurma ||
      savingAll
    ) {
      return;
    }

    if (!selectedDisciplinaId) {
      setError(
        "Não foi encontrada nenhuma disciplina vinculada a esta turma."
      );

      return;
    }

    setSavingAll(true);
    setError("");

    try {
      const promises =
        Object.entries(draft).map(
          async ([alunoId, d]) => {
            if (!d.isDirty) {
              return null;
            }

            const result =
              await saveProfessorNote({
                alunoId,
                professorId:
                  professor.id,
                turmaId:
                  selectedTurma,
                disciplinaId:
                  selectedDisciplinaId,
                unidade:
                  selectedUnidade,

                nota1:
                  d.n1 === ""
                    ? null
                    : Number(d.n1),

                nota2:
                  d.n2 === ""
                    ? null
                    : Number(d.n2),

                nota3:
                  d.n3 === ""
                    ? null
                    : Number(d.n3),

                faltas:
                  d.faltas === ""
                    ? 0
                    : Number(d.faltas),

                observacao:
                  d.observacao || null,
              });

            return {
              alunoId,
              notaId:
                result?.notaId,
            };
          }
        );

      const results =
        await Promise.all(
          promises
        );

      setDraft((prev) => {
        const next = { ...prev };

        results.forEach((result) => {
          if (!result) {
            return;
          }

          const alunoAtual =
            next[result.alunoId];

          if (!alunoAtual) {
            return;
          }

          next[result.alunoId] = {
            ...alunoAtual,

            notaId:
              result.notaId ??
              alunoAtual.notaId,

            isDirty: false,
          };
        });

        return next;
      });

      setSavedSuccess(true);

      setTimeout(() => {
        setSavedSuccess(false);
      }, 2500);
    } catch (err) {
      console.error(
        "Erro ao salvar notas:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Erro ao salvar as alterações."
        );
      }
    } finally {
      setSavingAll(false);
    }
  };

  const currentTurma = useMemo(() => {
    return turmas.find(
      (turma) =>
        turma.id === selectedTurma
    );
  }, [
    turmas,
    selectedTurma,
  ]);

  return (
    <AppLayout navItems={professorNavItems}>
      <PageHeader
        title="Planilha de Notas e Faltas"
        description="Gerencie as avaliações por unidade ou importe dados externos do SIGEduc via PDF ou CSV."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-700">
              <Upload size={16} />

              <span>
                Importar PDF / CSV
              </span>

              <input
                type="file"
                accept=".pdf,.csv,.txt"
                onChange={
                  handleImportArquivo
                }
                className="hidden"
              />
            </label>

            <Button
              onClick={
                handleSaveAll
              }
              disabled={
                savingAll ||
                !hasChanges
              }
              className={
                savedSuccess
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : ""
              }
            >
              {savingAll ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : savedSuccess ? (
                <CheckCircle2
                  size={16}
                />
              ) : (
                <Save size={16} />
              )}

              {savingAll
                ? "Salvando..."
                : savedSuccess
                ? "Salvo com sucesso!"
                : "Salvar Alterações"}
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorBanner
            message={error}
          />
        </div>
      ) : null}

      <div className="mb-6 space-y-4">
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selecione a Turma:
          </span>

          <div className="flex flex-wrap gap-2">
            {turmas.length === 0 ? (
              <span className="text-xs text-slate-500">
                Nenhuma turma encontrada.
              </span>
            ) : (
              turmas.map((turma) => (
                <button
                  key={turma.id}
                  onClick={() => {
                    setParams({
                      turma: turma.id,
                      unidade:
                        String(
                          selectedUnidade
                        ),
                    });
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                    selectedTurma ===
                    turma.id
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-300 shadow-sm"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <School size={14} />

                  {turma.nome}
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selecione a Unidade Letiva:
          </span>

          <div className="flex flex-wrap gap-2">
            {UNIDADES.map(
              (unidade) => (
                <button
                  key={unidade.id}
                  onClick={() => {
                    setParams({
                      turma:
                        selectedTurma,
                      unidade:
                        String(
                          unidade.id
                        ),
                    });
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    selectedUnidade ===
                    unidade.id
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  <Layers size={13} />

                  {unidade.label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {currentTurma ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <p>
            Turma:{" "}
            <span className="font-semibold text-white">
              {currentTurma.nome}
            </span>

            {" · "}

            Ano{" "}
            {currentTurma.ano_letivo}

            {" · "}

            <span className="font-medium text-amber-400">
              {selectedUnidade}ª
              Unidade
            </span>
          </p>

          {hasChanges ? (
            <span className="animate-pulse text-xs font-medium text-amber-300">
              ● Alterações pendentes
              de salvamento
            </span>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2
                className="animate-spin"
                size={24}
              />
            </div>
          ) : alunos.length === 0 ? (
            <div className="py-12 text-center">
              <School
                size={32}
                className="mx-auto mb-3 text-slate-600"
              />

              <p className="text-sm text-slate-500">
                Nenhum aluno
                cadastrado nesta
                turma.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-left text-slate-300">
                    <th className="min-w-[220px] border-r border-slate-800/60 px-4 py-3.5 font-medium">
                      Aluno
                    </th>

                    {(
                      [
                        "n1",
                        "n2",
                        "n3",
                      ] as const
                    ).map((col) => (
                      <th
                        key={col}
                        className="w-32 border-r border-slate-800/60 px-3 py-3 text-center font-medium"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {editingHeader ===
                          col ? (
                            <input
                              type="text"
                              autoFocus
                              value={
                                columnNames[
                                  col
                                ]
                              }
                              onBlur={() => {
                                setEditingHeader(
                                  null
                                );
                              }}
                              onChange={(
                                e
                              ) => {
                                setColumnNames(
                                  (
                                    prev
                                  ) => ({
                                    ...prev,
                                    [col]:
                                      e
                                        .target
                                        .value,
                                  })
                                );
                              }}
                              className="w-28 rounded border border-sky-400 bg-slate-900 px-1 py-0.5 text-center text-xs text-sky-200 outline-none"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHeader(
                                  col
                                );
                              }}
                              className="cursor-pointer transition-colors hover:text-sky-300"
                              title="Clique para renomear"
                            >
                              {
                                columnNames[
                                  col
                                ]
                              }
                            </button>
                          )}

                          <Edit2
                            size={11}
                            className="cursor-pointer text-slate-500 hover:text-sky-400"
                            onClick={() => {
                              setEditingHeader(
                                col
                              );
                            }}
                          />
                        </div>
                      </th>
                    ))}

                    <th className="w-24 border-r border-slate-800/60 px-3 py-3 text-center font-medium">
                      Média
                    </th>

                    <th className="w-24 border-r border-slate-800/60 px-3 py-3 text-center font-medium">
                      Faltas
                    </th>

                    <th className="min-w-[220px] px-4 py-3 font-medium">
                      Observação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {alunos.map(
                    (aluno) => {
                      const media =
                        mediaOf(
                          aluno.id
                        );

                      const faltasCount =
                        Number(
                          draft[
                            aluno.id
                          ]?.faltas ?? 0
                        );

                      const isDirty =
                        draft[
                          aluno.id
                        ]?.isDirty;

                      let mediaColor =
                        "text-slate-500";

                      if (
                        faltasCount >
                        25
                      ) {
                        mediaColor =
                          "font-bold text-rose-400";
                      } else if (
                        media !== null
                      ) {
                        if (
                          media >= 7
                        ) {
                          mediaColor =
                            "font-bold text-emerald-300";
                        } else if (
                          media >= 5
                        ) {
                          mediaColor =
                            "font-semibold text-amber-300";
                        } else {
                          mediaColor =
                            "font-semibold text-rose-300";
                        }
                      }

                      return (
                        <tr
                          key={
                            aluno.id
                          }
                          className={`transition-colors ${
                            isDirty
                              ? "bg-amber-500/5 hover:bg-amber-500/10"
                              : "bg-slate-900/30 hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="border-r border-slate-800/60 px-4 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-white">
                                  {
                                    aluno.nome
                                  }
                                </p>

                                <p className="text-xs text-slate-500">
                                  {
                                    aluno.matricula
                                  }
                                </p>
                              </div>

                              {isDirty ? (
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                                  title="Pendente de salvamento"
                                />
                              ) : null}
                            </div>
                          </td>

                          {(
                            [
                              "n1",
                              "n2",
                              "n3",
                            ] as const
                          ).map(
                            (field) => (
                              <td
                                key={
                                  field
                                }
                                className="border-r border-slate-800/60 px-2 py-2 text-center"
                              >
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    draft[
                                      aluno.id
                                    ]?.[
                                      field
                                    ] ??
                                    ""
                                  }
                                  onChange={(
                                    e
                                  ) => {
                                    updateDraftNote(
                                      aluno.id,
                                      field,
                                      e
                                        .target
                                        .value
                                    );
                                  }}
                                  placeholder="—"
                                  className="h-9 w-full rounded-md border border-slate-700/80 bg-slate-800/50 text-center font-mono text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
                                />
                              </td>
                            )
                          )}

                          <td
                            className={`border-r border-slate-800/60 px-3 py-2 text-center font-mono ${mediaColor}`}
                          >
                            {media !==
                            null
                              ? media.toFixed(
                                  1
                                )
                              : "—"}
                          </td>

                          <td className="border-r border-slate-800/60 px-2 py-2 text-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={
                                draft[
                                  aluno.id
                                ]?.faltas ??
                                "0"
                              }
                              onChange={(
                                e
                              ) => {
                                updateFaltas(
                                  aluno.id,
                                  e
                                    .target
                                    .value
                                );
                              }}
                              className="h-9 w-full rounded-md border border-slate-700/80 bg-slate-800/50 text-center font-mono text-slate-100 focus:border-sky-400 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
                            />
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={
                                draft[
                                  aluno.id
                                ]?.observacao ??
                                ""
                              }
                              onChange={(
                                e
                              ) => {
                                updateObservacao(
                                  aluno.id,
                                  e
                                    .target
                                    .value
                                );
                              }}
                              placeholder="Observação rápida..."
                              className="h-9 w-full rounded-md border border-slate-700/80 bg-slate-800/50 px-3 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
                            />
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}