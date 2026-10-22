import type { Request, Response, NextFunction } from "express";
import { getAttempts } from "../services/storageService.js";
import {
  getCatalog,
  type CodeforcesProblem,
} from "../services/codeforcesService.js";
import { suggest, type RecommendationFilters } from "../services/recommendationService.js";

function optionalInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) throw new Error(`Filtro ${name} inválido.`);
  return parsed;
}

export async function listRecommendations(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = request.query;
    const filters: RecommendationFilters = {
      topic_id: typeof query.topic_id === "string" ? query.topic_id : undefined,
      rating_min: optionalInteger(query.rating_min, "rating_min"),
      rating_max: optionalInteger(query.rating_max, "rating_max"),
      tag: typeof query.tag === "string" ? query.tag : undefined,
      attempted: typeof query.attempted === "string" ? query.attempted : "unattempted",
      sort: typeof query.sort === "string" ? query.sort : "rating",
      limit: optionalInteger(query.limit, "limit"),
    };
    const [catalog, attempts] = await Promise.all([getCatalog(), getAttempts()]);
    if (catalog.source === "unavailable") {
      response.status(503).json({ error: catalog.error ?? "Catálogo Codeforces indisponível." });
      return;
    }
    const problems = catalog.problems as CodeforcesProblem[];
    response.json(suggest(problems, attempts, filters));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Filtro ")) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
}
