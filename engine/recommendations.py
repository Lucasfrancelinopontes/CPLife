"""Filtros simples e explicáveis para sugestões de treinamento."""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, Iterable, List, Optional, Set

from . import taxonomy

LOGGER = logging.getLogger(__name__)


def _normalize_tag(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _problem_topic_ids(problem: Dict[str, Any]) -> Set[str]:
    mappings = {
        str(item.get("topic_id", "")).strip()
        for item in problem.get("topic_mappings", [])
        if item.get("topic_id")
    }
    mappings.update({
        item["topic_id"]
        for item in taxonomy.map_external_tags(problem.get("tags", []))
        if item.get("topic_id")
    })
    return mappings


def _matches_tag(tags: Iterable[Any], requested: str) -> bool:
    requested = _normalize_tag(requested)
    if not requested:
        return True
    return any(
        tag == requested or tag.startswith(f"{requested} ")
        for tag in (_normalize_tag(item) for item in tags)
    )


def suggest(
    external_problems: Iterable[Dict[str, Any]],
    attempts: Iterable[Dict[str, str]],
    topic_id: str = "",
    rating_min: Optional[int] = None,
    rating_max: Optional[int] = None,
    tag: str = "",
    attempted: str = "unattempted",
    sort: str = "rating",
    limit: int = 20,
    diagnostics: Optional[Dict[str, int]] = None,
) -> List[Dict[str, Any]]:
    attempted_ids: Set[str] = {row.get("problem_id", "") for row in attempts}
    tag = _normalize_tag(tag)
    counts = {"initial": 0, "topic": 0, "rating_min": 0, "rating_max": 0, "tag": 0, "attempted": 0}
    result = []
    for problem in external_problems:
        counts["initial"] += 1
        problem_id = problem.get("external_id", "")
        rating = problem.get("rating")
        mappings = _problem_topic_ids(problem)
        is_attempted = problem_id in attempted_ids
        if topic_id and topic_id.strip() not in mappings:
            continue
        counts["topic"] += 1
        if rating_min is not None and (rating is None or rating < rating_min):
            continue
        counts["rating_min"] += 1
        if rating_max is not None and (rating is None or rating > rating_max):
            continue
        counts["rating_max"] += 1
        if not _matches_tag(problem.get("tags", []), tag):
            continue
        counts["tag"] += 1
        if attempted == "attempted" and not is_attempted:
            continue
        if attempted == "unattempted" and is_attempted:
            continue
        counts["attempted"] += 1
        reason = []
        if topic_id:
            reason.append("tópico selecionado")
        if rating_min is not None or rating_max is not None:
            reason.append("rating dentro da faixa")
        if tag:
            reason.append("tag selecionada")
        reason.append("já praticado" if is_attempted else "ainda não praticado")
        result.append({
            **problem,
            "attempted": is_attempted,
            "reason": ", ".join(reason),
        })

    if diagnostics is not None:
        diagnostics.update(counts)
    LOGGER.debug("Filtros do banco de questões: %s", counts)

    if sort == "solved_count":
        result.sort(key=lambda item: item.get("solved_count") or -1, reverse=True)
    else:
        result.sort(key=lambda item: item.get("rating") or 10**9)
    return result[:max(1, min(limit, 100))]
