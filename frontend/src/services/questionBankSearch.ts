export interface PublicProblem {
  external_id: string;
  contest_id: number;
  index: string;
  title: string;
  type: string;
  rating: number | null;
  tags: string[];
  solved_count?: number | null;
  link: string;
}

export interface SearchFilters {
  query: string;
  ratingMin: string;
  ratingMax: string;
  selectedTags: string[];
  tagMode: "or" | "and";
  sort: "rating" | "solved_count";
}

export interface PageResult {
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  items: PublicProblem[];
}

export interface PublicCatalog {
  problems: PublicProblem[];
  tags: Array<{ id: string; name: string; is_official?: boolean }>;
}

export async function loadPublicCatalog(
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  fetcher: typeof fetch = fetch,
): Promise<PublicCatalog> {
  const dataPath = (file: string) => `${basePath}/data/${file}`;
  const [catalogResponse, tagsResponse] = await Promise.all([
    fetcher(dataPath("codeforces-problemset.json")),
    fetcher(dataPath("codeforces-tags.json")),
  ]);
  if (!catalogResponse.ok || !tagsResponse.ok) {
    throw new Error("Os arquivos públicos do catálogo não estão disponíveis.");
  }
  const [catalog, tagsPayload] = await Promise.all([catalogResponse.json(), tagsResponse.json()]);
  const tags = Array.isArray(tagsPayload) ? tagsPayload : [];
  if (tags.some((tag) => !tag || typeof tag.name !== "string")) {
    throw new Error("O arquivo público de tags possui um formato inválido.");
  }
  return {
    problems: validatePublicProblems(catalog),
    tags,
  };
}

function numericOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function filterAndSortProblems(
  problems: readonly PublicProblem[],
  filters: SearchFilters,
): PublicProblem[] {
  const query = filters.query.trim().toLocaleLowerCase();
  const minimum = numericOrUndefined(filters.ratingMin);
  const maximum = numericOrUndefined(filters.ratingMax);
  const selectedTags = new Set(filters.selectedTags.map((tag) => tag.toLocaleLowerCase()));

  return problems
    .map((problem, originalIndex) => ({ problem, originalIndex }))
    .filter(({ problem }) => {
      if (
        query &&
        !`${problem.external_id} ${problem.index} ${problem.title}`
          .toLocaleLowerCase()
          .includes(query)
      ) return false;
      if (minimum !== undefined && (problem.rating === null || problem.rating < minimum)) return false;
      if (maximum !== undefined && (problem.rating === null || problem.rating > maximum)) return false;
      if (selectedTags.size) {
        const problemTags = new Set(problem.tags.map((tag) => tag.toLocaleLowerCase()));
        const matches = [...selectedTags].filter((tag) => problemTags.has(tag));
        if (filters.tagMode === "and" ? matches.length !== selectedTags.size : matches.length === 0) return false;
      }
      return true;
    })
    .sort((left, right) => {
      const leftValue = filters.sort === "solved_count" ? left.problem.solved_count : left.problem.rating;
      const rightValue = filters.sort === "solved_count" ? right.problem.solved_count : right.problem.rating;
      if (leftValue === null || leftValue === undefined) return rightValue === null || rightValue === undefined ? left.originalIndex - right.originalIndex : 1;
      if (rightValue === null || rightValue === undefined) return -1;
      const difference = filters.sort === "solved_count"
        ? rightValue - leftValue
        : leftValue - rightValue;
      return difference || left.originalIndex - right.originalIndex;
    })
    .map(({ problem }) => problem);
}

export function paginateProblems(
  problems: readonly PublicProblem[],
  requestedPage: number,
  pageSize = 24,
): PageResult {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(problems.length / safePageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), totalPages);
  const start = (page - 1) * safePageSize;
  return {
    page,
    pageSize: safePageSize,
    totalResults: problems.length,
    totalPages,
    items: problems.slice(start, start + safePageSize),
  };
}

export function validatePublicProblems(value: unknown): PublicProblem[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { problems?: unknown }).problems)) {
    throw new Error("O catálogo público não possui uma lista de questões válida.");
  }
  const problems = (value as { problems: unknown[] }).problems;
  if (problems.some((problem) => {
    if (!problem || typeof problem !== "object") return true;
    const candidate = problem as Partial<PublicProblem>;
    return typeof candidate.external_id !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.link !== "string" ||
      !Array.isArray(candidate.tags);
  })) {
    throw new Error("O catálogo público contém uma questão inválida.");
  }
  return problems as PublicProblem[];
}
