import { mapExternalTags } from "./taxonomyService.js";
import {
  getCodeforcesProblemset,
  readCodeforcesCache,
  writeCodeforcesCache,
} from "./storageService.js";

export const CODEFORCES_API_URL = "https://codeforces.com/api/problemset.problems";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const MIN_REFRESH_INTERVAL_MS = 2_000;

export class CodeforcesError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CodeforcesError";
  }
}

export interface CodeforcesProblem {
  external_id: string;
  contest_id: number;
  index: string;
  title: string;
  type: string;
  rating: number | null;
  tags: string[];
  solved_count?: number;
  link: string;
  topic_mappings: ReturnType<typeof mapExternalTags>;
  [key: string]: unknown;
}

interface CodeforcesPayload {
  status?: string;
  comment?: string;
  result?: {
    problems?: Array<Record<string, unknown>>;
    problemStatistics?: Array<Record<string, unknown>>;
  };
  problems?: CodeforcesProblem[];
}

export interface CodeforcesCache {
  source: "codeforces" | "demo";
  fetched_at: string;
  problems: CodeforcesProblem[];
}

export type CatalogSource = "fresh" | "cache" | "demo" | "unavailable";

export interface CatalogResult {
  problems: CodeforcesProblem[];
  source: CatalogSource;
  fetched_at: string | null;
  stale: boolean;
  error?: string;
}

let lastFetchAt = 0;

function key(contestId: unknown, index: unknown): string | undefined {
  const parsedContestId = Number.parseInt(String(contestId ?? ""), 10);
  const parsedIndex = String(index ?? "").trim();
  if (!Number.isInteger(parsedContestId) || !parsedIndex) return undefined;
  return `${parsedContestId}:${parsedIndex}`;
}

export function parseProblemset(payload: CodeforcesPayload): CodeforcesProblem[] {
  if (!payload || payload.status !== "OK") {
    throw new CodeforcesError(payload?.comment ?? "Resposta Codeforces inválida.");
  }

  const rawProblems = Array.isArray(payload.result?.problems) ? payload.result.problems : [];
  const statistics = new Map(
    (payload.result?.problemStatistics ?? [])
      .map((item) => {
        const itemKey = key(item.contestId, item.index);
        return itemKey ? [itemKey, item] as const : undefined;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] => Boolean(entry)),
  );
  const unique = new Map<string, CodeforcesProblem>();

  for (const item of rawProblems) {
    const itemKey = key(item.contestId, item.index);
    if (!itemKey || item.type !== "PROGRAMMING") continue;
    const [contestIdText, index] = itemKey.split(":");
    const contestId = Number.parseInt(contestIdText, 10);
    const tags = Array.from(new Set(
      (Array.isArray(item.tags) ? item.tags : [])
        .map((tag) => String(tag).trim())
        .filter(Boolean),
    ));
    const stat = statistics.get(itemKey);
    unique.set(`cf-${contestId}-${index}`, {
      external_id: `cf-${contestId}-${index}`,
      contest_id: contestId,
      index,
      title: String(item.name || `Problem ${contestId}${index}`).trim(),
      type: "PROGRAMMING",
      rating: typeof item.rating === "number" ? item.rating : null,
      tags,
      solved_count: typeof stat?.solvedCount === "number" ? stat.solvedCount : undefined,
      link: `https://codeforces.com/problemset/problem/${contestId}/${index}`,
      topic_mappings: mapExternalTags(tags),
    });
  }
  return [...unique.values()];
}

function cacheIsFresh(cache: CodeforcesCache, now: number): boolean {
  const fetchedAt = Date.parse(cache.fetched_at);
  return Number.isFinite(fetchedAt) && now - fetchedAt < CACHE_TTL_MS;
}

export async function getCatalog(options: {
  forceRefresh?: boolean;
  demo?: boolean;
  now?: number;
  fetcher?: () => Promise<CodeforcesProblem[]>;
} = {}): Promise<CatalogResult> {
  const now = options.now ?? Date.now();
  if (options.demo) {
    return {
      problems: await getDemoProblemset(),
      source: "demo",
      fetched_at: null,
      stale: false,
    };
  }

  const cached = await readCodeforcesCache<CodeforcesCache>();
  if (options.forceRefresh && now - lastFetchAt < MIN_REFRESH_INTERVAL_MS && cached?.problems) {
    return {
      problems: cached.problems,
      source: "cache",
      fetched_at: cached.fetched_at,
      stale: true,
      error: "Aguarde antes de solicitar outra atualização do catálogo.",
    };
  }
  if (!options.forceRefresh && cached?.problems && cacheIsFresh(cached, now)) {
    return { problems: cached.problems, source: "cache", fetched_at: cached.fetched_at, stale: false };
  }

  try {
    const problems = await (options.fetcher ?? fetchProblemset)();
    lastFetchAt = now;
    const fetchedAt = new Date(now).toISOString();
    await writeCodeforcesCache({ source: "codeforces", fetched_at: fetchedAt, problems });
    return { problems, source: "fresh", fetched_at: fetchedAt, stale: false };
  } catch (error) {
    if (cached?.problems) {
      return {
        problems: cached.problems,
        source: "cache",
        fetched_at: cached.fetched_at,
        stale: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    return {
      problems: [],
      source: "unavailable",
      fetched_at: null,
      stale: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchProblemset(
  url = CODEFORCES_API_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<CodeforcesProblem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "CPLife/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new CodeforcesError(`Codeforces devolveu HTTP ${response.status}.`);
    }
    const payload = await response.json() as CodeforcesPayload;
    return parseProblemset(payload);
  } catch (error) {
    if (error instanceof CodeforcesError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new CodeforcesError(`Falha ao consultar Codeforces: ${message}`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getDemoProblemset(): Promise<CodeforcesProblem[]> {
  const payload = await getCodeforcesProblemset() as CodeforcesPayload;
  return parseProblemset(payload);
}
