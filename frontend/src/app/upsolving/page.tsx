"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import UpsolvingTable from "../../components/UpsolvingTable";
import { fetchMetrics, fetchUpsolvingQueue } from "../../services/api";
import type { Metrics, UpsolvingItem } from "../../types";

type LoadState = "loading" | "ready" | "error";

export default function UpsolvingPage() {
  const [items, setItems] = useState<UpsolvingItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadUpsolving = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [queue, metricsData] = await Promise.all([
        fetchUpsolvingQueue(),
        fetchMetrics(),
      ]);
      setItems(queue);
      setMetrics(metricsData);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar a fila de upsolving.",
      );
    }
  }, []);

  useEffect(() => {
    void loadUpsolving();
  }, [loadUpsolving]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        title="Central de Upsolving"
        summary={metrics?.summary}
        onRefresh={() => void loadUpsolving()}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Fila de upsolving</h1>
          <p className="mt-1 text-sm text-slate-400">
            Reveja as falhas dos contests e acompanhe a evolução até à resolução autónoma.
          </p>
        </div>

        {state === "loading" ? <LoadingState /> : null}
        {state === "error" ? <ErrorState message={error ?? "Erro desconhecido."} onRetry={() => void loadUpsolving()} /> : null}
        {state === "ready" ? <UpsolvingTable items={items} /> : null}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-8" role="status" aria-live="polite">
      <div className="animate-pulse space-y-3">
        <div className="h-6 w-52 rounded bg-slate-800" />
        <div className="h-12 w-full rounded bg-slate-800" />
        <div className="h-40 w-full rounded bg-slate-800" />
      </div>
      <span className="sr-only">A carregar a fila de upsolving...</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-400/40 bg-red-950/30 p-6 text-center">
      <h2 className="font-bold text-red-300">Não foi possível carregar a fila</h2>
      <p className="mt-2 text-sm text-red-200/80">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
        Tentar novamente
      </button>
    </div>
  );
}
