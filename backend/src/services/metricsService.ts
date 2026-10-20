import {
  getAttempts,
  getContests,
  getProblems,
  getReviewQueue,
  getTopics,
  getUpsolving,
} from "./storageService.js";
import { getBuiltinTopics, getProblemTopicIds } from "./taxonomyService.js";
import type { Attempt, Problem, ReviewItem, Topic } from "../types/data.js";

export const ERROR_TAXONOMY: Record<string, string> = {
  A: "Não entendi o problema", B: "Não reconheci a técnica",
  C: "Estratégia errada", D: "Raciocínio/prova errada",
  E: "Complexidade (TLE/MLE)", F: "Implementação / Bug lógico",
  G: "Edge case não considerado", H: "Bug de C++ / STL",
  I: "Overflow / Tipos numéricos", J: "Leitura desatenta",
};

export interface MetricsSummary {
  total_problems: number;
  solved_count: number;
  total_submissions: number;
  acceptance_rate: number;
  total_time_min: number;
  total_time_hours: number;
  pending_reviews_count: number;
  due_today_count: number;
  pending_upsolving_count: number;
  solo_count: number;
  pure_solo_rate: number;
  weighted_autonomy: number;
  platform_solved_counts: Record<string, number>;
}

export interface TopicMetric {
  topic_id: string;
  name: string;
  category: string;
  score: number;
  solved_count: number;
  total_attempts: number;
  avg_help: number;
}

export interface MetricsResult {
  summary: MetricsSummary;
  errors: Array<{ code: string; name: string; count: number }>;
  topics: TopicMetric[];
  review_queue: { pending: ReviewItem[]; completed: ReviewItem[]; due_today_count: number };
  recent_attempts: Attempt[];
}

function integer(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function attemptType(attempt: Attempt): string {
  return ["PRACTICE", "UPSOLVE", "SPACED_REVIEW"].includes(attempt.attempt_type)
    ? attempt.attempt_type
    : "PRACTICE";
}

function difficultyPoints(value: string): number {
  const rating = Number.parseInt(value, 10);
  if (Number.isFinite(rating)) return rating >= 1800 ? 0.8 : rating >= 1400 ? 0.5 : 0.3;
  const normalized = value.toLowerCase();
  return /hard|diff|dificil/.test(normalized) ? 0.8 : /medium|medio|inter/.test(normalized) ? 0.5 : 0.3;
}

export async function computeMetrics(): Promise<MetricsResult> {
  const [problems, attempts, reviews, legacyTopics, contests, upsolsing] = await Promise.all([
    getProblems(), getAttempts(), getReviewQueue(), getTopics(), getContests(), getUpsolving(),
  ]);
  const problemsById = new Map(problems.map((problem) => [problem.problem_id, problem]));
  const attemptsByProblem = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const list = attemptsByProblem.get(attempt.problem_id) ?? [];
    list.push(attempt);
    attemptsByProblem.set(attempt.problem_id, list);
  }

  const solvedIds = new Set<string>();
  const soloIds = new Set<string>();
  const platformSolvedCounts: Record<string, number> = {};
  for (const [problemId, problemAttempts] of attemptsByProblem) {
    if (!problemAttempts.some((attempt) => attempt.result === "AC")) continue;
    solvedIds.add(problemId);
    const problem = problemsById.get(problemId);
    const platform = problem?.platform || "Outros";
    platformSolvedCounts[platform] = (platformSolvedCounts[platform] ?? 0) + 1;
    if (problemAttempts.some((attempt) => attempt.result === "AC" && integer(attempt.help_level) === 0)) soloIds.add(problemId);
  }

  const practiceAcs = attempts.filter((attempt) => attempt.result === "AC" && attemptType(attempt) === "PRACTICE");
  const totalTime = attempts.reduce((sum, attempt) => sum + integer(attempt.total_time_min), 0);
  const pending = reviews.filter((review) => review.status === "PENDING");
  const completed = reviews.filter((review) => review.status !== "PENDING");
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = pending.filter((review) => review.due_date !== "" && review.due_date <= today).length;
  const upsolvingPending = upsolsing.filter((item) => !["AC", "STILL_FAILED"].includes(item.upsolve_status)).length;

  const errorCounts = Object.fromEntries(Object.keys(ERROR_TAXONOMY).map((code) => [code, 0]));
  for (const attempt of attempts) {
    for (const code of attempt.errors.replace(/,/g, ";").split(";").map((item) => item.trim().toUpperCase())) {
      if (code in errorCounts) errorCounts[code] += 1;
    }
  }

  const topicSource = [...getBuiltinTopics(), ...legacyTopics];
  const topics = [...new Map(topicSource.map((topic) => [topic.topic_id, topic])).values()];
  const topicMetrics = topics.map((topic: Topic) => {
    const topicProblems = problems.filter((problem) => getProblemTopicIds(problem).includes(topic.topic_id));
    const topicAttempts = attempts.filter((attempt) => topicProblems.some((problem) => problem.problem_id === attempt.problem_id));
    const acs = topicAttempts.filter((attempt) => attempt.result === "AC" && attemptType(attempt) !== "SPACED_REVIEW");
    const solved = new Set(acs.map((attempt) => attempt.problem_id));
    const base = Math.min(3.5, [...solved].reduce((sum, id) => sum + difficultyPoints(problemsById.get(id)?.difficulty_value ?? ""), 0));
    const avgHelp = acs.length ? acs.reduce((sum, attempt) => sum + integer(attempt.help_level), 0) / acs.length : 0;
    const multiplier = acs.length ? 0.3 + 1.1 * ((4 - avgHelp) / 4) : 1;
    return {
      topic_id: topic.topic_id, name: topic.name, category: topic.category,
      score: solved.size ? Math.max(0, Math.min(5, Math.round((base * multiplier) * 100) / 100)) : 0,
      solved_count: solved.size, total_attempts: topicAttempts.length,
      avg_help: Math.round(avgHelp * 10) / 10,
    };
  }).sort((left, right) => right.score - left.score);

  return {
    summary: {
      total_problems: problems.length, solved_count: solvedIds.size,
      total_submissions: attempts.length,
      acceptance_rate: attempts.length ? Math.round((attempts.filter((attempt) => attempt.result === "AC").length / attempts.length) * 1000) / 10 : 0,
      total_time_min: totalTime, total_time_hours: Math.round(totalTime / 60 * 10) / 10,
      pending_reviews_count: pending.length, due_today_count: dueToday,
      pending_upsolving_count: upsolvingPending, solo_count: soloIds.size,
      pure_solo_rate: solvedIds.size ? Math.round(soloIds.size / solvedIds.size * 1000) / 10 : 0,
      weighted_autonomy: practiceAcs.length ? Math.round(practiceAcs.reduce((sum, attempt) => sum + (4 - integer(attempt.help_level)) / 4 * 100, 0) / practiceAcs.length * 10) / 10 : 0,
      platform_solved_counts: platformSolvedCounts,
    },
    errors: Object.entries(errorCounts).map(([code, count]) => ({ code, name: ERROR_TAXONOMY[code], count })),
    topics: topicMetrics,
    review_queue: { pending, completed, due_today_count: dueToday },
    recent_attempts: attempts.slice(-10).reverse(),
  };
}

export const getMetrics = computeMetrics;
