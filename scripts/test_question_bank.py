"""Testes isolados para sugestões e adição idempotente ao catálogo."""

import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine import recommendations, storage


def run_tests():
    with tempfile.TemporaryDirectory() as tmp:
        original = {name: getattr(storage, name) for name in (
            "DATA_DIR", "PROBLEMS_FILE", "ATTEMPTS_FILE", "TOPICS_FILE",
            "TAXONOMY_FILE", "PROBLEM_TOPICS_FILE", "EXTERNAL_TAGS_FILE",
        )}
        try:
            storage.configure_data_dir(Path(tmp))
            storage.initialize_empty_data()
            external = [
                {"external_id": "cf-1-A", "title": "DP", "rating": 1200, "tags": ["dp"],
                 "solved_count": 50, "topic_mappings": [{"topic_id": "dp_1d"}]},
                {"external_id": "cf-1-B", "title": "DSU", "rating": 1500, "tags": ["dsu"],
                 "solved_count": 20, "topic_mappings": [{"topic_id": "graphs_dsu"}]},
            ]
            suggestions = recommendations.suggest(
                external, [{"problem_id": "cf-1-A"}],
                topic_id="graphs_dsu", rating_min=1400,
            )
            assert [item["external_id"] for item in suggestions] == ["cf-1-B"]
            assert suggestions[0]["attempted"] is False
            assert "tópico selecionado" in suggestions[0]["reason"]

            storage.save_problem({
                "problem_id": "cf-1-B", "title": "DSU", "platform": "Codeforces",
                "source": "Codeforces", "link": "https://codeforces.com/problemset/problem/1/B",
                "difficulty_value": "1500", "difficulty_source": "Codeforces rating",
                "main_topic": "graphs_dsu", "subtopics": "",
            })
            storage.add_attempt({"problem_id": "cf-1-B", "result": "WA", "total_time_min": 10, "help_level": 0})
            storage.save_problem({
                "problem_id": "cf-1-B", "title": "DSU updated", "platform": "Codeforces",
                "source": "Codeforces", "link": "https://codeforces.com/problemset/problem/1/B",
                "difficulty_value": "1500", "difficulty_source": "Codeforces rating",
                "main_topic": "graphs_dsu", "subtopics": "",
            })
            assert len(storage.get_problems()) == 1
            assert len(storage.get_attempts()) == 1
        finally:
            for name, value in original.items():
                setattr(storage, name, value)


if __name__ == "__main__":
    run_tests()
    print("[OK] Testes isolados do banco de questões passaram.")
