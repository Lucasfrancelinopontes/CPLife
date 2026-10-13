"""Cliente conservador e testável para a API pública do Codeforces."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from . import cache, taxonomy

API_URL = "https://codeforces.com/api/problemset.problems"
DEFAULT_TIMEOUT = 15
MIN_REQUEST_INTERVAL = 2.0


class CodeforcesError(RuntimeError):
    """Falha explícita na consulta ou validação da API."""


def _key(contest_id: Any, index: Any) -> Optional[Tuple[int, str]]:
    try:
        if contest_id is None or not str(index).strip():
            return None
        return int(contest_id), str(index).strip()
    except (TypeError, ValueError):
        return None


def parse_problemset(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict) or payload.get("status") != "OK":
        raise CodeforcesError(str(payload.get("comment", "Resposta Codeforces inválida")))
    result = payload.get("result") or {}
    raw_problems = result.get("problems") or []
    raw_statistics = result.get("problemStatistics") or []
    statistics = {
        key: item for item in raw_statistics
        if (key := _key(item.get("contestId"), item.get("index"))) is not None
    }
    parsed = []
    for item in raw_problems:
        key = _key(item.get("contestId"), item.get("index"))
        if key is None or item.get("type") != "PROGRAMMING":
            continue
        contest_id, index = key
        tags = [str(tag).strip() for tag in item.get("tags", []) if str(tag).strip()]
        stat = statistics.get(key, {})
        parsed.append({
            "external_id": f"cf-{contest_id}-{index}",
            "contest_id": contest_id,
            "index": index,
            "title": str(item.get("name") or f"Problem {contest_id}{index}"),
            "type": item.get("type") or "PROGRAMMING",
            "rating": item.get("rating"),
            "tags": list(dict.fromkeys(tags)),
            "solved_count": stat.get("solvedCount"),
            "link": f"https://codeforces.com/problemset/problem/{contest_id}/{index}",
            "topic_mappings": taxonomy.map_external_tags(tags),
        })
    unique = {}
    for item in parsed:
        unique.setdefault(item["external_id"], item)
    return list(unique.values())


def fetch_problemset(
    url: str = API_URL,
    timeout: int = DEFAULT_TIMEOUT,
    opener=urllib.request.urlopen,
) -> List[Dict[str, Any]]:
    request = urllib.request.Request(url, headers={"User-Agent": "CPLife/1.0"})
    try:
        with opener(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
        raise CodeforcesError(f"Falha ao consultar Codeforces: {exc}") from exc
    return parse_problemset(payload)


def refresh_cache(
    cache_path: Path,
    url: str = API_URL,
    now: Optional[float] = None,
    last_request_at: Optional[float] = None,
    opener=urllib.request.urlopen,
) -> Dict[str, Any]:
    current = now or time.time()
    if last_request_at is not None and current - last_request_at < MIN_REQUEST_INTERVAL:
        raise CodeforcesError("Aguarde dois segundos entre consultas ao Codeforces.")
    problems = fetch_problemset(url=url, opener=opener)
    payload = {
        "source": "codeforces",
        "updated_at": current,
        "problems": problems,
    }
    cache.write_json(cache_path, payload)
    return payload


def read_cached_problems(cache_path: Path) -> List[Dict[str, Any]]:
    payload = cache.read_json(cache_path)
    if not payload:
        return []
    return list(payload.get("problems") or [])
