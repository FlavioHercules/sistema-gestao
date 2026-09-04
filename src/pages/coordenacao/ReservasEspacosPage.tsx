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
  GraduationCap,
  UserCheck,
  BookOpen,
  ClipboardList,
  BellRing,
  Shield,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { coordenacaoNavItems } from "../../lib/navigation";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/AuthContext";

type TipoEspaco = "laboratorio" | "esportivo" | "auditorio" | "outro";

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
  espaco?: { nome: string } | null;
  turma?: { nome: string } | null;
}

const tiposEspaco = [
  { value: "todos", label: "Todos" },
  { value: "laboratorio", label: "Laboratórios" },
  { value: "esportivo", label: "Esportivos" },
  { value: "auditorio", label: "Auditório" },
  { value: "outro", label: "Outros" },
];

function hoje() {
  return new Date().toISOString().split("T")[0];
}

export default function ReservasEspacosPage() {
  const { usuario } = useAuth();

  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [dataSelecionada, setDataSelecionada] = useState(hoje());

  const [modalAberto, setModalAberto] = useState(false);
  const [espacoSelecionado, setEspacoSelecionado] =
    useState<Espaco | null>(null);

  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [salvandoEspaco, setSalvandoEspaco] = useState(false);
  const [novoEspaco, setNovoEspaco] = useState({
    nome: "",
    tipo: "laboratorio" as TipoEspaco,
    capacidade: "",
    descricao: "",
  });

  const [form, setForm] = useState({
    data: hoje(),
    hora_inicio: "",
    hora_fim: "",
    finalidade: "",
    turma_id: "",
  });

  useEffect(() => {
    if (usuario?.id) {
      void carregarDados();
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

      const [espacosResult, turmasResult, reservasResult] =
        await Promise.all([
          supabase
            .from("espacos")
            .select("*")
            .eq("ativo", true)
            .order("nome"),

          supabase
            .from("turmas")
            .select("id, nome, curso, serie, ano")
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

      if (espacosResult.error) throw espacosResult.error;
      if (turmasResult.error) throw turmasResult.error;
      if (reservasResult.error) throw reservasResult.error;

      setEspacos((espacosResult.data as Espaco[]) ?? []);
      setTurmas((turmasResult.data as Turma[]) ?? []);
      setReservas((reservasResult.data as Reserva[]) ?? []);
    } catch (error) {
      console.error("Erro ao carregar reservas:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao carregar os dados."
      );
    } finally {
      setLoading(false);
    }
  }

  const espacosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return espacos.filter((espaco) => {
      const buscaOk =
        !termo ||
        espaco.nome.toLowerCase().includes(termo) ||
        (espaco.descricao ?? "").toLowerCase().includes(termo);

      const tipoOk =
        tipoFiltro === "todos" || espaco.tipo === tipoFiltro;

      return buscaOk && tipoOk;
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
        a.hora_inicio.localeCompare(b.hora_inicio)
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
    data: string,
    inicio: string,
    fim: string
  ) {
    const { data: encontrados, error } = await supabase
      .from("reservas")
      .select("id")
      .eq("espaco_id", espacoId)
      .eq("data", data)
      .neq("status", "cancelada")
      .lt("hora_inicio", fim)
      .gt("hora_fim", inicio);

    if (error) throw error;

    return (encontrados?.length ?? 0) > 0;
  }

  async function criarReserva() {
    if (!usuario?.id) {
      alert("Usuário não identificado.");
      return;
    }

    if (!espacoSelecionado) {
      alert("Espaço não selecionado.");
      return;
    }

    if (
      !form.data ||
      !form.hora_inicio ||
      !form.hora_fim ||
      !form.finalidade.trim()
    ) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (form.hora_inicio >= form.hora_fim) {
      alert("O horário de término deve ser depois do início.");
      return;
    }

    try {
      setSaving(true);

      const conflito = await verificarConflito(
        espacoSelecionado.id,
        form.data,
        form.hora_inicio,
        form.hora_fim
      );

      if (conflito) {
        alert("Esse espaço já está reservado nesse horário.");
        return;
      }

      const { error } = await supabase.from("reservas").insert({
        espaco_id: espacoSelecionado.id,
        usuario_id: usuario.id,
        turma_id: form.turma_id || null,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        finalidade: form.finalidade.trim(),
        status: "confirmada",
      });

      if (error) throw error;

      alert("Reserva realizada com sucesso!");

      fecharModal();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao criar reserva:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a reserva."
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelarReserva(id: string) {
    if (!window.confirm("Deseja cancelar esta reserva?")) return;

    try {
      const { error } = await supabase
        .from("reservas")
        .update({ status: "cancelada" })
        .eq("id", id);

      if (error) throw error;

      await carregarDados();
    } catch (error) {
      console.error("Erro ao cancelar reserva:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar a reserva."
      );
    }
  }

  function abrirCadastroEspaco() {
    setNovoEspaco({
      nome: "",
      tipo: "laboratorio",
      capacidade: "",
      descricao: "",
    });
    setModalCadastroAberto(true);
  }

  function fecharCadastroEspaco() {
    if (salvandoEspaco) return;
    setModalCadastroAberto(false);
  }

  async function cadastrarEspaco() {
    const nome = novoEspaco.nome.trim();
    const capacidadeTexto = novoEspaco.capacidade.trim();

    if (!nome) {
      alert("Informe o nome do espaço.");
      return;
    }

    if (capacidadeTexto && (!/^\d+$/.test(capacidadeTexto) || Number(capacidadeTexto) < 1)) {
  alert("A capacidade deve ser um número inteiro maior que zero.");
  return;
}

    try {
      setSalvandoEspaco(true);

      const { error } = await supabase.from("espacos").insert({
        nome,
        tipo: novoEspaco.tipo,
        capacidade: capacidadeTexto ? Number(capacidadeTexto) : null,
        descricao: novoEspaco.descricao.trim() || null,
        ativo: true,
      });

      if (error) throw error;

      alert("Espaço cadastrado com sucesso!");
      setModalCadastroAberto(false);
      await carregarDados();
    } catch (error) {
      console.error("Erro ao cadastrar espaço:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o espaço."
      );
    } finally {
      setSalvandoEspaco(false);
    }
  }

  function obterIcone(tipo: TipoEspaco) {
    if (tipo === "laboratorio") return "💻";
    if (tipo === "esportivo") return "🏟️";
    if (tipo === "auditorio") return "🎤";
    return "🏫";
  }

  function obterTipo(tipo: TipoEspaco) {
    if (tipo === "laboratorio") return "Laboratório";
    if (tipo === "esportivo") return "Esportivo";
    if (tipo === "auditorio") return "Auditório";
    return "Outro";
  }

  function formatarData(data: string) {
    return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
  }

  return (
    <AppLayout navItems={coordenacaoNavItems}>
      <div className="space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Reserva de Espaços
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Gerencie as reservas dos espaços da instituição.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirCadastroEspaco}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus size={17} />
            Cadastrar espaço
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar espaço..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-slate-400" />

              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tiposEspaco.map((tipo) => (
              <button
                key={tipo.value}
                type="button"
                onClick={() => setTipoFiltro(tipo.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  tipoFiltro === tipo.value
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {tipo.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2
              size={32}
              className="animate-spin text-sky-500"
            />
          </div>
        ) : (
          <>
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Espaços disponíveis
                </h2>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecione um espaço para realizar uma reserva.
                </p>
              </div>

              {espacosFiltrados.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                  <CalendarDays
                    size={40}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Nenhum espaço encontrado.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {espacosFiltrados.map((espaco) => (
                    <div
                      key={espaco.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-2xl">
                          {obterIcone(espaco.tipo)}
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {espaco.nome}
                          </h3>

                          <p className="text-xs text-slate-500">
                            {obterTipo(espaco.tipo)}
                          </p>
                        </div>
                      </div>

                      {espaco.descricao && (
                        <p className="mt-4 text-sm text-slate-500">
                          {espaco.descricao}
                        </p>
                      )}

                      <div className="mt-4 flex gap-3 text-xs text-slate-500">
                        {espaco.capacidade !== null && (
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {espaco.capacidade} pessoas
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <CalendarDays size={14} />
                          {formatarData(dataSelecionada)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirModal(espaco)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        <Plus size={17} />
                        Reservar espaço
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="border-b border-slate-200 p-5 dark:border-slate-700">
                <h2 className="font-bold text-slate-900 dark:text-white">
                  Reservas do dia
                </h2>

                <p className="text-sm text-slate-500">
                  {formatarData(dataSelecionada)}
                </p>
              </div>

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
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reservasDoDia.map((reserva) => (
                    <div
                      key={reserva.id}
                      className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex gap-4">
                        <div className="rounded-xl bg-sky-50 p-3 text-sky-600">
                          <Clock size={20} />
                        </div>

                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {reserva.espaco?.nome ?? "Espaço"}
                          </h3>

                          <p className="font-medium text-sky-600">
                            {reserva.hora_inicio} — {reserva.hora_fim}
                          </p>

                          {reserva.turma && (
                            <p className="text-sm text-slate-500">
                              Turma: {reserva.turma.nome}
                            </p>
                          )}

                          <p className="text-sm text-slate-500">
                            {reserva.finalidade}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => cancelarReserva(reserva.id)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {modalCadastroAberto && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">
              <div className="flex items-center justify-between border-b p-5 dark:border-slate-700">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Cadastrar novo espaço
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Adicione um novo local para ficar disponível nas reservas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharCadastroEspaco}
                  disabled={salvandoEspaco}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nome do espaço *
                  </label>
                  <input
                    value={novoEspaco.nome}
                    onChange={(e) =>
                      setNovoEspaco({ ...novoEspaco, nome: e.target.value })
                    }
                    placeholder="Ex.: Laboratório de Informática 3"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    disabled={salvandoEspaco}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tipo *
                  </label>
                  <select
                    value={novoEspaco.tipo}
                    onChange={(e) =>
                      setNovoEspaco({
                        ...novoEspaco,
                        tipo: e.target.value as TipoEspaco,
                      })
                    }
                    disabled={salvandoEspaco}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="laboratorio">Laboratório</option>
                    <option value="esportivo">Esportivo</option>
                    <option value="auditorio">Auditório</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Capacidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={novoEspaco.capacidade}
                    onChange={(e) =>
                      setNovoEspaco({
                        ...novoEspaco,
                        capacidade: e.target.value,
                      })
                    }
                    placeholder="Ex.: 40"
                    disabled={salvandoEspaco}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Descrição
                  </label>
                  <textarea
                    value={novoEspaco.descricao}
                    onChange={(e) =>
                      setNovoEspaco({
                        ...novoEspaco,
                        descricao: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Ex.: Laboratório com computadores e projetor."
                    disabled={salvandoEspaco}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t p-5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={fecharCadastroEspaco}
                  disabled={salvandoEspaco}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={cadastrarEspaco}
                  disabled={salvandoEspaco}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {salvandoEspaco ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Cadastrando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Plus size={16} />
                      Cadastrar espaço
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalAberto && espacoSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800">

              <div className="flex items-center justify-between border-b p-5 dark:border-slate-700">
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    Nova reserva
                  </h2>

                  <p className="text-sm text-slate-500">
                    {espacoSelecionado.nome}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={saving}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Data *
                  </label>

                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) =>
                      setForm({ ...form, data: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Início *
                    </label>

                    <input
                      type="time"
                      value={form.hora_inicio}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          hora_inicio: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Término *
                    </label>

                    <input
                      type="time"
                      value={form.hora_fim}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          hora_fim: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Turma
                  </label>

                  <select
                    value={form.turma_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        turma_id: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">
                      Sem turma específica
                    </option>

                    {turmas.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.nome}
                        {turma.serie ? ` - ${turma.serie}` : ""}
                        {turma.curso ? ` - ${turma.curso}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Finalidade *
                  </label>

                  <textarea
                    value={form.finalidade}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        finalidade: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Ex.: Aula prática de programação"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t p-5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={criarReserva}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
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