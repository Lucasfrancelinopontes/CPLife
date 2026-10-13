"""Testes isolados da taxonomia canônica e das relações múltiplas."""

import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine import metrics, storage, taxonomy


def run_tests():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        original = {
            name: getattr(storage, name)
            for name in (
                "DATA_DIR", "TOPICS_FILE", "TAXONOMY_FILE",
                "PROBLEM_TOPICS_FILE", "PROBLEMS_FILE", "ATTEMPTS_FILE",
                "REVIEW_QUEUE_FILE", "CONTESTS_FILE", "UPSOLVING_FILE",
                "PATTERNS_FILE",
            )
        }
        try:
            storage.configure_data_dir(root)
            storage._write_csv(storage.TOPICS_FILE, storage.TOPIC_FIELDS, [
                {"topic_id": "graphs_dijkstra", "category": "Graphs", "name": "Dijkstra", "icpc_weight": "3.0", "notes": "legado"},
                {"topic_id": "dp_1d", "category": "DP", "name": "DP 1D", "icpc_weight": "2.7", "notes": "legado"},
            ])
            result = storage.migrate_topics_to_taxonomy()
            assert result["legacy_topics"] == 2
            canonical = {row["topic_id"]: row for row in storage.get_topics()}
            assert canonical["graphs_dijkstra"]["icpc_weight"] == "3.0"
            assert canonical["graphs_dijkstra"]["name"] == "Dijkstra"
            assert "graphs_shortest_paths" in canonical

            storage._write_csv(storage.PROBLEMS_FILE, storage.PROBLEM_FIELDS, [
                {"problem_id": "p1", "title": "P1", "platform": "Codeforces", "source": "test", "link": "",
                 "difficulty_value": "1200", "difficulty_source": "rating", "main_topic": "graphs_dijkstra",
                 "subtopics": "", "created_at": "2026-01-01"},
            ])
            storage._write_csv(storage.ATTEMPTS_FILE, storage.ATTEMPT_FIELDS, [])
            storage._write_csv(storage.REVIEW_QUEUE_FILE, storage.REVIEW_FIELDS, [])
            storage._write_csv(storage.CONTESTS_FILE, storage.CONTEST_FIELDS, [])
            storage._write_csv(storage.UPSOLVING_FILE, storage.UPSOLVING_FIELDS, [])
            storage._write_csv(storage.PATTERNS_FILE, storage.PATTERN_FIELDS, [])
            storage.set_problem_topics("p1", ["graphs_dijkstra", "dp_1d"])
            assert storage.get_problem_topic_ids("p1") == ["graphs_dijkstra", "dp_1d"]

            storage.add_attempt({
                "problem_id": "p1", "result": "AC", "total_time_min": 20,
                "help_level": 0, "attempt_type": "PRACTICE",
            })
            result = metrics.compute_all_metrics()
            assert result["summary"]["solved_count"] == 1
            topic_scores = {item["topic_id"]: item for item in result["topics"]}
            assert topic_scores["graphs_dijkstra"]["solved_count"] == 1
            assert topic_scores["dp_1d"]["solved_count"] == 1
            assert sum(1 for item in result["summary"].values() if item == 1) >= 1

            mapped = taxonomy.map_external_tags(["shortest paths", "dijkstra", "greedy"])
            assert {item["topic_id"] for item in mapped} == {"graphs_shortest_paths", "graphs_dijkstra"}
            assert "greedy" not in {item["topic_id"] for item in mapped}
        finally:
            for name, value in original.items():
                setattr(storage, name, value)


if __name__ == "__main__":
    run_tests()
    print("[OK] Testes isolados de taxonomia passaram.")
