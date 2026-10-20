"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProblemCard from "../components/ProblemCard";
import { fetchMetrics, fetchRecommendations } from "../services/api";
import type { Metrics, Recommendation } from "../types";

type LoadState = "loading" | "ready" | "error";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const [metricsData, recommendationData] = await Promise.all([
        fetchMetrics(),
        fetchRecommendations({ attempted: "unattempted", limit: 6 }),
      ]);
      setMetrics(metricsData);
      setRecommendations(recommendationData);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o dashboard.",
      );
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (state === "loading") {
    return <DashboardShell><LoadingState /></DashboardShell>;
  }

  if (state === "error" || !metrics) {
    return (
      <DashboardShell>
        <ErrorState message={error ?? "Não foi possível carregar os dados."} onRetry={() => void loadDashboard()} />
      </DashboardShell>
    );
  }

  const summary = metrics.summary;

  return (
    <DashboardShell onRefresh={() => void loadDashboard()} summary={summary}>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-slate-100">Visão geral do treino</h1>
            <p className="mt-1 text-sm text-slate-400">
              Acompanhe o domínio atual e escolha a próxima questão para praticar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Problemas resolvidos" value={summary.solved_count} detail={`${summary.total_problems} no catálogo`} />
            <MetricCard label="Tempo total" value={`${summary.total_time_hours}h`} detail={`${summary.total_time_min} minutos registados`} />
            <MetricCard label="Revisões de hoje" value={summary.due_today_count} detail={`${summary.pending_reviews_count} pendentes`} tone="yellow" />
            <MetricCard label="Upsolving pendente" value={summary.pending_upsolving_count} detail={`${summary.upsolve_solved_count} resolvidos`} tone="purple" />
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Recomendações</h2>
              <p className="mt-1 text-sm text-slate-400">Questões ainda não praticadas, sugeridas pela engine.</p>
            </div>
            <a href="/upsolving" className="text-sm font-semibold text-sky-400 hover:underline">
              Ver fila de upsolving
            </a>
          </div>
          {recommendations.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((problem) => (
                <ProblemCard key={problem.external_id} problem={problem} />
              ))}
            </div>
          ) : (
            <EmptyState message="A engine não devolveu recomendações neste momento." />
          )}
        </section>
      </main>
    </DashboardShell>
  );
}

function DashboardShell({
  children,
  summary,
  onRefresh,
}: {
  children: ReactNode;
  summary?: Metrics["summary"];
  onRefresh?: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar summary={summary} onRefresh={onRefresh} />
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6" role="status" aria-live="polite">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-24 rounded-xl bg-slate-900" />)}
        </div>
        <div className="h-6 w-48 rounded bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-52 rounded-xl bg-slate-900" />)}
        </div>
      </div>
      <span className="sr-only">A carregar o dashboard...</span>
    </main>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
      <div className="rounded-xl border border-red-400/40 bg-red-950/30 p-6">
        <h1 className="text-lg font-bold text-red-300">Não foi possível carregar o dashboard</h1>
        <p className="mt-2 text-sm text-red-200/80">{message}</p>
        <button type="button" onClick={onRetry} className="mt-5 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">{message}</div>;
}

function MetricCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "yellow" | "purple";
}) {
  const color = tone === "yellow" ? "text-amber-400" : tone === "purple" ? "text-purple-400" : "text-slate-100";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}
