import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

process.env.CPLIFE_DATA_DIR = await mkdtemp(path.join(tmpdir(), "cplife-tags-test-"));
const tags = await import("../src/services/codeforcesTagService.js");
const storage = await import("../src/services/storageService.js");

test("initializes exactly the 38 official Codeforces tags", async () => {
  const initialized = await tags.initializeCodeforcesTags();
  assert.equal(initialized.filter((tag) => tag.is_official).length, 38);
  assert.equal(new Set(initialized.map((tag) => tag.id)).size, 38);
  assert.equal(new Set(initialized.map((tag) => tag.name)).size, 38);
  assert.equal(initialized.find((tag) => tag.name === "*special")?.id, "special");
  assert.equal(initialized.find((tag) => tag.name === "meet-in-the-middle")?.id, "meet-in-the-middle");
});

test("initialization is idempotent and preserves unknown tags", async () => {
  const pathToTags = storage.getCodeforcesTagsPath();
  const current = await tags.initializeCodeforcesTags();
  await writeFile(pathToTags, JSON.stringify([
    ...current,
    {
      id: "future-tag",
      name: "future official tag",
      source: "codeforces",
      is_official: false,
      active: true,
      description: "student data",
    },
  ]));
  const initialized = await tags.initializeCodeforcesTags();
  assert.equal(initialized.filter((tag) => tag.id === "future-tag").length, 1);
  assert.equal(initialized.length, 39);
  assert.equal((await readFile(pathToTags, "utf8")).match(/future-tag/g)?.length, 1);
});

test("normalizes names without changing stored spelling and reports unknown values", () => {
  const result = tags.validateCodeforcesTags([" DFS AND SIMILAR ", "dp", "not-a-real-tag", "not-a-real-tag"]);
  assert.deepEqual(result.known.map((tag) => tag.name), ["dfs and similar", "dp"]);
  assert.deepEqual(result.unknown, ["not-a-real-tag"]);
  assert.equal(tags.resolveOfficialCodeforcesTag("  DP ")?.name, "dp");
  assert.equal(tags.getOfficialCodeforcesTag("dsu")?.name, "dsu");
});