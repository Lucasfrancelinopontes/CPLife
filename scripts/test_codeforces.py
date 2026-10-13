"""Testes sem rede para parser, cache e regras Codeforces."""

import json
import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine import codeforces


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self.payload


def run_tests():
    payload = {
        "status": "OK",
        "result": {
            "problems": [
                {"contestId": 100, "index": "A", "name": "Dijkstra?", "type": "PROGRAMMING",
                 "rating": 1200, "tags": ["shortest paths", "dijkstra", "dp"]},
                {"contestId": 100, "index": "A", "name": "Duplicate", "type": "PROGRAMMING", "tags": []},
                {"contestId": 100, "index": "B", "name": "Question", "type": "QUESTION", "tags": ["greedy"]},
                {"contestId": 100, "index": "C", "name": "No rating", "type": "PROGRAMMING", "tags": ["dsu"]},
                {"index": "D", "name": "No identity", "type": "PROGRAMMING"},
            ],
            "problemStatistics": [
                {"contestId": 100, "index": "A", "solvedCount": 42},
                {"contestId": 100, "index": "C"},
            ],
        },
    }

    def opener(request, timeout):
        assert timeout == codeforces.DEFAULT_TIMEOUT
        return FakeResponse(payload)

    with tempfile.TemporaryDirectory() as tmp:
        cache_path = Path(tmp) / "codeforces.json"
        first = codeforces.refresh_cache(cache_path, now=10.0, opener=opener)
        assert len(first["problems"]) == 2
        item = first["problems"][0]
        assert item["external_id"] == "cf-100-A"
        assert item["link"].endswith("/100/A")
        assert item["solved_count"] == 42
        assert item["rating"] == 1200
        assert {m["topic_id"] for m in item["topic_mappings"]} == {"graphs_shortest_paths", "graphs_dijkstra", "dp"}
        assert codeforces.read_cached_problems(cache_path)[1]["rating"] is None

        try:
            codeforces.refresh_cache(cache_path, now=11.0, last_request_at=10.0, opener=opener)
        except codeforces.CodeforcesError as exc:
            assert "dois segundos" in str(exc)
        else:
            raise AssertionError("A frequência mínima não foi aplicada")

    try:
        codeforces.parse_problemset({"status": "FAILED", "comment": "offline"})
    except codeforces.CodeforcesError as exc:
        assert "offline" in str(exc)
    else:
        raise AssertionError("Resposta FAILED deveria falhar")


if __name__ == "__main__":
    run_tests()
    print("[OK] Testes isolados do Codeforces passaram.")
