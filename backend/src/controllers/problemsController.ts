import type { Request, Response, NextFunction } from "express";
import { getProblems } from "../services/storageService.js";

export async function listProblems(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json(await getProblems());
  } catch (error) {
    next(error);
  }
}
