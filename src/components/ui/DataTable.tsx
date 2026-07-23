import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "Nenhum registro encontrado.",
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900/80 text-left text-slate-400">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-4 py-3 font-medium whitespace-nowrap ${c.className ?? ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <Inbox size={28} className="text-slate-600" />
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className="bg-slate-900/30 hover:bg-slate-800/40 transition-colors"
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 text-slate-200 ${c.className ?? ""}`}>
                    {c.render
                      ? c.render(row)
                      : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
