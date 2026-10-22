import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(frontendRoot, "..");
const sourceCatalog = path.join(repositoryRoot, "backend", ".cplife-data", "codeforces-problemset.json");
const sourceTags = path.join(repositoryRoot, "backend", ".cplife-data", "codeforces-tags.json");
const outputDirectory = path.join(frontendRoot, "public", "data");

function fail(message) {
  throw new Error(`Catálogo público inválido: ${message}`);
}

function readJson(filePath) {
  return readFile(filePath, "utf8").then((content) => {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`não foi possível interpretar ${filePath}: ${error.message}`);
    }
  });
}

async function requireSource(filePath) {
  try {
    await access(filePath);
  } catch {
    fail(`arquivo de origem ausente: ${filePath}`);
  }
}

function validateProblem(problem, index) {
  if (!problem || typeof problem !== "object") fail(`questão ${index} não é um objeto`);
  for (const field of ["external_id", "title", "link"]) {
    if (typeof problem[field] !== "string" || !problem[field].trim()) {
      fail(`questão ${index} não possui ${field} válido`);
    }
  }
  if (!/^https:\/\/codeforces\.com\/problemset\/problem\/\d+\/[^/]+$/.test(problem.link)) {
    fail(`link Codeforces inválido na questão ${problem.external_id}`);
  }
  if (problem.rating !== null && problem.rating !== undefined && typeof problem.rating !== "number") {
    fail(`rating inválido na questão ${problem.external_id}`);
  }
  if (problem.solved_count !== undefined && problem.solved_count !== null && typeof problem.solved_count !== "number") {
    fail(`contagem de soluções inválida na questão ${problem.external_id}`);
  }
  if (!Array.isArray(problem.tags) || problem.tags.some((tag) => typeof tag !== "string")) {
    fail(`tags inválidas na questão ${problem.external_id}`);
  }
}

function validateTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) fail("a lista de tags está vazia");
  for (const [index, tag] of tags.entries()) {
    if (!tag || typeof tag !== "object" || typeof tag.id !== "string" || typeof tag.name !== "string") {
      fail(`tag ${index} inválida`);
    }
  }
}

await requireSource(sourceCatalog);
await requireSource(sourceTags);
const catalog = await readJson(sourceCatalog);
const tags = await readJson(sourceTags);
if (!catalog || !Array.isArray(catalog.problems) || catalog.problems.length === 0) {
  fail(`o arquivo ${sourceCatalog} não possui questões`);
}
catalog.problems.forEach(validateProblem);
validateTags(tags);

const ids = new Set();
const publicProblems = catalog.problems.map(({ topic_mappings: _topicMappings, ...problem }) => {
  if (ids.has(problem.external_id)) fail(`identificador duplicado: ${problem.external_id}`);
  ids.add(problem.external_id);
  return problem;
});

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "codeforces-problemset.json"),
  `${JSON.stringify({
    source: "codeforces",
    fetched_at: catalog.fetched_at ?? null,
    problems: publicProblems,
  })}\n`,
);
await writeFile(path.join(outputDirectory, "codeforces-tags.json"), `${JSON.stringify(tags)}\n`);
console.log(`Catálogo público preparado: ${publicProblems.length} questões, ${tags.length} tags.`);
