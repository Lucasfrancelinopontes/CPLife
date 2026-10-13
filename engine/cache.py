"""Cache persistente de fontes externas, separado dos CSVs pessoais."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, Optional


class CacheError(RuntimeError):
    """Erro explícito ao ler ou gravar cache externo."""


def read_json(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError) as exc:
        raise CacheError(f"Não foi possível ler o cache {path}: {exc}") from exc


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(".tmp")
    try:
        with temp_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
        temp_path.replace(path)
    except OSError as exc:
        raise CacheError(f"Não foi possível gravar o cache {path}: {exc}") from exc


def cache_age_seconds(path: Path, now: Optional[float] = None) -> Optional[float]:
    if not path.exists():
        return None
    return max(0.0, (now or time.time()) - path.stat().st_mtime)
