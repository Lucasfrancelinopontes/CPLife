import type {
  Attempt,
  Metrics,
  Problem,
  Recommendation,
  ReviewQueueItem,
  UpsolvingItem,
} from "../types";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `A engine devolveu HTTP ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export function fetchProblems(): Promise<Problem[]> {
  return fetchJson<Problem[]>("/api/problems");
}

export function fetchMetrics(): Promise<Metrics> {
  return fetchJson<Metrics>("/api/metrics");
}

export function fetchReviewQueue(): Promise<ReviewQueueItem[]> {
  return fetchJson<ReviewQueueItem[]>("/api/reviews");
}

export function fetchUpsolvingQueue(): Promise<UpsolvingItem[]> {
  return fetchJson<UpsolvingItem[]>("/api/upsolving");
}

export interface RecommendationFilters {
  topic_id?: string;
  rating_min?: number;
  rating_max?: number;
  tag?: string;
  tags?: string[];
  tag_mode?: "or" | "and";
  attempted?: "attempted" | "unattempted" | string;
  sort?: "rating" | "solved_count" | string;
  limit?: number;
}

export function fetchRecommendations(
  filters: RecommendationFilters = {},
): Promise<Recommendation[]> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }

  const query = params.toString();
  return fetchJson<Recommendation[]>(
    `/api/recommendations${query ? `?${query}` : ""}`,
  );
}

export interface QuestionBankTopic {
  topic_id: string;
  parent_id: string;
  name: string;
  category: string;
}

export interface QuestionBankTag {
  id: string;
  name: string;
  source: "codeforces";
  is_official: boolean;
  active: boolean;
  description: string;
}

export interface QuestionBankCatalog {
  source: "fresh" | "cache" | "demo" | "unavailable";
  stale: boolean;
  fetched_at: string | null;
  error: string | null;
}

export interface QuestionBankResponse {
  items: Recommendation[];
  catalog: QuestionBankCatalog;
  topics: QuestionBankTopic[];
}

export function fetchQuestionBank(
  filters: RecommendationFilters = {},
): Promise<QuestionBankResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const query = params.toString();
  return fetchJson<QuestionBankResponse>(
    `/api/question-bank/search${query ? `?${query}` : ""}`,
  );
}

export function fetchQuestionBankTags(): Promise<QuestionBankTag[]> {
  return fetchJson<QuestionBankTag[]>("/api/question-bank/tags");
}

export function refreshQuestionBank(): Promise<QuestionBankCatalog & { problems: Recommendation[] }> {
  return fetchJson<QuestionBankCatalog & { problems: Recommendation[] }>(
    "/api/question-bank/refresh",
    { method: "POST" },
  );
}

export function addQuestionToCatalog(externalId: string): Promise<{ created: boolean }> {
  return fetchJson<{ created: boolean }>("/api/question-bank/personal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ external_id: externalId }),
  });
}

export function fetchAttempts(): Promise<Attempt[]> {
  return fetchJson<Attempt[]>("/api/attempts");
}
