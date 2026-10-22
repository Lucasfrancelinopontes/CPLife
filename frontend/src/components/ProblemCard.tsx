"use client";

import type { ReactNode } from "react";
import type { Problem, Recommendation } from "../types";

export interface ProblemCardProps {
  problem: Problem | Recommendation;
  onOpen?: (problem: Problem | Recommendation) => void;
  action?: ReactNode;
}

function rating(problem: Problem | Recommendation): string {
  if (typeof problem.rating === "number") return String(problem.rating);
  if ("difficulty_value" in problem && problem.difficulty_value !== undefined && problem.difficulty_value !== "") {
    return String(problem.difficulty_value);
  }
  return "Sem rating";
}

function tags(problem: Problem | Recommendation): string[] {
  return problem.tags?.length
    ? problem.tags
    : problem.topic_mappings?.map((mapping) => mapping.topic_id) ?? [];
}

export function ProblemCard({ problem, onOpen, action }: ProblemCardProps) {
  const problemId = "problem_id" in problem ? problem.problem_id : problem.external_id;
  const handleOpen = () => onOpen?.(problem);

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500/70 hover:bg-slate-800">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{problemId}</p>
            <h3 className="mt-1 line-clamp-2 text-base font-bold text-slate-100">{problem.title}</h3>
          </div>
          <span className="shrink-0 rounded-md bg-sky-500/15 px-2 py-1 text-sm font-bold text-sky-300">
            {rating(problem)}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {tags(problem).length ? (
            tags(problem).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">Sem etiquetas</span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          {"platform" in problem && problem.platform ? <span>{problem.platform}</span> : null}
          {"main_topic" in problem && problem.main_topic ? <span>{problem.main_topic}</span> : null}
          {"attempted" in problem ? <span>{problem.attempted ? "Já praticado" : "Ainda não praticado"}</span> : null}
        </div>
        {"reason" in problem && problem.reason ? (
          <p className="mt-2 text-xs text-slate-500">{problem.reason}</p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        {problem.link ? (
          <a
            href={problem.link}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-sm font-semibold text-sky-400 underline-offset-4 hover:underline"
          >
            Abrir questão
          </a>
        ) : (
          <span className="text-xs text-slate-500">Sem hiperligação</span>
        )}
        {action}
        {onOpen ? (
          <button
            type="button"
            onClick={handleOpen}
            className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
          >
            Selecionar
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default ProblemCard;
