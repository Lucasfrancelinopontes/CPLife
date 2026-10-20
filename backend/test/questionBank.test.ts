import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

process.env.CPLIFE_DATA_DIR = await mkdtemp(path.join(tmpdir(), "cplife-test-"));
const codeforces = await import("../src/services/codeforcesService.js");
const recommendations = await import("../src/services/recommendationService.js");

const payload = {
  status: "OK",
  result: {
    problems: [
      { contestId: 1, index: "A", name: "DFS similar", type: "PROGRAMMING", rating: 1000, tags: ["dfs and similar", "graphs"] },
      { contestId: 1, index: "A", name: "Duplicate", type: "PROGRAMMING", tags: [] },
      { contestId: 1, index: "B", name: "DFS exact", type: "PROGRAMMING", rating: 1500, tags: ["DFS"] },
      { contestId: 1, index: "C", name: "No rating", type: "PROGRAMMING", tags: ["dp"] },
      { contestId: 1, index: "D", name: "Question", type: "QUESTION", tags: ["dfs"] },
      { index: "E", name: "No identity", type: "PROGRAMMING" },
    ],
    problemStatistics: [{ contestId: 1, index: "A", solvedCount: 7 }],
  },
};

test("parser validates identity, type, duplicates and absent values", () => {
  const problems = codeforces.parseProblemset(payload);
  assert.deepEqual(problems.map((problem) => problem.external_id), ["cf-1-A", "cf-1-B", "cf-1-C"]);
  assert.equal(problems[0].solved_count, 7);
  assert.equal(problems[2].rating, null);
});

test("filters combine rating, parent topic and partial external tag", () => {
  const problems = codeforces.parseProblemset(payload);
  const results = recommendations.suggest(problems, [], {
    topic_id: "graphs",
    tag: "dfs",
    rating_min: 1200,
    rating_max: 1600,
    attempted: "all",
    limit: 100,
  });
  assert.deepEqual(results.map((problem) => problem.external_id), ["cf-1-B"]);
});

test("catalog caches a successful fetch and falls back after failure", async () => {
  const cachedProblem = codeforces.parseProblemset(payload)[0];
  const fetcher = async () => [cachedProblem];
  const first = await codeforces.getCatalog({ forceRefresh: true, now: 2_000_000, fetcher });
  assert.equal(first.source, "fresh");
  const cachePath = path.join(process.env.CPLIFE_DATA_DIR, "codeforces-problemset.json");
  assert.match(await readFile(cachePath, "utf8"), /cf-1-A/);
  const fallback = await codeforces.getCatalog({ forceRefresh: true, now: 2_000_000 + 3_000, fetcher: async () => { throw new Error("offline"); } });
  assert.equal(fallback.source, "cache");
  assert.equal(fallback.stale, true);
});