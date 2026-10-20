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
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return fetchJson<Recommendation[]>(
    `/api/recommendations${query ? `?${query}` : ""}`,
  );
}

export function fetchAttempts(): Promise<Attempt[]> {
  return fetchJson<Attempt[]>("/api/attempts");
}
