"""Regressão dos filtros do banco com dados externos determinísticos."""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine import codeforces, recommendations


def run_tests():
    payload = {
        "status": "OK",
        "result": {
            "problems": [
                {"contestId": 1, "index": "A", "name": "DFS similar", "type": "PROGRAMMING",
                 "rating": 1000, "tags": ["dfs and similar", "graphs"]},
                {"contestId": 1, "index": "B", "name": "DFS exact", "type": "PROGRAMMING",
                 "rating": 1500, "tags": ["DFS"]},
                {"contestId": 1, "index": "C", "name": "DP", "type": "PROGRAMMING",
                 "rating": 1500, "tags": ["dp"]},
            ],
            "problemStatistics": [],
        },
    }
    problems = codeforces.parse_problemset(payload)

    def ids(**filters):
        return [item["external_id"] for item in recommendations.suggest(
            problems, [], limit=100, **filters
        )]

    assert ids(rating_min=1500) == ["cf-1-B", "cf-1-C"]
    assert ids(topic_id="graphs_dfs") == ["cf-1-A", "cf-1-B"]
    assert ids(tag="dfs") == ["cf-1-A", "cf-1-B"]
    assert ids(topic_id="graphs_dfs", rating_min=1200) == ["cf-1-B"]
    assert ids(tag="dfs", rating_min=1200) == ["cf-1-B"]
    assert ids(topic_id="graphs_dfs", tag="dfs", rating_min=1200, rating_max=1600) == ["cf-1-B"]

    legacy_cached = [{**problems[0], "topic_mappings": []}]
    assert ids(topic_id="graphs_dfs") == ["cf-1-A", "cf-1-B"]
    assert recommendations.suggest(legacy_cached, [], topic_id="graphs_dfs", limit=100)[0]["external_id"] == "cf-1-A"


if __name__ == "__main__":
    run_tests()
    print("[OK] Regressão dos filtros do banco passou.")
