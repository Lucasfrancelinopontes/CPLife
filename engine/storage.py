"""
Módulo de persistência e manipulação de arquivos CSV em Documentos/CP/data.
Garante leitura, escrita e integridade referencial com problem_id como catálogo mestre.
"""

import csv
import os
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

PROBLEMS_FILE = DATA_DIR / "problems.csv"
ATTEMPTS_FILE = DATA_DIR / "attempts.csv"
TOPICS_FILE = DATA_DIR / "topics.csv"
REVIEW_QUEUE_FILE = DATA_DIR / "review_queue.csv"
TRAINING_SESSIONS_FILE = DATA_DIR / "training_sessions.csv"
CONTESTS_FILE = DATA_DIR / "contests.csv"
UPSOLVING_FILE = DATA_DIR / "upsolving.csv"
PATTERNS_FILE = DATA_DIR / "patterns.csv"
TEMPLATES_FILE = DATA_DIR / "templates.csv"
WEEKLY_REVIEWS_FILE = DATA_DIR / "weekly_reviews.csv"


def _read_csv(filepath: Path) -> List[Dict[str, str]]:
    if not filepath.exists():
        return []
    with open(filepath, mode="r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def _write_csv(filepath: Path, fieldnames: List[str], rows: List[Dict[str, Any]]):
    filepath.parent.mkdir(parents=True, exist_ok=True)
    temp_file = filepath.with_suffix(".tmp")
    with open(temp_file, mode="w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            clean_row = {k: ("" if row.get(k) is None else str(row.get(k))) for k in fieldnames}
            writer.writerow(clean_row)
    # Substitui de forma segura
    if filepath.exists():
        os.replace(temp_file, filepath)
    else:
        temp_file.rename(filepath)


# ==========================================
# 1. Catálogo Mestre: Problems
# ==========================================
PROBLEM_FIELDS = [
    "problem_id", "title", "platform", "source", "link",
    "difficulty_value", "difficulty_source", "main_topic", "subtopics", "created_at"
]

def get_problems() -> List[Dict[str, str]]:
    return _read_csv(PROBLEMS_FILE)

def get_problem(problem_id: str) -> Optional[Dict[str, str]]:
    problems = get_problems()
    for p in problems:
        if p.get("problem_id") == problem_id:
            return p
    return None

def save_problem(problem_data: Dict[str, Any]) -> Dict[str, str]:
    problems = get_problems()
    pid = str(problem_data.get("problem_id", "")).strip()
    if not pid:
        raise ValueError("problem_id é obrigatório.")
    
    # Se created_at não foi passado, define a data de hoje
    if not problem_data.get("created_at"):
        problem_data["created_at"] = datetime.now().strftime("%Y-%m-%d")

    updated = False
    for i, p in enumerate(problems):
        if p.get("problem_id") == pid:
            problems[i] = {**p, **problem_data}
            updated = True
            break
    if not updated:
        problems.append(problem_data)

    _write_csv(PROBLEMS_FILE, PROBLEM_FIELDS, problems)
    return problem_data


# ==========================================
# 2. Tentativas: Attempts
# ==========================================
# Valores válidos para attempt_type:
#   PRACTICE     — tentativa normal de treinamento (default)
#   UPSOLVE      — resolução pós-contest (gerada automaticamente pelo módulo 2B)
#   SPACED_REVIEW — resolução durante revisão espaçada 7/30/90 dias
ATTEMPT_FIELDS = [
    "attempt_id", "problem_id", "session_id", "date", "result",
    "total_time_min", "help_level", "errors", "time_complexity",
    "space_complexity", "notes", "attempt_type"
]

VALID_ATTEMPT_TYPES = {"PRACTICE", "UPSOLVE", "SPACED_REVIEW"}

def get_attempts() -> List[Dict[str, str]]:
    return _read_csv(ATTEMPTS_FILE)

def add_attempt(attempt_data: Dict[str, Any]) -> Dict[str, str]:
    attempts = get_attempts()
    if not attempt_data.get("attempt_id"):
        attempt_data["attempt_id"] = f"att-{len(attempts) + 1:04d}"
    if not attempt_data.get("date"):
        attempt_data["date"] = datetime.now().strftime("%Y-%m-%d")

    # Garante attempt_type válido; default PRACTICE
    atype = str(attempt_data.get("attempt_type") or "PRACTICE").strip().upper()
    if atype not in VALID_ATTEMPT_TYPES:
        atype = "PRACTICE"
    attempt_data["attempt_type"] = atype

    # Validações essenciais
    pid = attempt_data.get("problem_id", "").strip()
    if not pid:
        raise ValueError("problem_id é obrigatório.")
    if not attempt_data.get("result"):
        raise ValueError("result é obrigatório (AC, WA, TLE, etc.).")
    if attempt_data.get("total_time_min") is None:
        raise ValueError("total_time_min é obrigatório.")
    if attempt_data.get("help_level") is None:
        raise ValueError("help_level (0 a 4) é obrigatório.")

    attempts.append(attempt_data)
    _write_csv(ATTEMPTS_FILE, ATTEMPT_FIELDS, attempts)
    return attempt_data


def migrate_attempts_type() -> int:
    """
    Migração segura dos dados históricos:
    - Lê todos os registros de attempts.csv.
    - Para cada registro sem attempt_type (vazio ou ausente), define PRACTICE.
    - NÃO altera registros que já possuem attempt_type definido.
    - Reescreve o CSV com o novo campo.
    - Retorna a quantidade de registros migrados.

    Esta função é idempotente: pode ser executada múltiplas vezes sem risco.
    Deve ser chamada UMA ÚNICA VEZ via script explícito:
        python -c "from engine import storage; print(storage.migrate_attempts_type(), 'migrados')"
    """
    attempts = get_attempts()
    migrated = 0
    for att in attempts:
        atype = str(att.get("attempt_type") or "").strip().upper()
        if atype not in VALID_ATTEMPT_TYPES:
            att["attempt_type"] = "PRACTICE"
            migrated += 1
    _write_csv(ATTEMPTS_FILE, ATTEMPT_FIELDS, attempts)
    return migrated


# ==========================================
# 3. Tópicos: Topics
# ==========================================
TOPIC_FIELDS = ["topic_id", "category", "name", "icpc_weight", "notes"]

def get_topics() -> List[Dict[str, str]]:
    return _read_csv(TOPICS_FILE)

def get_topics_dict() -> Dict[str, Dict[str, str]]:
    topics = get_topics()
    return {t["topic_id"]: t for t in topics}


# ==========================================
# 4. Fila de Revisão: Review Queue
# ==========================================
REVIEW_FIELDS = [
    "review_id", "problem_id", "cycle", "added_date", "due_date",
    "status", "review_date", "review_result", "review_time_min",
    "review_help_level", "notes"
]

def get_review_queue() -> List[Dict[str, str]]:
    return _read_csv(REVIEW_QUEUE_FILE)

def add_to_review_queue(review_data: Dict[str, Any]) -> Dict[str, str]:
    queue = get_review_queue()
    if not review_data.get("review_id"):
        review_data["review_id"] = f"rev-{len(queue) + 1:04d}"
    if not review_data.get("added_date"):
        review_data["added_date"] = datetime.now().strftime("%Y-%m-%d")
    if not review_data.get("status"):
        review_data["status"] = "PENDING"
    if not review_data.get("cycle"):
        review_data["cycle"] = "1"

    queue.append(review_data)
    _write_csv(REVIEW_QUEUE_FILE, REVIEW_FIELDS, queue)
    return review_data

def update_review_item(review_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, str]]:
    queue = get_review_queue()
    updated_item = None
    for i, item in enumerate(queue):
        if item.get("review_id") == review_id:
            queue[i] = {**item, **updates}
            updated_item = queue[i]
            break
    if updated_item:
        _write_csv(REVIEW_QUEUE_FILE, REVIEW_FIELDS, queue)
    return updated_item


# ==========================================
# 5. Contests e Upsolving
# ==========================================
CONTEST_FIELDS = [
    "contest_id", "name", "platform", "contest_date", "duration_min",
    "problems_count", "solved_count", "attempted_count", "wa_count",
    "tle_count", "re_count", "penalty_min", "notes", "problem_ids"
]

UPSOLVING_FIELDS = [
    "upsolve_id", "contest_id", "problem_id", "problem_letter",
    "contest_result", "contest_time_min", "contest_failure_reason",
    "original_error", "upsolve_status", "upsolve_result", "upsolve_time_min",
    "help_level", "technique_learned", "insight", "notes", "solved_date"
]

def get_contests() -> List[Dict[str, str]]:
    return _read_csv(CONTESTS_FILE)

def get_contest(contest_id: str) -> Optional[Dict[str, str]]:
    contests = get_contests()
    for c in contests:
        if c.get("contest_id") == contest_id:
            return c
    return None

def add_contest(contest_data: Dict[str, Any]) -> Dict[str, str]:
    contests = get_contests()
    if not contest_data.get("contest_id"):
        contest_data["contest_id"] = f"contest-{datetime.now().strftime('%Y%m%d')}-{len(contests) + 1:02d}"
    if not contest_data.get("contest_date"):
        contest_data["contest_date"] = datetime.now().strftime("%Y-%m-%d")
    
    contests.append(contest_data)
    _write_csv(CONTESTS_FILE, CONTEST_FIELDS, contests)
    return contest_data

def get_upsolving() -> List[Dict[str, str]]:
    return _read_csv(UPSOLVING_FILE)

def add_upsolving_item(upsolve_data: Dict[str, Any]) -> Dict[str, str]:
    items = get_upsolving()
    if not upsolve_data.get("upsolve_id"):
        upsolve_data["upsolve_id"] = f"up-{len(items) + 1:04d}"
    if not upsolve_data.get("upsolve_status"):
        upsolve_data["upsolve_status"] = "AC" if upsolve_data.get("contest_result") == "AC" else "PENDING"
    if not upsolve_data.get("upsolve_result"):
        upsolve_data["upsolve_result"] = "AC" if upsolve_data.get("contest_result") == "AC" else "PENDING"
    items.append(upsolve_data)
    _write_csv(UPSOLVING_FILE, UPSOLVING_FIELDS, items)
    return upsolve_data

def update_upsolving_item(upsolve_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, str]]:
    items = get_upsolving()
    updated_item = None
    for i, it in enumerate(items):
        if it.get("upsolve_id") == upsolve_id:
            items[i] = {**it, **updates}
            updated_item = items[i]
            break
    if updated_item:
        _write_csv(UPSOLVING_FILE, UPSOLVING_FIELDS, items)
    return updated_item


# ==========================================
# 6. Patterns, Templates & Weekly Reviews
# ==========================================
PATTERN_FIELDS = [
    "pattern_id", "title", "topic_id", "related_problems", "triggers",
    "key_idea", "common_mistakes", "complexity", "tags"
]

def get_patterns() -> List[Dict[str, str]]:
    return _read_csv(PATTERNS_FILE)

def add_pattern(pattern_data: Dict[str, Any]) -> Dict[str, str]:
    patterns = get_patterns()
    if not pattern_data.get("pattern_id"):
        pattern_data["pattern_id"] = f"pat-{len(patterns) + 1:04d}"
    patterns.append(pattern_data)
    _write_csv(PATTERNS_FILE, PATTERN_FIELDS, patterns)
    return pattern_data

def get_templates() -> List[Dict[str, str]]:
    return _read_csv(TEMPLATES_FILE)

def get_weekly_reviews() -> List[Dict[str, str]]:
    return _read_csv(WEEKLY_REVIEWS_FILE)


