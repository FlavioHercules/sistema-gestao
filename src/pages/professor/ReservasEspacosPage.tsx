import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Plus,
  Search,
  Users,
  X,
  Trash2,
  Loader2,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { professorNavItems } from "../../lib/navigation";

type TipoEspaco =
  | "laboratorio"
  | "esportivo"
  | "auditorio"
  | "outro";

interface Espaco {
  id: string;
  nome: string;
  tipo: TipoEspaco;
  capacidade: number | null;
  descricao: string | null;
  ativo: boolean;
}

interface Turma {
  id: string;
  nome: string;
  curso: string | null;
  serie: string | null;
  ano: string | null;
}

interface Reserva {
  id: string;
  espaco_id: string;
  usuario_id: string;
  turma_id: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  finalidade: string;
  status: string;
  espaco?: {
    nome: string;
  } | null;
  turma?: {
    nome: string;
  } | null;
}

const tiposEspaco = [
  {
    value: "todos",
    label: "Todos",
  },
  {
    value: "laboratorio",
    label: "Laboratórios",
  },
  {
    value: "esportivo",
    label: "Esportivos",
  },
  {
    value: "auditorio",
    label: "Auditório",
  },
];

export default function ReservasEspacosPage() {
  const { usuario } = useAuth();

  // =====================================================
  // DADOS
  // =====================================================

  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  // =====================================================
  // ESTADOS
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  // =====================================================
  // FILTROS
  // =====================================================

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");

  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split("T")[0]
  );

  // =====================================================
  // MODAL
  // =====================================================

  const [modalAberto, setModalAberto] = useState(false);

  const [espacoSelecionado, setEspacoSelecionado] =
    useState<Espaco | null>(null);

  // =====================================================
  // FORMULÁRIO
  // =====================================================

  const [form, setForm] = useState({
    data: dataSelecionada,
    hora_inicio: "",
    hora_fim: "",
    finalidade: "",
    turma_id: "",
  });

  // =====================================================
  // CARREGAR DADOS
  // =====================================================

  useEffect(() => {
    if (usuario?.id) {
      carregarDados();
    }
  }, [usuario?.id]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      data: dataSelecionada,
    }));
  }, [dataSelecionada]);

  async function carregarDados() {
    try {
      setLoading(true);
      setErro("");

      console.log("=================================");
      console.log("CARREGANDO RESERVAS");
      console.log("=================================");

      // -------------------------------------------------
      // ESPAÇOS
      // -------------------------------------------------

      console.log("Buscando espaços...");

      const {
        data: espacosData,
        error: espacosError,
      } = await supabase
        .from("espacos")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      console.log("Espaços:", espacosData);
      console.log("Erro espaços:", espacosError);

      if (espacosError) {
        throw new Error(
          `Erro ao carregar espaços: ${espacosError.message}`
        );
      }

      setEspacos((espacosData as Espaco[]) || []);

      // -------------------------------------------------
      // TURMAS
      // -------------------------------------------------

      console.log("Buscando turmas...");

      /*
       * IMPORTANTE:
       * Pelo banco que você mostrou anteriormente,
       * a tabela é "turma", no singular.
       */

      const {
        data: turmasData,
        error: turmasError,
      } = await supabase
        .from("turma")
        .select("id, nome, curso, serie, ano")
        .order("nome");

      console.log("Turmas:", turmasData);
      console.log("Erro turmas:", turmasError);

      if (turmasError) {
        console.warn(
          "Não foi possível carregar as turmas:",
          turmasError.message
        );

        setTurmas([]);
      } else {
        setTurmas((turmasData as Turma[]) || []);
      }

      // -------------------------------------------------
      // RESERVAS
      // -------------------------------------------------

      console.log("Buscando reservas...");

      const {
        data: reservasData,
        error: reservasError,
      } = await supabase
        .from("reservas")
        .select("*")
        .order("data")
        .order("hora_inicio");

      console.log("Reservas:", reservasData);
      console.log("Erro reservas:", reservasError);

      if (reservasError) {
        throw new Error(
          `Erro ao carregar reservas: ${reservasError.message}`
        );
      }

      // -------------------------------------------------
      // MONTAR RELACIONAMENTOS MANUALMENTE
      // -------------------------------------------------

      type ReservaBruta = Omit<Reserva, "espaco" | "turma"> & {
        espaco_id?: string | null;
        turma_id?: string | null;
      };

      const reservasBrutas = (reservasData ?? []) as ReservaBruta[];

      const reservasCompletas: Reserva[] =
        reservasBrutas.map((reserva) => {
          const espaco = (espacosData ?? []).find(
            (item) =>
              item.id === reserva.espaco_id
          );

          const turma = (turmasData ?? []).find(
            (item) =>
              item.id === reserva.turma_id
          );

          return {
            ...reserva,
            espaco: espaco
              ? {
                  nome: espaco.nome,
                }
              : null,
            turma: turma
              ? {
                  nome: turma.nome,
                }
              : null,
          };
        });

      setReservas(reservasCompletas);

      console.log("=================================");
      console.log("DADOS CARREGADOS COM SUCESSO");
      console.log("Espaços:", espacosData?.length || 0);
      console.log("Turmas:", turmasData?.length || 0);
      console.log(
        "Reservas:",
        reservasCompletas.length
      );
      console.log("=================================");
    } catch (error: unknown) {
      console.error(
        "ERRO AO CARREGAR DADOS:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FILTRAR ESPAÇOS
  // =====================================================

  const espacosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return espacos.filter((espaco) => {
      const correspondeBusca =
        !termo ||
        espaco.nome
          .toLowerCase()
          .includes(termo);

      const correspondeTipo =
        tipoFiltro === "todos" ||
        espaco.tipo === tipoFiltro;

      return (
        correspondeBusca &&
        correspondeTipo
      );
    });
  }, [espacos, busca, tipoFiltro]);

  // =====================================================
  // RESERVAS DO DIA
  // =====================================================

  const reservasDoDia = useMemo(() => {
    return reservas
      .filter((reserva) => {
        const dataReserva = reserva.data.includes("T")
          ? reserva.data.split("T")[0]
          : reserva.data;

        return (
          dataReserva === dataSelecionada &&
          reserva.status !== "cancelada"
        );
      })
      .sort((a, b) =>
        a.hora_inicio.localeCompare(
          b.hora_inicio
        )
      );
  }, [reservas, dataSelecionada]);

  // =====================================================
  // ABRIR MODAL
  // =====================================================

  function abrirModal(espaco: Espaco) {
    setEspacoSelecionado(espaco);

    setForm({
      data: dataSelecionada,
      hora_inicio: "",
      hora_fim: "",
      finalidade: "",
      turma_id: "",
    });

    setModalAberto(true);
  }

  // =====================================================
  // FECHAR MODAL
  // =====================================================

  function fecharModal() {
    if (saving) {
      return;
    }

    setModalAberto(false);
    setEspacoSelecionado(null);
  }

  // =====================================================
  // VERIFICAR CONFLITO
  // =====================================================

  async function verificarConflito(
    espacoId: string,
    dataReserva: string,
    horaInicio: string,
    horaFim: string
  ) {
    const {
      data: reservasEncontradas,
      error,
    } = await supabase
      .from("reservas")
      .select("id")
      .eq("espaco_id", espacoId)
      .eq("data", dataReserva)
      .neq("status", "cancelada")
      .lt("hora_inicio", horaFim)
      .gt("hora_fim", horaInicio);

    if (error) {
      throw error;
    }

    return (
      (reservasEncontradas?.length || 0) > 0
    );
  }

  // =====================================================
  // CRIAR RESERVA
  // =====================================================

  async function criarReserva() {
    if (!usuario?.id) {
      alert("Usuário não identificado.");
      return;
    }

    if (!espacoSelecionado) {
      alert("Nenhum espaço selecionado.");
      return;
    }

    if (
      !form.data ||
      !form.hora_inicio ||
      !form.hora_fim ||
      !form.finalidade.trim()
    ) {
      alert(
        "Preencha todos os campos obrigatórios."
      );
      return;
    }

    if (form.hora_inicio >= form.hora_fim) {
      alert(
        "O horário de término deve ser depois do horário de início."
      );
      return;
    }

    try {
      setSaving(true);

      const conflito =
        await verificarConflito(
          espacoSelecionado.id,
          form.data,
          form.hora_inicio,
          form.hora_fim
        );

      if (conflito) {
        alert(
          "Esse espaço já está reservado nesse horário."
        );
        return;
      }

      const { error } = await supabase
        .from("reservas")
        .insert({
          espaco_id:
            espacoSelecionado.id,
          usuario_id: usuario.id,
          turma_id:
            form.turma_id || null,
          data: form.data,
          hora_inicio:
            form.hora_inicio,
          hora_fim: form.hora_fim,
          finalidade:
            form.finalidade.trim(),
          status: "confirmada",
        });

      if (error) {
        throw error;
      }

      alert(
        "Reserva realizada com sucesso!"
      );

      setModalAberto(false);
      setEspacoSelecionado(null);

      await carregarDados();
    } catch (error: unknown) {
      console.error(
        "Erro ao criar reserva:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a reserva."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // CANCELAR RESERVA
  // =====================================================

  async function cancelarReserva(
    reservaId: string
  ) {
    const confirmar = window.confirm(
      "Deseja cancelar esta reserva?"
    );

    if (!confirmar) {
      return;
    }

    try {
      const { error } = await supabase
        .from("reservas")
        .update({
          status: "cancelada",
        })
        .eq("id", reservaId);

      if (error) {
        throw error;
      }

      await carregarDados();
    } catch (error: unknown) {
      console.error(
        "Erro ao cancelar reserva:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar a reserva."
      );
    }
  }

  // =====================================================
  // ÍCONE
  // =====================================================

  function obterIcone(
    tipo: TipoEspaco
  ) {
    switch (tipo) {
      case "laboratorio":
        return "💻";

      case "esportivo":
        return "🏟️";

      case "auditorio":
        return "🎤";

      default:
        return "🏫";
    }
  }

  // =====================================================
  // TIPO
  // =====================================================

  function obterTipo(
    tipo: TipoEspaco
  ) {
    switch (tipo) {
      case "laboratorio":
        return "Laboratório";

      case "esportivo":
        return "Esportivo";

      case "auditorio":
        return "Auditório";

      default:
        return "Outro";
    }
  }

  // =====================================================
  // DATA
  // =====================================================

  function formatarData(
    data: string
  ) {
    return new Date(
      `${data}T00:00:00`
    ).toLocaleDateString("pt-BR");
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <AppLayout
      navItems={professorNavItems}
      brandLabel="EduGrade"
      brandSub="Professor"
    >
      <div className="space-y-6">
        {/* =================================================
            HEADER
        ================================================= */}

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reserva de Espaços
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consulte e reserve os espaços disponíveis da instituição.
          </p>
        </div>

        {/* =================================================
            ERRO
        ================================================= */}

        {erro && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
            <strong>
              Erro ao carregar:
            </strong>{" "}
            {erro}

            <button
              type="button"
              onClick={carregarDados}
              className="ml-3 font-semibold underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* =================================================
            FILTROS
        ================================================= */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={busca}
                onChange={(e) =>
                  setBusca(e.target.value)
                }
                placeholder="Buscar espaço..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays
                size={18}
                className="text-slate-400"
              />

              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) =>
                  setDataSelecionada(
                    e.target.value
                  )
                }
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tiposEspaco.map(
              (tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() =>
                    setTipoFiltro(
                      tipo.value
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    tipoFiltro ===
                    tipo.value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {tipo.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <Loader2
              size={36}
              className="animate-spin text-blue-600"
            />

            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              Carregando espaços...
            </p>
          </div>
        ) : (
          <>
            {/* =================================================
                ESPAÇOS
            ================================================= */}

            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Espaços disponíveis
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecione um espaço para realizar uma reserva.
                </p>
              </div>

              {espacosFiltrados.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800">
                  <CalendarDays
                    size={40}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Nenhum espaço encontrado.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {espacosFiltrados.map(
                    (espaco) => (
                      <div
                        key={espaco.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-700">
                            {obterIcone(
                              espaco.tipo
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {espaco.nome}
                            </h3>

                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {obterTipo(
                                espaco.tipo
                              )}
                            </p>
                          </div>
                        </div>

                        {espaco.descricao && (
                          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                            {
                              espaco.descricao
                            }
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {espaco.capacidade !==
                            null && (
                            <span className="flex items-center gap-1">
                              <Users
                                size={14}
                              />
                              Capacidade:{" "}
                              {
                                espaco.capacidade
                              }
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <CalendarDays
                              size={14}
                            />

                            {formatarData(
                              dataSelecionada
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            abrirModal(
                              espaco
                            )
                          }
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Plus
                            size={17}
                          />
                          Reservar espaço
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* =================================================
                RESERVAS
            ================================================= */}

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Reservas do dia
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatarData(
                    dataSelecionada
                  )}
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {reservasDoDia.length ===
                0 ? (
                  <div className="p-10 text-center">
                    <CalendarDays
                      size={40}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      Nenhuma reserva para este dia.
                    </p>
                  </div>
                ) : (
                  reservasDoDia.map(
                    (reserva) => (
                      <div
                        key={reserva.id}
                        className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex gap-4">
                          <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20">
                            <Clock
                              size={20}
                            />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {reserva
                                .espaco
                                ?.nome ||
                                "Espaço"}
                            </h3>

                            <p className="text-sm font-medium text-blue-600">
                              {
                                reserva.hora_inicio
                              }{" "}
                              —{" "}
                              {
                                reserva.hora_fim
                              }
                            </p>

                            {reserva.turma && (
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Turma:{" "}
                                {
                                  reserva
                                    .turma
                                    .nome
                                }
                              </p>
                            )}

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {
                                reserva.finalidade
                              }
                            </p>
                          </div>
                        </div>

                        {reserva.usuario_id ===
                          usuario?.id && (
                          <button
                            type="button"
                            onClick={() =>
                              cancelarReserva(
                                reserva.id
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                          >
                            <Trash2
                              size={16}
                            />
                            Cancelar
                          </button>
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            </section>
          </>
        )}

        {/* =================================================
            MODAL
        ================================================= */}

        {modalAberto &&
          espacoSelecionado && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
                {/* HEADER */}

                <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Nova reserva
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {
                        espacoSelecionado.nome
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      fecharModal
                    }
                    disabled={saving}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-700"
                    aria-label="Fechar modal"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* FORM */}

                <div className="space-y-4 p-5">
                  {/* DATA */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Data *
                    </label>

                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          data: e.target
                            .value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  {/* HORÁRIOS */}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Início *
                      </label>

                      <input
                        type="time"
                        value={
                          form.hora_inicio
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            hora_inicio:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Término *
                      </label>

                      <input
                        type="time"
                        value={
                          form.hora_fim
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            hora_fim:
                              e.target
                                .value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* TURMA */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Turma
                    </label>

                    <select
                      value={
                        form.turma_id
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          turma_id:
                            e.target
                              .value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">
                        Sem turma específica
                      </option>

                      {turmas.map(
                        (turma) => (
                          <option
                            key={
                              turma.id
                            }
                            value={
                              turma.id
                            }
                          >
                            {turma.nome}

                            {turma.serie
                              ? ` - ${turma.serie}`
                              : ""}

                            {turma.curso
                              ? ` - ${turma.curso}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {turmas.length ===
                      0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        Nenhuma turma disponível.
                      </p>
                    )}
                  </div>

                  {/* FINALIDADE */}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Finalidade *
                    </label>

                    <textarea
                      value={
                        form.finalidade
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          finalidade:
                            e.target
                              .value,
                        })
                      }
                      rows={3}
                      placeholder="Ex.: Aula prática de programação"
                      className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* FOOTER */}

                <div className="flex gap-3 border-t border-slate-200 p-5 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={
                      fecharModal
                    }
                    disabled={saving}
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={
                      criarReserva
                    }
                    disabled={saving}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                        Salvando...
                      </span>
                    ) : (
                      "Confirmar reserva"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </AppLayout>
  );
}