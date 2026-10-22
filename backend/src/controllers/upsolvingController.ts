import type { Request, Response, NextFunction } from "express";
import { getUpsolving } from "../services/storageService.js";

export async function listUpsolving(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    response.json(await getUpsolving());
  } catch (error) {
    next(error);
  }
}
