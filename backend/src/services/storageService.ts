import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import csv from "csv-parser";
import type {
  Attempt,
  Contest,
  Feedback,
  Pattern,
  Problem,
  ReviewItem,
  Template,
  Topic,
  TrainingSession,
  UpsolvingItem,
  WeeklyReview,
} from "../types/data.js";

const DEMO_DATA_DIR = fileURLToPath(
  new URL("../../../demo_data/", import.meta.url),
);

const PERSONAL_DATA_DIR = process.env.CPLIFE_DATA_DIR
  ? path.resolve(process.env.CPLIFE_DATA_DIR)
  : path.resolve(process.cwd(), ".cplife-data");

function csvPath(filename: string): string {
  return path.join(DEMO_DATA_DIR, filename);
}

async function readCsv<T extends object>(filename: string): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const rows: T[] = [];
    const stream = createReadStream(csvPath(filename), { encoding: "utf8" });

    stream
      .pipe(csv())
      .on("data", (row: T) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (error: Error) => reject(error));
  });
}

async function readJson<T>(filename: string): Promise<T> {
  const content = await readFile(csvPath(filename), "utf8");
  return JSON.parse(content) as T;
}

async function readOptionalJson<T>(filename: string): Promise<T | undefined> {
  try {
    return await readFile(filename, "utf8").then((content) => JSON.parse(content) as T);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function writeJson<T>(filename: string, value: T): Promise<void> {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, filename);
}

export function getProblems(): Promise<Problem[]> {
  return Promise.all([readCsv<Problem>("problems.csv"), readPersonalProblems<Problem>()])
    .then(([demoProblems, personalProblems]) => [...demoProblems, ...personalProblems]);
}

export async function getProblem(problemId: string): Promise<Problem | undefined> {
  const problems = await getProblems();
  return problems.find((problem) => problem.problem_id === problemId);
}

export function getAttempts(): Promise<Attempt[]> {
  return readCsv<Attempt>("attempts.csv");
}

export function getReviewQueue(): Promise<ReviewItem[]> {
  return readCsv<ReviewItem>("review_queue.csv");
}

export function getTrainingSessions(): Promise<TrainingSession[]> {
  return readCsv<TrainingSession>("training_sessions.csv");
}

export function getFeedback(): Promise<Feedback[]> {
  return readCsv<Feedback>("feedback.csv");
}

export function getTopics(): Promise<Topic[]> {
  return readCsv<Topic>("topics.csv");
}

export function getContests(): Promise<Contest[]> {
  return readCsv<Contest>("contests.csv");
}

export function getUpsolving(): Promise<UpsolvingItem[]> {
  return readCsv<UpsolvingItem>("upsolving.csv");
}

export function getPatterns(): Promise<Pattern[]> {
  return readCsv<Pattern>("patterns.csv");
}

export function getTemplates(): Promise<Template[]> {
  return readCsv<Template>("templates.csv");
}

export function getWeeklyReviews(): Promise<WeeklyReview[]> {
  return readCsv<WeeklyReview>("weekly_reviews.csv");
}

export function getCodeforcesProblemset(): Promise<unknown> {
  return readJson<unknown>("codeforces_problemset.json");
}

export function getCodeforcesCachePath(): string {
  return path.join(PERSONAL_DATA_DIR, "codeforces-problemset.json");
}

export function getPersonalProblemsPath(): string {
  return path.join(PERSONAL_DATA_DIR, "personal-problems.json");
}

export function readCodeforcesCache<T>(): Promise<T | undefined> {
  return readOptionalJson<T>(getCodeforcesCachePath());
}

export function writeCodeforcesCache<T>(value: T): Promise<void> {
  return writeJson(getCodeforcesCachePath(), value);
}

export function readPersonalProblems<T>(): Promise<T[]> {
  return readOptionalJson<T[]>(getPersonalProblemsPath()).then((value) => value ?? []);
}

export function writePersonalProblems<T>(value: T[]): Promise<void> {
  return writeJson(getPersonalProblemsPath(), value);
}
