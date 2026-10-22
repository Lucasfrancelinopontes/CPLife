import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortProblems, loadPublicCatalog, paginateProblems, type PublicProblem } from "../src/services/questionBankSearch";

const problems: PublicProblem[] = [
  { external_id: "cf-1-A", contest_id: 1, index: "A", title: "Graphs and DP", type: "PROGRAMMING", rating: 1200, tags: ["graphs", "dp"], solved_count: 10, link: "https://codeforces.com/problemset/problem/1/A" },
  { external_id: "cf-1-B", contest_id: 1, index: "B", title: "Graphs only", type: "PROGRAMMING", rating: 1600, tags: ["graphs"], solved_count: 30, link: "https://codeforces.com/problemset/problem/1/B" },
  { external_id: "cf-1-C", contest_id: 1, index: "C", title: "DP only", type: "PROGRAMMING", rating: null, tags: ["dp"], solved_count: null, link: "https://codeforces.com/problemset/problem/1/C" },
];
const emptyQuery = { query: "", ratingMin: "", ratingMax: "", selectedTags: [], tagMode: "or" as const, sort: "rating" as const };

test("filters tags with OR and AND, and no tags keeps all problems", () => {
  assert.deepEqual(filterAndSortProblems(problems, { ...emptyQuery, selectedTags: ["graphs", "dp"] }).map((item) => item.external_id), ["cf-1-A", "cf-1-B", "cf-1-C"]);
  assert.deepEqual(filterAndSortProblems(problems, { ...emptyQuery, selectedTags: ["graphs", "dp"], tagMode: "and" }).map((item) => item.external_id), ["cf-1-A"]);
  assert.equal(filterAndSortProblems(problems, emptyQuery).length, 3);
});

test("combines text, rating and tags and puts missing ratings last", () => {
  assert.deepEqual(filterAndSortProblems(problems, { ...emptyQuery, query: "cf-1", ratingMin: "1000", ratingMax: "1300", selectedTags: ["graphs"] }).map((item) => item.external_id), ["cf-1-A"]);
  assert.deepEqual(filterAndSortProblems(problems, emptyQuery).map((item) => item.external_id), ["cf-1-A", "cf-1-B", "cf-1-C"]);
});

test("paginates the complete filtered set and clamps the last page", () => {
  const first = paginateProblems(problems, 1, 2);
  assert.equal(first.totalResults, 3);
  assert.equal(first.totalPages, 2);
  assert.deepEqual(first.items.map((item) => item.external_id), ["cf-1-A", "cf-1-B"]);
  const last = paginateProblems(problems, 2, 2);
  assert.deepEqual(last.items.map((item) => item.external_id), ["cf-1-C"]);
  assert.equal(paginateProblems([], 4, 24).totalPages, 1);
});

test("loads both static files once and reports a failed static catalog", async () => {
  const requests: string[] = [];
  const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
  const loaded = await loadPublicCatalog("/cplife", async (input) => {
    requests.push(String(input));
    return response(String(input).endsWith("tags.json") ? [{ id: "graphs", name: "graphs" }] : { problems });
  });
  assert.equal(loaded.problems.length, 3);
  assert.deepEqual(requests, ["/cplife/data/codeforces-problemset.json", "/cplife/data/codeforces-tags.json"]);
  await assert.rejects(
    loadPublicCatalog("", async () => response({}, false)),
    /arquivos públicos do catálogo/,
  );
});
