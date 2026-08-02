import { CalendarClock, Download, ExternalLink } from "lucide-react";
import type { Horario } from "../../lib/supabase";

interface GradeHorariaProps {
  horarios?: Horario[] | any[] | string | null;
  title?: string;
  onSelectSlot?: (horario: Horario) => void;
}

const diasSemana = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function GradeHoraria({ horarios, title = "Grade visual", onSelectSlot }: GradeHorariaProps) {
  // Se o horário for uma string única (URL de imagem/arquivo do mural)
  if (typeof horarios === "string" && horarios.trim() !== "") {
    return (
      <div className="space-y-3">
        {title && <p className="text-sm font-medium text-slate-300">{title}</p>}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-sky-400">
            <CalendarClock size={20} />
            <span className="text-sm font-semibold text-white">Grade Horária da Turma</span>
          </div>
          
          <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-2">
            <img 
              src={horarios} 
              alt="Grade Horária" 
              className="mx-auto max-h-[600px] w-auto rounded-lg object-contain"
            />
          </div>

          <div className="mt-4 flex justify-center gap-3">
            <a
              href={horarios}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
            >
              <ExternalLink size={14} /> Abrir imagem em tela cheia
            </a>
            <a
              href={horarios}
              download="grade-horaria"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              <Download size={14} /> Baixar grade
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Se for um array de horários (formato antigo de tabela)
  const listaHorarios = Array.isArray(horarios) ? horarios : [];
  
  if (listaHorarios.length === 0 || typeof listaHorarios[0] === 'string') {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
        Ainda não há grade horária ou aulas cadastradas para esta turma.
      </div>
    );
  }

  const linhas = Array.from(new Set(listaHorarios.map((item) => item?.hora_inicio).filter(Boolean))).sort();

  return (
    <div className="space-y-3">
      {title && <p className="text-sm font-medium text-slate-300">{title}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/70 text-left text-slate-400">
              <th className="w-24 px-3 py-3">Horário</th>
              {diasSemana.map((dia) => (
                <th key={dia} className="min-w-[140px] px-3 py-3 text-center text-xs uppercase tracking-wide">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((hora) => (
              <tr key={hora} className="border-b border-slate-800/70 last:border-b-0">
                <td className="px-3 py-3 font-medium text-slate-300">{hora}</td>
                {diasSemana.map((dia) => {
                  const aula = listaHorarios.find(
                    (item) => item && item.dia_semana === dia && item.hora_inicio === hora
                  );

                  return (
                    <td key={`${dia}-${hora}`} className="px-2 py-2 align-top">
                      {aula ? (
                        <button
                          type="button"
                          onClick={() => onSelectSlot?.(aula)}
                          className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-3 text-left text-slate-200 transition hover:bg-sky-500/20"
                        >
                          <p className="text-xs font-semibold text-sky-200">{aula.disciplina?.nome || "Disciplina"}</p>
                          <p className="mt-1 text-xs text-slate-300">{aula.professor?.nome || "Professor"}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{aula.hora_inicio} - {aula.hora_fim}</p>
                        </button>
                      ) : (
                        <div className="flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-[11px] text-slate-500">
                          Livre
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}