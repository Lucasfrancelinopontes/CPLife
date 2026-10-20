"use client";

import type { MetricsSummary } from "../types";

export interface NavbarProps {
  summary?: Partial<MetricsSummary>;
  mode?: "demo" | "personal" | string;
  title?: string;
  onRefresh?: () => void;
  onRegisterAttempt?: () => void;
}

function number(value: number | undefined): number {
  return value ?? 0;
}

export function Navbar({
  summary = {},
  mode = "personal",
  title = "Dashboard Executivo",
  onRefresh,
  onRegisterAttempt,
}: NavbarProps) {
  const modeLabel = mode === "demo" ? "Modo demonstração" : "Modo pessoal";
  const platformCounts = Object.entries(summary.platform_solved_counts ?? {})
    .sort(([, left], [, right]) => right - left)
    .slice(0, 2)
    .map(([platform, count]) => `${count} ${platform}`)
    .join(" / ");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/70 bg-slate-950/85 shadow-lg shadow-slate-950/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-md bg-gradient-to-br from-sky-600 to-sky-400 px-2 py-1 font-mono text-sm font-extrabold tracking-wide text-white">
            CPLife
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100 sm:text-base">
              {title}
            </p>
            <p className="hidden text-xs text-slate-400 sm:block">
              Painel pessoal de treinamento
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
              mode === "demo"
                ? "border-amber-400 text-amber-300"
                : "border-sky-400 text-sky-300"
            }`}
          >
            {modeLabel}
          </span>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Atualizar
            </button>
          ) : null}
          {onRegisterAttempt ? (
            <button
              type="button"
              onClick={onRegisterAttempt}
              className="rounded-md border border-sky-400 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              + Registrar tentativa
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-3 sm:px-6 lg:grid-cols-6">
        <QuickStat label="Resolvidos" value={number(summary.solved_count)} detail={`de ${number(summary.total_problems)} no catálogo`} />
        <QuickStat label="Taxa solo" value={`${number(summary.pure_solo_rate)}%`} detail={`${number(summary.solo_count)} sem ajuda`} tone="green" />
        <QuickStat label="Autonomia" value={`${number(summary.weighted_autonomy)}%`} detail="média dos níveis de ajuda" tone="cyan" />
        <QuickStat label="Plataformas" value={platformCounts || "Nenhuma"} detail={`${number(summary.total_time_hours)}h de treino`} />
        <QuickStat label="Revisões" value={number(summary.due_today_count)} detail={`${number(summary.pending_reviews_count)} na fila`} tone="yellow" />
        <QuickStat label="Upsolving" value={number(summary.pending_upsolving_count)} detail={`${number(summary.upsolve_solved_count)} resolvidos`} tone="purple" />
      </div>
    </header>
  );
}

function QuickStat({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "green" | "cyan" | "yellow" | "purple";
}) {
  const valueColor = {
    default: "text-slate-100",
    green: "text-emerald-400",
    cyan: "text-sky-400",
    yellow: "text-amber-400",
    purple: "text-purple-400",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`truncate text-lg font-bold ${valueColor}`}>{value}</p>
      <p className="truncate text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

export default Navbar;
