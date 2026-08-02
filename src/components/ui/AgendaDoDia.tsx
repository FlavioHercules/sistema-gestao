import { CalendarClock, Clock3, Sparkles } from "lucide-react";
import type { Horario } from "../../lib/supabase";

interface AgendaDoDiaProps {
  horarios?: Horario[] | any[];
  title?: string;
  emptyMessage?: string;
}

const diasSemana = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function parseTime(value?: string | null): number {
  if (!value || typeof value !== "string") return 0;
  const parts = value.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  return hours * 60 + minutes;
}

function getDiaAtual() {
  const hoje = new Date();
  const index = (hoje.getDay() + 6) % 7;
  return diasSemana[index] || "Segunda-feira";
}

export function AgendaDoDia({ 
  horarios = [], 
  title = "Agenda de hoje", 
  emptyMessage = "Nenhuma aula cadastrada para hoje." 
}: AgendaDoDiaProps) {
  const diaHoje = getDiaAtual();

  // Garante que horarios é um array seguro antes de filtrar
  const listaHorarios = Array.isArray(horarios) ? horarios : [];

  const aulasHoje = [...listaHorarios]
    .filter((item) => item && item.dia_semana === diaHoje && item.hora_inicio)
    .sort((a, b) => parseTime(a.hora_inicio) - parseTime(b.hora_inicio));

  const agora = new Date();
  const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
  
  const aulaAtual = aulasHoje.find((aula) => 
    aula.hora_inicio && aula.hora_fim && 
    agoraMinutos >= parseTime(aula.hora_inicio) && agoraMinutos < parseTime(aula.hora_fim)
  );
  
  const proximaAula = aulasHoje.find((aula) => 
    aula.hora_inicio && agoraMinutos < parseTime(aula.hora_inicio)
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-sky-400" />
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-400">
          {diaHoje}
        </span>
      </div>

      {aulasHoje.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-3 py-4 text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2">
          {aulaAtual ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles size={14} />
                <span className="text-xs font-semibold uppercase tracking-wide">Aula atual</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{aulaAtual.disciplina?.nome || "Disciplina"}</p>
              <p className="text-sm text-slate-200">{aulaAtual.professor?.nome || "Professor"}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <Clock3 size={12} /> {aulaAtual.hora_inicio} - {aulaAtual.hora_fim}
              </p>
            </div>
          ) : proximaAula ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-amber-300">
                <Clock3 size={14} />
                <span className="text-xs font-semibold uppercase tracking-wide">Próxima aula</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{proximaAula.disciplina?.nome || "Disciplina"}</p>
              <p className="text-sm text-slate-200">{proximaAula.professor?.nome || "Professor"}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <Clock3 size={12} /> {proximaAula.hora_inicio} - {proximaAula.hora_fim}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            {aulasHoje.map((aula) => {
              const isNow = aulaAtual?.id === aula.id;
              return (
                <div
                  key={aula.id || Math.random()}
                  className={`rounded-xl border px-3 py-2.5 ${isNow ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-800 bg-slate-900/50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{aula.disciplina?.nome || "Disciplina"}</p>
                      <p className="text-xs text-slate-400">{aula.professor?.nome || "Professor"}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{aula.hora_inicio} - {aula.hora_fim}</p>
                      {isNow ? <p className="text-emerald-300">Agora</p> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}