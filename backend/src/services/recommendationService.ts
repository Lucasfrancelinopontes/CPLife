import type { Attempt } from "../types/data.js";
import { mapExternalTags, normalizeTag } from "./taxonomyService.js";

export interface ExternalProblem {
  external_id: string;
  title: string;
  link: string;
  rating: number | null;
  solved_count?: number | null;
  tags: string[];
  [key: string]: unknown;
}

export interface Recommendation extends ExternalProblem {
  attempted: boolean;
  reason: string;
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

function problemTopicIds(problem: ExternalProblem): Set<string> {
  return new Set(mapExternalTags(problem.tags).map((mapping) => mapping.topic_id));
}

export function suggest(
  externalProblems: ExternalProblem[],
  attempts: Attempt[],
  filters: RecommendationFilters = {},
): Recommendation[] {
  const attemptedIds = new Set(attempts.map((attempt) => attempt.problem_id));
  const requestedTag = normalizeTag(filters.tag);
  const results = externalProblems.filter((problem) => {
    const attempted = attemptedIds.has(problem.external_id);
    if (filters.topic_id && !problemTopicIds(problem).has(filters.topic_id)) return false;
    if (filters.rating_min !== undefined && (problem.rating === null || problem.rating < filters.rating_min)) return false;
    if (filters.rating_max !== undefined && (problem.rating === null || problem.rating > filters.rating_max)) return false;
    if (requestedTag && !problem.tags.some((tag) => {
      const normalized = normalizeTag(tag);
      return normalized === requestedTag || normalized.startsWith(`${requestedTag} `);
    })) return false;
    if (filters.attempted === "attempted" && !attempted) return false;
    if ((filters.attempted ?? "unattempted") === "unattempted" && attempted) return false;
    return true;
  }).map((problem) => {
    const attempted = attemptedIds.has(problem.external_id);
    const reasons = [];
    if (filters.topic_id) reasons.push("tópico selecionado");
    if (filters.rating_min !== undefined || filters.rating_max !== undefined) reasons.push("rating dentro da faixa");
    if (requestedTag) reasons.push("tag selecionada");
    reasons.push(attempted ? "já praticado" : "ainda não praticado");
    return { ...problem, attempted, reason: reasons.join(", ") };
  });

  results.sort((left, right) => filters.sort === "solved_count"
    ? (right.solved_count ?? -1) - (left.solved_count ?? -1)
    : (left.rating ?? 10 ** 9) - (right.rating ?? 10 ** 9));
  return results.slice(0, Math.max(1, Math.min(filters.limit ?? 20, 100)));
}

export function recommendByWeakness(
  externalProblems: ExternalProblem[],
  attempts: Attempt[],
  weakTopicIds: string[],
  limit = 20,
): Recommendation[] {
  const weak = new Set(weakTopicIds);
  const filtered = externalProblems.filter((problem) =>
    [...problemTopicIds(problem)].some((topicId) => weak.has(topicId)),
  );
  return suggest(filtered, attempts, { attempted: "unattempted", limit });
}
