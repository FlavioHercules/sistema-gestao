import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { AppLayout } from "../components/layout/AppLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { coordenacaoNavItems } from "../lib/navigation";
import type { NavItem } from "../lib/navigation";

interface Equipamento {
  id: string;
  nome: string;
  tipo: string;
  quantidade: number;
  descricao: string | null;
  ativo: boolean;
}

interface ReservaEquipamento {
  id: string;
  equipamento_id: string;
  usuario_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  quantidade: number;
  finalidade: string;
  status: string;
  equipamento?: { nome: string } | null;
}

const hoje = () => new Date().toISOString().split("T")[0];

interface Props {
  navItems?: NavItem[];
  canManage?: boolean;
}

export default function ReservasEquipamentosPage({
  navItems = coordenacaoNavItems,
  canManage = false,
}: Props) {
  const { usuario } = useAuth();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [reservas, setReservas] = useState<ReservaEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState(hoje());
  const [selecionado, setSelecionado] = useState<Equipamento | null>(null);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [novo, setNovo] = useState({ nome: "", tipo: "Tecnologia", quantidade: "1", descricao: "" });
  const [form, setForm] = useState({ data: hoje(), hora_inicio: "", hora_fim: "", quantidade: "1", finalidade: "" });

  useEffect(() => {
    if (usuario?.id) void carregarDados();
  }, [usuario?.id]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, data: dataSelecionada }));
  }, [dataSelecionada]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [equipamentosResult, reservasResult] = await Promise.all([
        supabase.from("equipamentos").select("*").eq("ativo", true).order("nome"),
        supabase.from("reservas_equipamentos").select("*, equipamento:equipamentos(nome)").order("data").order("hora_inicio"),
      ]);
      if (equipamentosResult.error) throw equipamentosResult.error;
      if (reservasResult.error) throw reservasResult.error;
      setEquipamentos((equipamentosResult.data ?? []) as Equipamento[]);
      setReservas((reservasResult.data ?? []) as ReservaEquipamento[]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível carregar os equipamentos.");
    } finally {
      setLoading(false);
    }
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return equipamentos.filter((equipamento) =>
      !termo || equipamento.nome.toLowerCase().includes(termo) || equipamento.tipo.toLowerCase().includes(termo)
    );
  }, [equipamentos, busca]);

  const reservasDoDia = useMemo(() => reservas.filter((reserva) => reserva.data === dataSelecionada && reserva.status !== "cancelada"), [reservas, dataSelecionada]);

  function abrirReserva(equipamento: Equipamento) {
    setSelecionado(equipamento);
    setForm({ data: dataSelecionada, hora_inicio: "", hora_fim: "", quantidade: "1", finalidade: "" });
  }

  async function criarReserva() {
    if (!usuario?.id || !selecionado || !form.data || !form.hora_inicio || !form.hora_fim || !form.finalidade.trim()) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    const quantidade = Number(form.quantidade);
    if (form.hora_inicio >= form.hora_fim || quantidade < 1 || quantidade > selecionado.quantidade) {
      alert("Confira o horário e a quantidade disponível.");
      return;
    }
    setSaving(true);
    try {
      const { data: conflitos, error: conflitoError } = await supabase
        .from("reservas_equipamentos")
        .select("quantidade")
        .eq("equipamento_id", selecionado.id)
        .eq("data", form.data)
        .neq("status", "cancelada")
        .lt("hora_inicio", form.hora_fim)
        .gt("hora_fim", form.hora_inicio);
      if (conflitoError) throw conflitoError;
      const reservado = (conflitos ?? []).reduce((total, item) => total + Number(item.quantidade), 0);
      if (reservado + quantidade > selecionado.quantidade) {
        alert("Não há quantidade disponível nesse horário.");
        return;
      }
      const { error } = await supabase.from("reservas_equipamentos").insert({
        equipamento_id: selecionado.id,
        usuario_id: usuario.id,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        quantidade,
        finalidade: form.finalidade.trim(),
        status: "confirmada",
      });
      if (error) throw error;
      setSelecionado(null);
      await carregarDados();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível realizar a reserva.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelarReserva(id: string) {
    if (!window.confirm("Deseja cancelar esta reserva?")) return;
    const { error } = await supabase.from("reservas_equipamentos").update({ status: "cancelada" }).eq("id", id);
    if (error) alert(error.message);
    else await carregarDados();
  }

  async function cadastrarEquipamento() {
    const quantidade = Number(novo.quantidade);
    if (!novo.nome.trim() || quantidade < 1) {
      alert("Informe o nome e uma quantidade válida.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("equipamentos").insert({ nome: novo.nome.trim(), tipo: novo.tipo.trim() || "Outro", quantidade, descricao: novo.descricao.trim() || null, ativo: true });
      if (error) throw error;
      setCadastroAberto(false);
      setNovo({ nome: "", tipo: "Tecnologia", quantidade: "1", descricao: "" });
      await carregarDados();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível cadastrar o equipamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout navItems={navItems}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reservas de Equipamentos</h1>
            <p className="mt-1 text-sm text-slate-600">Consulte a disponibilidade e reserve equipamentos da instituição.</p>
          </div>
          {canManage && <button onClick={() => setCadastroAberto(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><Plus size={17} />Cadastrar equipamento</button>}
        </header>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar equipamento..." className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-sky-500" /></div>
          <div className="flex items-center gap-2"><CalendarDays size={18} className="text-slate-500" /><input type="date" value={dataSelecionada} onChange={(event) => setDataSelecionada(event.target.value)} className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900" /></div>
        </div>

        {loading ? <div className="flex min-h-[280px] items-center justify-center"><Loader2 className="animate-spin text-sky-600" size={32} /></div> : <>
          <section><h2 className="mb-4 text-lg font-bold text-slate-900">Equipamentos disponíveis</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((equipamento) => <article key={equipamento.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-sky-50 p-3 text-sky-700"><Package size={22} /></div><div><h3 className="font-bold text-slate-900">{equipamento.nome}</h3><p className="text-sm text-slate-600">{equipamento.tipo} · {equipamento.quantidade} disponível(is)</p></div></div>{equipamento.descricao && <p className="mt-4 text-sm text-slate-600">{equipamento.descricao}</p>}<button onClick={() => abrirReserva(equipamento)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><Plus size={17} />Reservar equipamento</button></article>)}
          </div></section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 p-5"><h2 className="font-bold text-slate-900">Reservas do dia</h2><p className="text-sm text-slate-600">{new Date(`${dataSelecionada}T00:00:00`).toLocaleDateString("pt-BR")}</p></div>{reservasDoDia.length === 0 ? <p className="p-8 text-center text-sm text-slate-600">Nenhuma reserva para este dia.</p> : <div className="divide-y divide-slate-200">{reservasDoDia.map((reserva) => <div key={reserva.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><Clock className="mt-1 text-sky-700" size={20} /><div><h3 className="font-bold text-slate-900">{reserva.equipamento?.nome ?? "Equipamento"} ({reserva.quantidade})</h3><p className="text-sm font-medium text-sky-700">{reserva.hora_inicio} - {reserva.hora_fim}</p><p className="text-sm text-slate-600">{reserva.finalidade}</p></div></div>{(canManage || reserva.usuario_id === usuario?.id) && <button onClick={() => cancelarReserva(reserva.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} />Cancelar</button>}</div>)}</div>}</section>
        </>}

        {selecionado && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-bold text-slate-900">Nova reserva</h2><p className="text-sm text-slate-600">{selecionado.nome}</p></div><button onClick={() => setSelecionado(null)}><X className="text-slate-500" size={20} /></button></div><div className="space-y-4 p-5"><input type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /><div className="grid grid-cols-2 gap-3"><input type="time" value={form.hora_inicio} onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /><input type="time" value={form.hora_fim} onChange={(event) => setForm({ ...form, hora_fim: event.target.value })} className="rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /></div><div className="flex items-center gap-2 text-sm text-slate-700"><Users size={17} />Quantidade<input type="number" min="1" max={selecionado.quantidade} value={form.quantidade} onChange={(event) => setForm({ ...form, quantidade: event.target.value })} className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-slate-900" /></div><textarea value={form.finalidade} onChange={(event) => setForm({ ...form, finalidade: event.target.value })} rows={3} placeholder="Finalidade da reserva *" className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /></div><div className="flex gap-3 border-t border-slate-200 p-5"><button onClick={() => setSelecionado(null)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700">Cancelar</button><button disabled={saving} onClick={criarReserva} className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-50">{saving ? "Salvando..." : "Reservar"}</button></div></div></div>}
        {canManage && cadastroAberto && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-5"><h2 className="font-bold text-slate-900">Cadastrar equipamento</h2><button onClick={() => setCadastroAberto(false)}><X className="text-slate-500" size={20} /></button></div><div className="space-y-4 p-5"><input placeholder="Nome do equipamento *" value={novo.nome} onChange={(event) => setNovo({ ...novo, nome: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /><input placeholder="Tipo" value={novo.tipo} onChange={(event) => setNovo({ ...novo, tipo: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /><input type="number" min="1" placeholder="Quantidade" value={novo.quantidade} onChange={(event) => setNovo({ ...novo, quantidade: event.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /><textarea placeholder="Descrição" value={novo.descricao} onChange={(event) => setNovo({ ...novo, descricao: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900" /></div><div className="flex gap-3 border-t border-slate-200 p-5"><button onClick={() => setCadastroAberto(false)} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700">Cancelar</button><button disabled={saving} onClick={cadastrarEquipamento} className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white">Cadastrar</button></div></div></div>}
      </div>
    </AppLayout>
  );
}
