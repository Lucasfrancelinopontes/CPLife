import type { Request, Response, NextFunction } from "express";
import { computeMetrics } from "../services/metricsService.js";

export async function showMetrics(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json(await computeMetrics());
  } catch (error) {
    next(error);
  }
}
