import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
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

export function getProblems(): Promise<Problem[]> {
  return readCsv<Problem>("problems.csv");
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
