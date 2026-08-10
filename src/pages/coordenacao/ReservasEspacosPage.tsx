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
  };
  turma?: {
    nome: string;
  } | null;
}

const tiposEspaco = [
  { value: "todos", label: "Todos" },
  { value: "laboratorio", label: "Laboratórios" },
  { value: "esportivo", label: "Esportivos" },
  { value: "auditorio", label: "Auditório" },
];

export default function ReservasEspacosPage() {
  const { user } = useAuth();

  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");

  const [dataSelecionada, setDataSelecionada] =
    useState(
      new Date().toISOString().split("T")[0]
    );

  const [modalAberto, setModalAberto] =
    useState(false);

  const [espacoSelecionado, setEspacoSelecionado] =
    useState<Espaco | null>(null);

  const [form, setForm] = useState({
    data: dataSelecionada,
    hora_inicio: "",
    hora_fim: "",
    finalidade: "",
    turma_id: "",
  });

  useEffect(() => {
    if (user?.id) {
      carregarDados();
    }
  }, [user?.id]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      data: dataSelecionada,
    }));
  }, [dataSelecionada]);

  async function carregarDados() {
    try {
      setLoading(true);

      const [
        { data: espacosData, error: espacosError },
        { data: turmasData, error: turmasError },
        { data: reservasData, error: reservasError },
      ] = await Promise.all([
        supabase
          .from("espacos")
          .select("*")
          .eq("ativo", true)
          .order("nome"),

        supabase
          .from("turmas")
          .select(
            "id, nome, curso, serie, ano"
          )
          .order("nome"),

        supabase
          .from("reservas")
          .select(`
            *,
            espaco:espacos(nome),
            turma:turmas(nome)
          `)
          .order("data")
          .order("hora_inicio"),
      ]);

      if (espacosError) throw espacosError;
      if (turmasError) throw turmasError;
      if (reservasError) throw reservasError;

      setEspacos(espacosData || []);
      setTurmas(turmasData || []);
      setReservas(reservasData || []);
    } catch (error) {
      console.error(
        "Erro ao carregar dados:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const espacosFiltrados = useMemo(() => {
    return espacos.filter((espaco) => {
      const correspondeBusca =
        espaco.nome
          .toLowerCase()
          .includes(busca.toLowerCase());

      const correspondeTipo =
        tipoFiltro === "todos" ||
        espaco.tipo === tipoFiltro;

      return (
        correspondeBusca &&
        correspondeTipo
      );
    });
  }, [espacos, busca, tipoFiltro]);

  const reservasDoDia = useMemo(() => {
    return reservas
      .filter(
        (reserva) =>
          reserva.data === dataSelecionada &&
          reserva.status !== "cancelada"
      )
      .sort((a, b) =>
        a.hora_inicio.localeCompare(
          b.hora_inicio
        )
      );
  }, [reservas, dataSelecionada]);

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

  function fecharModal() {
    if (saving) return;

    setModalAberto(false);
    setEspacoSelecionado(null);
  }
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

  async function criarReserva() {
    if (!user?.id || !espacoSelecionado) {
      alert("Usuário não identificado.");
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

    if (
      form.hora_inicio >= form.hora_fim
    ) {
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
          usuario_id: user.id,
          turma_id:
            form.turma_id || null,
          data: form.data,
          hora_inicio:
            form.hora_inicio,
          hora_fim:
            form.hora_fim,
          finalidade:
            form.finalidade.trim(),
          status: "confirmada",
        });

      if (error) throw error;

      alert(
        "Reserva realizada com sucesso!"
      );

      fecharModal();
      await carregarDados();
    } catch (error) {
      console.error(error);
      alert(
        "Não foi possível realizar a reserva."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelarReserva(
    reservaId: string
  ) {
    if (
      !window.confirm(
        "Deseja cancelar esta reserva?"
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("reservas")
        .update({
          status: "cancelada",
        })
        .eq("id", reservaId);

      if (error) throw error;

      await carregarDados();
    } catch (error) {
      console.error(error);

      alert(
        "Não foi possível cancelar a reserva."
      );
    }
  }

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

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reserva de Espaços
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gerencie as reservas dos espaços da instituição.
          </p>
        </div>

        {/* FILTROS */}
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tiposEspaco.map((tipo) => (
              <button
                key={tipo.value}
                onClick={() =>
                  setTipoFiltro(tipo.value)
                }
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  tipoFiltro === tipo.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {tipo.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTEÚDO */}
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-blue-600"
            />
          </div>
        ) : (
          <>
            {/* ESPAÇOS */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Espaços disponíveis
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecione um espaço para realizar uma reserva.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {espacosFiltrados.map(
                  (espaco) => (
                    <div
                      key={espaco.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-start gap-3">

                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-700">
                          {obterIcone(
                            espaco.tipo
                          )}
                        </div>

                        <div>
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
                          {espaco.descricao}
                        </p>
                      )}

                      <div className="mt-4 flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {espaco.capacidade && (
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {espaco.capacidade}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <CalendarDays size={14} />
                          {new Date(
                            dataSelecionada +
                              "T00:00:00"
                          ).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          abrirModal(espaco)
                        }
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Plus size={17} />
                        Reservar espaço
                      </button>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* RESERVAS */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Reservas do dia
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date(
                    dataSelecionada +
                      "T00:00:00"
                  ).toLocaleDateString(
                    "pt-BR"
                  )}
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">

                {reservasDoDia.length === 0 ? (
                  <div className="p-10 text-center">
                    <CalendarDays
                      size={40}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm text-slate-500">
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
                            <Clock size={20} />
                          </div>

                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {reserva.espaco?.nome}
                            </h3>

                            <p className="text-sm font-medium text-blue-600">
                              {reserva.hora_inicio}
                              {" — "}
                              {reserva.hora_fim}
                            </p>

                            {reserva.turma && (
                              <p className="mt-1 text-sm text-slate-500">
                                Turma:{" "}
                                {reserva.turma.nome}
                              </p>
                            )}

                            <p className="mt-1 text-sm text-slate-500">
                              {reserva.finalidade}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            cancelarReserva(
                              reserva.id
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Cancelar
                        </button>
                      </div>
                    )
                  )
                )}

              </div>
            </section>
          </>
        )}

        {/* MODAL */}
        {modalAberto &&
          espacoSelecionado && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

              <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">

                <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">

                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Nova reserva
                    </h2>

                    <p className="text-sm text-slate-500">
                      {espacoSelecionado.nome}
                    </p>
                  </div>

                  <button
                    onClick={fecharModal}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 p-5">

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Data *
                    </label>

                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          data: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border px-3 py-2.5 dark:bg-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
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
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border px-3 py-2.5 dark:bg-slate-700"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Término *
                      </label>

                      <input
                        type="time"
                        value={form.hora_fim}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            hora_fim:
                              e.target.value,
                          })
                        }
                        className="w-full rounded-xl border px-3 py-2.5 dark:bg-slate-700"
                      />
                    </div>

                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Turma
                    </label>

                    <select
                      value={form.turma_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          turma_id:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border bg-white px-3 py-2.5 dark:bg-slate-700"
                    >
                      <option value="">
                        Sem turma específica
                      </option>

                      {turmas.map(
                        (turma) => (
                          <option
                            key={turma.id}
                            value={turma.id}
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
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
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
                            e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Ex.: Aula prática de programação"
                      className="w-full resize-none rounded-xl border px-3 py-2.5 dark:bg-slate-700"
                    />
                  </div>

                </div>

                <div className="flex gap-3 border-t p-5">

                  <button
                    onClick={fecharModal}
                    disabled={saving}
                    className="flex-1 rounded-xl border px-4 py-2.5 font-semibold"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={criarReserva}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
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