import { mapExternalTags } from "./taxonomyService.js";
import { getCodeforcesProblemset } from "./storageService.js";

export const CODEFORCES_API_URL = "https://codeforces.com/api/problemset.problems";
export const DEFAULT_TIMEOUT_MS = 15_000;

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

function key(contestId: unknown, index: unknown): string | undefined {
  const parsedContestId = Number.parseInt(String(contestId ?? ""), 10);
  const parsedIndex = String(index ?? "").trim();
  if (!Number.isInteger(parsedContestId) || !parsedIndex) return undefined;
  return `${parsedContestId}:${parsedIndex}`;
}

export function parseProblemset(payload: CodeforcesPayload): CodeforcesProblem[] {
  if (Array.isArray(payload.problems)) {
    return payload.problems;
  }
  if (!payload || payload.status !== "OK") {
    throw new CodeforcesError(payload?.comment ?? "Resposta Codeforces inválida.");
  }

  const rawProblems = payload.result?.problems ?? [];
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
      title: String(item.name || `Problem ${contestId}${index}`),
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
