import { readCodeforcesTags, writeCodeforcesTags } from "./storageService.js";
import type { CodeforcesTag } from "../types/data.js";

const OFFICIAL_TAG_NAMES = [
  "*special",
  "2-sat",
  "binary search",
  "bitmasks",
  "brute force",
  "chinese remainder theorem",
  "combinatorics",
  "communication",
  "constructive algorithms",
  "data structures",
  "dfs and similar",
  "divide and conquer",
  "dp",
  "dsu",
  "expression parsing",
  "fft",
  "flows",
  "games",
  "geometry",
  "graph matchings",
  "graphs",
  "greedy",
  "hashing",
  "implementation",
  "interactive",
  "math",
  "matrices",
  "meet-in-the-middle",
  "number theory",
  "probabilities",
  "schedules",
  "shortest paths",
  "sortings",
  "string suffix structures",
  "strings",
  "ternary search",
  "trees",
  "two pointers",
] as const;

export function normalizeCodeforcesTag(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function codeforcesTagId(value: unknown): string {
  return normalizeCodeforcesTag(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createOfficialTag(name: string): CodeforcesTag {
  return {
    id: codeforcesTagId(name),
    name,
    source: "codeforces",
    is_official: true,
    active: true,
    description: "",
  };
}

export const OFFICIAL_CODEFORCES_TAGS: readonly CodeforcesTag[] =
  OFFICIAL_TAG_NAMES.map(createOfficialTag);

export interface ValidatedCodeforcesTags {
  known: CodeforcesTag[];
  unknown: string[];
}

export function validateCodeforcesTags(values: Iterable<unknown>): ValidatedCodeforcesTags {
  const catalog = new Map(OFFICIAL_CODEFORCES_TAGS.map((tag) => [normalizeCodeforcesTag(tag.name), tag]));
  const known = new Map<string, CodeforcesTag>();
  const unknown = new Set<string>();

  for (const value of values) {
    const normalized = normalizeCodeforcesTag(value);
    if (!normalized) continue;
    const tag = catalog.get(normalized);
    if (tag) known.set(tag.id, tag);
    else unknown.add(normalized);
  }

  return { known: [...known.values()], unknown: [...unknown].sort() };
}

export function getOfficialCodeforcesTag(tagId: string): CodeforcesTag | undefined {
  return OFFICIAL_CODEFORCES_TAGS.find((tag) => tag.id === tagId);
}

export function resolveOfficialCodeforcesTag(name: string): CodeforcesTag | undefined {
  const normalized = normalizeCodeforcesTag(name);
  return OFFICIAL_CODEFORCES_TAGS.find((tag) => normalizeCodeforcesTag(tag.name) === normalized);
}

function isTagRecord(value: unknown): value is CodeforcesTag {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CodeforcesTag>;
  return typeof item.id === "string"
    && typeof item.name === "string"
    && typeof item.source === "string"
    && typeof item.is_official === "boolean"
    && typeof item.active === "boolean"
    && typeof item.description === "string";
}

export async function initializeCodeforcesTags(): Promise<CodeforcesTag[]> {
  const existing = await readCodeforcesTags();
  const records = Array.isArray(existing) ? existing.filter(isTagRecord) : [];
  const byId = new Map(records.map((tag) => [tag.id, tag]));

  for (const official of OFFICIAL_CODEFORCES_TAGS) {
    if (!byId.has(official.id)) byId.set(official.id, { ...official });
  }

  const tags = [...byId.values()];
  if (!existing || tags.length !== existing.length) await writeCodeforcesTags(tags);
  return tags;
}

export async function listOfficialCodeforcesTags(): Promise<CodeforcesTag[]> {
  return (await initializeCodeforcesTags()).filter((tag) => tag.source === "codeforces" && tag.is_official);
}