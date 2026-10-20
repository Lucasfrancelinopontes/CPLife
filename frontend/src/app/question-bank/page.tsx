"use client";

import { FormEvent, useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import ProblemCard from "../../components/ProblemCard";
import {
  addQuestionToCatalog,
  fetchQuestionBank,
  fetchQuestionBankTags,
  refreshQuestionBank,
  type QuestionBankCatalog,
  type QuestionBankTag,
  type QuestionBankTopic,
} from "../../services/api";
import type { Recommendation } from "../../types";

type LoadState = "loading" | "ready" | "error";

const initialCatalog: QuestionBankCatalog = {
  source: "unavailable",
  stale: false,
  fetched_at: null,
  error: null,
};

export default function QuestionBankPage() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [topics, setTopics] = useState<QuestionBankTopic[]>([]);
  const [tags, setTags] = useState<QuestionBankTag[]>([]);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [topicId, setTopicId] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"or" | "and">("or");
  const [ratingMin, setRatingMin] = useState("");
  const [ratingMax, setRatingMax] = useState("");
  const [sort, setSort] = useState<"rating" | "solved_count">("rating");
  const [refreshing, setRefreshing] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  async function loadSearch() {
    setState("loading");
    setError(null);
    try {
      const result = await fetchQuestionBank({
        topic_id: topicId,
        tags: selectedTags,
        tag_mode: tagMode,
        rating_min: ratingMin ? Number(ratingMin) : undefined,
        rating_max: ratingMax ? Number(ratingMax) : undefined,
        sort,
        attempted: "all",
        limit: 100,
      });
      setItems(result.items);
      setTopics(result.topics);
      setCatalog(result.catalog);
      setState("ready");
    } catch (loadError) {
      setState("error");
      setError(loadError instanceof Error ? loadError.message : "Não foi possível consultar o catálogo.");
    }
  }

  useEffect(() => {
    void loadSearch();
  }, []);

  useEffect(() => {
    void fetchQuestionBankTags().then(setTags).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as tags oficiais.");
    });
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadSearch();
  }

  async function updateCatalog() {
    setRefreshing(true);
    setError(null);
    try {
      const result = await refreshQuestionBank();
      setCatalog({
        source: result.source,
        stale: result.stale,
        fetched_at: result.fetched_at,
        error: result.error ?? null,
      });
      await loadSearch();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Não foi possível atualizar o catálogo.");
    } finally {
      setRefreshing(false);
    }
  }

  async function addProblem(problem: Recommendation) {
    try {
      const result = await addQuestionToCatalog(problem.external_id);
      setAdded((current) => ({ ...current, [problem.external_id]: true }));
      if (!result.created) setError("Essa questão já estava no catálogo pessoal.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Não foi possível adicionar a questão.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar title="Banco de Questões" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Busca Codeforces</h1>
            <p className="mt-1 text-sm text-slate-400">Questões externas ficam no cache até você adicioná-las ao catálogo pessoal.</p>
          </div>
          <CatalogStatus catalog={catalog} />
        </div>

        <form onSubmit={submit} className="mb-6 grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tópico</span>
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">Todos os tópicos</option>
              {topics.filter((topic) => topic.parent_id === "root").map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>{topic.name}</option>
              ))}
              {topics.filter((topic) => topic.parent_id !== "root").map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>↳ {topic.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rating mínimo</span>
            <input type="number" min="0" step="100" value={ratingMin} onChange={(event) => setRatingMin(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rating máximo</span>
            <input type="number" min="0" step="100" value={ratingMax} onChange={(event) => setRatingMax(event.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <div className="md:col-span-2">
            <label>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tags Codeforces</span>
              <input value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} placeholder="Buscar tag oficial" className="mb-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
            </label>
            <select multiple value={selectedTags} onChange={(event) => setSelectedTags(Array.from(event.target.selectedOptions, (option) => option.value))} className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              {tags.filter((item) => item.name.includes(tagSearch.trim().toLowerCase())).map((item) => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-slate-500">{selectedTags.length ? `Ativas: ${selectedTags.join(", ")}` : "Nenhuma tag selecionada"}</span>
              <button type="button" onClick={() => setSelectedTags([])} disabled={!selectedTags.length} className="text-xs font-semibold text-sky-400 disabled:text-slate-600">Limpar tags</button>
            </div>
          </div>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Combinação</span>
            <select value={tagMode} onChange={(event) => setTagMode(event.target.value as "or" | "and")} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="or">Qualquer tag (OR)</option>
              <option value="and">Todas as tags (AND)</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ordenar por</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as "rating" | "solved_count")} className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="rating">Rating</option>
              <option value="solved_count">Mais resolvidas</option>
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 md:col-span-6">
            <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">Buscar</button>
            <button type="button" onClick={() => void updateCatalog()} disabled={refreshing} className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 disabled:cursor-wait disabled:opacity-60">
              {refreshing ? "Atualizando..." : "Atualizar Codeforces"}
            </button>
          </div>
        </form>

        {error ? <div role="alert" className="mb-5 rounded-md border border-red-400/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div> : null}
        {state === "loading" ? <p role="status" className="py-10 text-center text-sm text-slate-400">Carregando catálogo...</p> : null}
        {state === "error" ? <p className="py-10 text-center text-sm text-slate-400">A busca não pôde ser concluída.</p> : null}
        {state === "ready" ? <p className="mb-4 text-sm text-slate-400">{items.length} questão(ões) encontrada(s)</p> : null}
        {state === "ready" && !items.length ? <p className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">Nenhuma questão corresponde aos filtros. Tente ampliar o rating ou remover uma tag.</p> : null}
        {state === "ready" && items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((problem) => (
              <ProblemCard key={problem.external_id} problem={problem} action={
                <button type="button" onClick={() => void addProblem(problem)} disabled={added[problem.external_id]} className="rounded-md border border-emerald-500/60 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-default disabled:border-slate-700 disabled:text-slate-500">
                  {added[problem.external_id] ? "Adicionada" : "Adicionar"}
                </button>
              } />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function CatalogStatus({ catalog }: { catalog: QuestionBankCatalog }) {
  const label = catalog.source === "fresh" ? "Atualizado" : catalog.source === "cache" ? (catalog.stale ? "Cache desatualizado" : "Cache local") : catalog.source === "demo" ? "Demonstração" : "Indisponível";
  const color = catalog.source === "unavailable" ? "text-red-300" : catalog.stale ? "text-amber-300" : "text-emerald-300";
  return <p className={`text-xs font-semibold ${color}`}>Catálogo: {label}{catalog.fetched_at ? ` · ${new Date(catalog.fetched_at).toLocaleString("pt-BR")}` : ""}{catalog.error ? ` · ${catalog.error}` : ""}</p>;
}
