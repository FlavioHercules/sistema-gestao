import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, School, Loader2, Save, CheckCircle2, Edit2, Layers, TrendingUp, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { Turma, Aluno, Nota } from "../../lib/supabase";
import { calculateMedia, getAlunosByTurma, getNotasByProfessorAndTurma, saveProfessorNote } from "../../lib/school";
import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PageHeader, ErrorBanner } from "../../components/ui/Misc";

const navItems = [
  { to: "/professor", label: "Dashboard", icon: <TrendingUp size={18} /> },
  { to: "/professor/turmas", label: "Minhas turmas", icon: <School size={18} /> },
  { to: "/professor/notas", label: "Notas", icon: <ClipboardList size={18} /> },
  { to: "/professor/boletim", label: "Boletins", icon: <GraduationCap size={18} /> },
];

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

  // Nomes editáveis das colunas de avaliação
  const [columnNames, setColumnNames] = useState({
    n1: "Avaliação 1",
    n2: "Avaliação 2",
    n3: "Trabalho / Ativ.",
  });
  const [editingHeader, setEditingHeader] = useState<"n1" | "n2" | "n3" | null>(null);

  // Unidade Selecionada (Query Param 'unidade' ou Padrão 1)
  const selectedUnidade = Number(params.get("unidade") ?? "1");
  const selectedTurma = params.get("turma") ?? "";

  // Recupera o ID da disciplina vinculada a esta turma
  const selectedDisciplinaId = useMemo(() => {
    const vinculo = vinculos.find((v) => v.turma_id === selectedTurma);
    return vinculo?.disciplina_id ?? "";
  }, [vinculos, selectedTurma]);

  // Estado unificado da planilha por aluno
  const [draft, setDraft] = useState<Record<string, DraftAluno>>({});

  // Verifica se existem alterações pendentes de salvamento
  const hasChanges = useMemo(() => {
    return Object.values(draft).some((d) => d.isDirty);
  }, [draft]);

  // Carrega turmas e vínculos do professor
  useEffect(() => {
    if (!professor?.id) return;

    (async () => {
      try {
        const { data: vData, error: vErr } = await supabase
          .from("professor_turma_disciplina")
          .select("turma_id, disciplina_id, turmas (id, nome, ano_letivo, curso)")
          .eq("professor_id", professor.id);

        if (vErr) throw vErr;

        const listaVinculos = (vData ?? []) as unknown as VinculoProf[];
        setVinculos(listaVinculos);

        const turmasMap = new Map<string, Turma>();
        listaVinculos.forEach((v) => {
          if (v.turmas && !turmasMap.has(v.turmas.id)) {
            turmasMap.set(v.turmas.id, v.turmas);
          }
        });

        const profTurmas = Array.from(turmasMap.values());
        setTurmas(profTurmas);

        if (profTurmas.length > 0 && (!selectedTurma || !profTurmas.some((t) => t.id === selectedTurma))) {
          setParams({ turma: profTurmas[0].id, unidade: String(selectedUnidade) }, { replace: true });
        }
      } catch (err) {
        console.error("Erro ao carregar turmas:", err);
        setTurmas([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [professor?.id]);

  // Carrega Alunos e Notas
  useEffect(() => {
    if (!professor?.id || !selectedTurma) {
      setAlunos([]);
      setDraft({});
      return;
    }

    (async () => {
      setLoading(true);
      setError("");
      try {
        const alunosList = await getAlunosByTurma(selectedTurma);
        const notasList = await getNotasByProfessorAndTurma(
          professor.id,
          selectedTurma,
          selectedUnidade
        );

        const notaByAluno = new Map<string, Nota>();
        for (const n of notasList) notaByAluno.set(n.aluno_id, n);

        const merged: AlunoComNota[] = alunosList.map((a) => ({
          ...a,
          nota: notaByAluno.get(a.id) ?? null,
        }));
        setAlunos(merged);

        const newDraft: Record<string, DraftAluno> = {};
        for (const a of merged) {
          newDraft[a.id] = {
            n1: a.nota?.nota_1 != null ? String(a.nota.nota_1) : "",
            n2: a.nota?.nota_2 != null ? String(a.nota.nota_2) : "",
            n3: a.nota?.nota_3 != null ? String(a.nota.nota_3) : "",
            faltas: a.nota?.faltas != null ? String(a.nota.faltas) : "0",
            observacao: a.nota?.observacao ?? a.observacao ?? "",
            notaId: a.nota?.id,
            isDirty: false,
          };
        }
        setDraft(newDraft);
      } catch (err) {
        console.error("Erro ao carregar alunos e notas:", err);
        setError("Erro ao carregar os dados dos alunos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [professor?.id, selectedTurma, selectedUnidade]);

  // Atualização de Notas
  const updateDraftNote = (alunoId: string, field: "n1" | "n2" | "n3", rawValue: string) => {
    const value = rawValue.replace(",", ".");
    if (value !== "" && !/^\d{0,2}(\.\d{0,2})?$/.test(value)) return;
    if (value !== "" && Number(value) > 10) return;

    setDraft((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [field]: value,
        isDirty: true,
      },
    }));
  };

  // Atualização de Faltas
  const updateFaltas = (alunoId: string, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setDraft((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        faltas: value,
        isDirty: true,
      },
    }));
  };

  // Atualização de Observação
  const updateObservacao = (alunoId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        observacao: value,
        isDirty: true,
      },
    }));
  };

  // Média em tempo real
  const mediaOf = (alunoId: string): number | null => {
    const d = draft[alunoId];
    if (!d) return null;
    return calculateMedia([
      d.n1 === "" ? null : Number(d.n1),
      d.n2 === "" ? null : Number(d.n2),
      d.n3 === "" ? null : Number(d.n3),
    ]);
  };

  // Salvamento em Lote
  const handleSaveAll = async () => {
    if (!professor?.id || !selectedTurma || savingAll) return;

    if (!selectedDisciplinaId) {
      setError("Não foi encontrada nenhuma disciplina vinculada a esta turma.");
      return;
    }

    setSavingAll(true);
    setError("");

    try {
      const promises = Object.entries(draft).map(async ([alunoId, d]) => {
        if (!d.isDirty) return;

        const result = await saveProfessorNote({
          alunoId,
          professorId: professor.id,
          turmaId: selectedTurma,
          disciplinaId: selectedDisciplinaId,
          unidade: selectedUnidade,
          nota1: d.n1 === "" ? null : Number(d.n1),
          nota2: d.n2 === "" ? null : Number(d.n2),
          nota3: d.n3 === "" ? null : Number(d.n3),
          faltas: d.faltas === "" ? 0 : Number(d.faltas),
          observacao: d.observacao ?? null,
        } as any);

        return { alunoId, notaId: result?.notaId };
      });

      const results = await Promise.all(promises);

      setDraft((prev) => {
        const next = { ...prev };
        for (const res of results) {
          if (res?.alunoId && next[res.alunoId]) {
            next[res.alunoId] = {
              ...next[res.alunoId],
              notaId: res.notaId ?? next[res.alunoId].notaId,
              isDirty: false,
            };
          }
        }
        return next;
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingAll(false);
    }
  };

  const currentTurma = useMemo(
    () => turmas.find((t) => t.id === selectedTurma),
    [turmas, selectedTurma]
  );

  return (
    <AppLayout navItems={navItems} brandLabel="EduGrade" brandSub="Área do Professor">
      <PageHeader
        title="Planilha de Notas e Faltas"
        description="Gerencie as avaliações estilo planilha por Unidade e salve todas as alterações de uma só vez."
        action={
          <Button
            onClick={handleSaveAll}
            disabled={savingAll || !hasChanges}
            className={savedSuccess ? "bg-emerald-600 hover:bg-emerald-500" : ""}
          >
            {savingAll ? (
              <Loader2 size={16} className="animate-spin" />
            ) : savedSuccess ? (
              <CheckCircle2 size={16} />
            ) : (
              <Save size={16} />
            )}
            {savingAll ? "Salvando..." : savedSuccess ? "Salvo com sucesso!" : "Salvar Alterações"}
          </Button>
        }
      />

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      {/* Seletores de Turma e Unidade */}
      <div className="mb-6 space-y-4">
        {/* Turmas */}
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selecione a Turma:
          </span>
          <div className="flex flex-wrap gap-2">
            {turmas.length === 0 ? (
              <span className="text-xs text-slate-500">Nenhuma turma encontrada.</span>
            ) : (
              turmas.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setParams({ turma: t.id, unidade: String(selectedUnidade) })}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all ${
                    selectedTurma === t.id
                      ? "border-sky-500/50 bg-sky-500/15 text-sky-300 shadow-sm"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                  }`}
                >
                  <School size={14} />
                  {t.nome}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Unidades */}
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selecione a Unidade Letiva:
          </span>
          <div className="flex flex-wrap gap-2">
            {UNIDADES.map((u) => (
              <button
                key={u.id}
                onClick={() => setParams({ turma: selectedTurma, unidade: String(u.id) })}
                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  selectedUnidade === u.id
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:bg-slate-800/40"
                }`}
              >
                <Layers size={13} />
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {currentTurma && (
        <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Turma: <span className="font-semibold text-white">{currentTurma.nome}</span> · Ano {currentTurma.ano_letivo} · <span className="text-amber-400 font-medium">{selectedUnidade}ª Unidade</span>
          </p>
          {hasChanges && (
            <span className="animate-pulse text-xs font-medium text-amber-300">
              ● Alterações pendentes de salvamento
            </span>
          )}
        </div>
      )}

      {/* Planilha de Notas */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          ) : alunos.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Nenhum aluno cadastrado nesta turma.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/90 text-left text-slate-300 border-b border-slate-800">
                    <th className="px-4 py-3.5 font-medium border-r border-slate-800/60 min-w-[200px]">
                      Aluno
                    </th>

                    {(["n1", "n2", "n3"] as const).map((col) => (
                      <th key={col} className="px-3 py-3 font-medium text-center border-r border-slate-800/60 w-32">
                        <div className="flex items-center justify-center gap-1.5">
                          {editingHeader === col ? (
                            <input
                              type="text"
                              autoFocus
                              value={columnNames[col]}
                              onBlur={() => setEditingHeader(null)}
                              onChange={(e) =>
                                setColumnNames((prev) => ({ ...prev, [col]: e.target.value }))
                              }
                              className="w-24 rounded border border-sky-400 bg-slate-900 px-1 py-0.5 text-center text-xs text-sky-200 outline-none"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingHeader(col)}
                              className="cursor-pointer hover:text-sky-300 transition-colors"
                              title="Clique para renomear"
                            >
                              {columnNames[col]}
                            </span>
                          )}
                          <Edit2
                            size={11}
                            className="text-slate-500 cursor-pointer hover:text-sky-400"
                            onClick={() => setEditingHeader(col)}
                          />
                        </div>
                      </th>
                    ))}

                    <th className="px-3 py-3 font-medium text-center border-r border-slate-800/60 w-24">
                      Média
                    </th>
                    <th className="px-3 py-3 font-medium text-center border-r border-slate-800/60 w-24">
                      Faltas
                    </th>
                    <th className="px-4 py-3 font-medium">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {alunos.map((a) => {
                    const media = mediaOf(a.id);
                    const faltasCount = Number(draft[a.id]?.faltas ?? 0);
                    const isDirty = draft[a.id]?.isDirty;

                    const mediaColor =
                      faltasCount > 25
                        ? "text-rose-400 font-bold"
                        : media === null
                        ? "text-slate-500"
                        : media >= 7
                        ? "text-emerald-300 font-bold"
                        : media >= 5
                        ? "text-amber-300 font-semibold"
                        : "text-rose-300 font-semibold";

                    return (
                      <tr
                        key={a.id}
                        className={`transition-colors ${
                          isDirty ? "bg-amber-500/5 hover:bg-amber-500/10" : "bg-slate-900/30 hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="px-4 py-2.5 border-r border-slate-800/60">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">{a.nome}</p>
                              <p className="text-xs text-slate-500">{a.matricula}</p>
                            </div>
                            {isDirty && <span className="h-2 w-2 rounded-full bg-amber-400" title="Pendente de salvamento" />}
                          </div>
                        </td>

                        {(["n1", "n2", "n3"] as const).map((field) => (
                          <td key={field} className="px-2 py-2 text-center border-r border-slate-800/60">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draft[a.id]?.[field] ?? ""}
                              onChange={(e) => updateDraftNote(a.id, field, e.target.value)}
                              placeholder="—"
                              className="h-9 w-full rounded-md border border-slate-700/80 bg-slate-800/50 text-center font-mono text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
                            />
                          </td>
                        ))}

                        <td className={`px-3 py-2 text-center border-r border-slate-800/60 font-mono ${mediaColor}`}>
                          {media !== null ? media.toFixed(1) : "—"}
                        </td>

                        <td className="px-2 py-2 text-center border-r border-slate-800/60">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draft[a.id]?.faltas ?? "0"}
                            onChange={(e) => updateFaltas(a.id, e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-700/80 bg-slate-800/50 text-center font-mono text-slate-100 focus:border-sky-400 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={draft[a.id]?.observacao ?? ""}
                            onChange={(e) => updateObservacao(a.id, e.target.value)}
                            placeholder="Observação rápida..."
                            className="h-9 w-full rounded-md border border-slate-700/80 bg-slate-800/50 px-3 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-400 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-400"
                          />
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