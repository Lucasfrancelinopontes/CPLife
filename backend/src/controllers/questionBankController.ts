import type { Request, Response, NextFunction } from "express";
import {
  getCatalog,
  type CodeforcesProblem,
} from "../services/codeforcesService.js";
import { getBuiltinTopics } from "../services/taxonomyService.js";
import {
  listOfficialCodeforcesTags,
  resolveOfficialCodeforcesTag,
} from "../services/codeforcesTagService.js";
import {
  getAttempts,
  readPersonalProblems,
  writePersonalProblems,
} from "../services/storageService.js";
import { suggest, type RecommendationFilters } from "../services/recommendationService.js";
import type { Problem } from "../types/data.js";

function optionalInteger(value: unknown, name: string): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`Filtro ${name} inválido.`);
  return parsed;
}

function filtersFromQuery(query: Request["query"]): RecommendationFilters {
  const ratingMin = optionalInteger(query.rating_min, "rating_min");
  const ratingMax = optionalInteger(query.rating_max, "rating_max");
  if (ratingMin !== undefined && ratingMax !== undefined && ratingMin > ratingMax) {
    throw new Error("Filtro rating_min não pode ser maior que rating_max.");
  }
  const rawTags = query.tags ?? query.tag;
  const tagValues = (Array.isArray(rawTags) ? rawTags : [rawTags])
    .flatMap((value) => typeof value === "string" ? value.split(",") : [])
    .map((value) => value.trim())
    .filter(Boolean);
  const tags = [...new Set(tagValues.map((value) => {
    const resolved = resolveOfficialCodeforcesTag(value) ?? resolveOfficialCodeforcesTag(value.replace(/-/g, " "));
    if (!resolved) throw new Error(`Filtro tag desconhecida: ${value}.`);
    return resolved.name;
  }))];
  const tagMode = query.tag_mode === "and" ? "and" : "or";
  return {
    topic_id: typeof query.topic_id === "string" ? query.topic_id : undefined,
    rating_min: ratingMin,
    rating_max: ratingMax,
    tags,
    tag_mode: tagMode,
    attempted: typeof query.attempted === "string" ? query.attempted : "all",
    sort: typeof query.sort === "string" ? query.sort : "rating",
    limit: optionalInteger(query.limit, "limit"),
  };
}

export async function showQuestionBankStatus(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const catalog = await getCatalog({ demo: process.env.CPLIFE_MODE === "demo" });
    response.json({
      source: catalog.source,
      stale: catalog.stale,
      fetched_at: catalog.fetched_at,
      available: catalog.source !== "unavailable",
      error: catalog.error ?? null,
    });
  } catch (error) {
    next(error);
  }
}

export async function listQuestionBankSuggestions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const catalog = await getCatalog({ demo: process.env.CPLIFE_MODE === "demo" });
    if (catalog.source === "unavailable") {
      response.status(503).json({ error: catalog.error ?? "Catálogo Codeforces indisponível." });
      return;
    }
    const [attempts, topics] = await Promise.all([getAttempts(), Promise.resolve(getBuiltinTopics())]);
    response.json({
      items: suggest(catalog.problems, attempts, filtersFromQuery(request.query)),
      catalog: {
        source: catalog.source,
        stale: catalog.stale,
        fetched_at: catalog.fetched_at,
        error: catalog.error ?? null,
      },
      topics,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Filtro ")) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function refreshQuestionBank(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (process.env.CPLIFE_MODE === "demo") {
      response.json(await getCatalog({ demo: true }));
      return;
    }
    const catalog = await getCatalog({ forceRefresh: true });
    if (catalog.source === "unavailable") {
      response.status(503).json({ error: catalog.error ?? "Não foi possível atualizar o catálogo." });
      return;
    }
    response.json(catalog);
  } catch (error) {
    next(error);
  }
}

export async function listQuestionBankTopics(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json(getBuiltinTopics());
  } catch (error) {
    next(error);
  }
}

export async function listQuestionBankTags(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json(await listOfficialCodeforcesTags());
  } catch (error) {
    next(error);
  }
}

export async function addPersonalProblem(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const externalId = typeof request.body?.external_id === "string"
      ? request.body.external_id.trim()
      : "";
    if (!/^cf-\d+-[^\s]+$/.test(externalId)) {
      response.status(400).json({ error: "external_id inválido." });
      return;
    }
    const catalog = await getCatalog({ demo: process.env.CPLIFE_MODE === "demo" });
    const external = catalog.problems.find((item) => item.external_id === externalId);
    if (!external) {
      response.status(404).json({ error: "Questão externa não encontrada no catálogo." });
      return;
    }
    const personal = await readPersonalProblems<Problem>();
    const existing = personal.find((problem) => problem.problem_id === external.external_id);
    if (existing) {
      response.json({ problem: existing, created: false });
      return;
    }
    const problem = toPersonalProblem(external);
    await writePersonalProblems([...personal, problem]);
    response.status(201).json({ problem, created: true });
  } catch (error) {
    next(error);
  }
}

function toPersonalProblem(problem: CodeforcesProblem): Problem {
  const topicIds = problem.topic_mappings.map((mapping) => mapping.topic_id);
  return {
    problem_id: problem.external_id,
    title: problem.title,
    platform: "Codeforces",
    source: "codeforces",
    link: problem.link,
    difficulty_value: problem.rating === null ? "" : String(problem.rating),
    difficulty_source: "codeforces",
    main_topic: topicIds[0] ?? "",
    subtopics: topicIds.slice(1).join(";"),
    created_at: new Date().toISOString(),
  };
}