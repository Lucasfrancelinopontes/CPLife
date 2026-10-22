"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import ProblemCard from "../../components/ProblemCard";
import {
  filterAndSortProblems,
  loadPublicCatalog,
  paginateProblems,
  type PublicProblem,
  type SearchFilters,
} from "../../services/questionBankSearch";

interface PublicTag {
  id: string;
  name: string;
  is_official?: boolean;
}

const PAGE_SIZE = 24;
const initialFilters: SearchFilters = {
  query: "",
  ratingMin: "",
  ratingMax: "",
  selectedTags: [],
  tagMode: "or",
  sort: "rating",
};

type LoadState = "loading" | "ready" | "error";

export default function QuestionBankPage() {
  const [problems, setProblems] = useState<PublicProblem[]>([]);
  const [tags, setTags] = useState<PublicTag[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [tagSearch, setTagSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  async function loadCatalog() {
    setState("loading");
    setError(null);
    try {
      const catalog = await loadPublicCatalog(process.env.NEXT_PUBLIC_BASE_PATH ?? "");
      setProblems(catalog.problems);
      setTags(catalog.tags);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o catálogo público.");
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  const filteredProblems = useMemo(
    () => filterAndSortProblems(problems, filters),
    [filters, problems],
  );
  const result = useMemo(
    () => paginateProblems(filteredProblems, page, PAGE_SIZE),
    [filteredProblems, page],
  );
  const visibleTags = tags.filter((tag) => tag.name.toLocaleLowerCase().includes(tagSearch.trim().toLocaleLowerCase()));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ ...draftFilters, selectedTags: [...draftFilters.selectedTags] });
    setPage(1);
  }

  function updateDraft<K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setDraftFilters(initialFilters);
    setFilters(initialFilters);
    setTagSearch("");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar title="Banco de Questões" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Busca pública do Codeforces</h1>
          <p className="mt-1 text-sm text-slate-400">Catálogo estático para consulta. Nenhum dado pessoal é gravado nesta página.</p>
        </div>

        <form onSubmit={applyFilters} className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Título ou identificador</span>
            <input value={draftFilters.query} onChange={(event) => updateDraft("query", event.target.value)} placeholder="Ex.: 2276-G ou graph" className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rating mínimo</span>
            <input type="number" min="0" step="100" value={draftFilters.ratingMin} onChange={(event) => updateDraft("ratingMin", event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rating máximo</span>
            <input type="number" min="0" step="100" value={draftFilters.ratingMax} onChange={(event) => updateDraft("ratingMax", event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Combinação</span>
            <select value={draftFilters.tagMode} onChange={(event) => updateDraft("tagMode", event.target.value as "or" | "and")} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400">
              <option value="or">Qualquer tag (OR)</option>
              <option value="and">Todas as tags (AND)</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ordenar por</span>
            <select value={draftFilters.sort} onChange={(event) => updateDraft("sort", event.target.value as "rating" | "solved_count")} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400">
              <option value="rating">Rating</option>
              <option value="solved_count">Mais resolvidas</option>
            </select>
          </label>
          <label className="md:col-span-3">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tags oficiais do Codeforces</span>
            <input value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} placeholder="Filtrar lista de tags" className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400" />
            <select multiple value={draftFilters.selectedTags} onChange={(event) => updateDraft("selectedTags", Array.from(event.target.selectedOptions, (option) => option.value))} className="h-28 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400">
              {visibleTags.map((tag) => <option key={tag.id} value={tag.name}>{tag.name}</option>)}
            </select>
            <span className="mt-2 block truncate text-xs text-slate-500">{draftFilters.selectedTags.length ? `Selecionadas: ${draftFilters.selectedTags.join(", ")}` : "Nenhuma tag selecionada"}</span>
          </label>
          <div className="flex flex-wrap items-end gap-2 md:col-span-3">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Buscar</button>
            <button type="button" onClick={clearFilters} className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Limpar filtros</button>
          </div>
        </form>

        {state === "loading" ? <p role="status" className="py-10 text-center text-sm text-slate-400">Carregando catálogo público...</p> : null}
        {state === "error" ? (
          <div role="alert" className="rounded-xl border border-red-400/40 bg-red-950/30 p-6 text-center">
            <p className="text-sm text-red-200">{error}</p>
            <button type="button" onClick={() => void loadCatalog()} className="mt-4 rounded-md border border-red-300/50 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">Tentar novamente</button>
          </div>
        ) : null}
        {state === "ready" ? (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
              <p>{result.totalResults} {result.totalResults === 1 ? "questão encontrada" : "questões encontradas"}</p>
              <p>Página {result.page} de {result.totalPages}</p>
            </div>
            {result.items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((problem) => <ProblemCard key={problem.external_id} problem={{ ...problem, attempted: false, reason: "" }} />)}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">Nenhuma questão corresponde aos filtros. Tente ampliar o rating ou remover uma tag.</p>
            )}
            <div className="mt-6 flex items-center justify-center gap-4">
              <button type="button" disabled={result.page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
              <span className="text-sm text-slate-400">Página {result.page} de {result.totalPages}</span>
              <button type="button" disabled={result.page === result.totalPages} onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))} className="rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40">Próxima</button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
