"use client";

import { useMemo, useState } from "react";
import type { UpsolvingItem, UpsolvingStatus } from "../types";

type Filter = "ALL" | UpsolvingStatus;

export interface UpsolvingTableProps {
  items: UpsolvingItem[];
  onSelect?: (item: UpsolvingItem) => void;
  onStatusChange?: (item: UpsolvingItem) => void;
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em progresso",
  AC: "Resolvido",
  STILL_FAILED: "Falhou",
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-400/15 text-amber-300",
  IN_PROGRESS: "bg-sky-400/15 text-sky-300",
  AC: "bg-emerald-400/15 text-emerald-300",
  STILL_FAILED: "bg-red-400/15 text-red-300",
};

export function UpsolvingTable({ items, onSelect, onStatusChange }: UpsolvingTableProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const filteredItems = useMemo(
    () => filter === "ALL" ? items : items.filter((item) => item.upsolve_status === filter),
    [filter, items],
  );
  const count = (status: UpsolvingStatus) => items.filter((item) => item.upsolve_status === status).length;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/60 shadow-xl">
      <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Fila de Upsolving</h2>
          <p className="mt-1 text-sm text-slate-400">Acompanhe problemas pendentes após contests e simulados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "IN_PROGRESS", "AC", "STILL_FAILED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === value
                  ? "border-sky-400 bg-sky-500/15 text-sky-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {value === "ALL" ? "Todos" : statusLabels[value]} ({value === "ALL" ? items.length : count(value)})
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Problema</th>
              <th className="px-4 py-3 font-semibold">Contest</th>
              <th className="px-4 py-3 font-semibold">Falha</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Técnica</th>
              <th className="px-4 py-3 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredItems.map((item) => (
              <tr key={item.upsolve_id} className="transition hover:bg-slate-900/70">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-100">{item.problem_title || item.problem_id}</p>
                  <p className="text-xs text-slate-500">{item.problem_id}{item.problem_letter ? ` · ${item.problem_letter}` : ""}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <p>{item.contest_name || item.contest_id}</p>
                  <p className="text-xs text-slate-500">{item.contest_date || "—"}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">{item.contest_failure_reason || item.original_error || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[item.upsolve_status] || "bg-slate-800 text-slate-300"}`}>
                    {statusLabels[item.upsolve_status] || item.upsolve_status}
                  </span>
                </td>
                <td className="max-w-56 px-4 py-3 text-slate-300">{item.technique_learned || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                        Abrir
                      </a>
                    ) : null}
                    {onSelect ? (
                      <button type="button" onClick={() => onSelect(item)} className="font-semibold text-slate-300 hover:text-white">
                        Detalhes
                      </button>
                    ) : null}
                    {onStatusChange ? (
                      <button type="button" onClick={() => onStatusChange(item)} className="font-semibold text-sky-400 hover:text-sky-300">
                        Atualizar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!filteredItems.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Não existem problemas nesta fila.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default UpsolvingTable;
