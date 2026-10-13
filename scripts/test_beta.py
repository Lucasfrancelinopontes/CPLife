"""Fluxos beta isolados; nunca usa os dados do checkout."""

import json
import sys
import tempfile
import threading
import urllib.request
from http.server import HTTPServer
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine import server, storage


def request(base, path, method="GET", payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        base + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))


def run_beta_tests():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        server.RUNTIME_ROOT = root / "runtime"
        server.CONFIG_FILE = server.RUNTIME_ROOT / "config.json"
        server.configure_runtime()

        httpd = HTTPServer(("127.0.0.1", 0), server.CPRequestHandler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{httpd.server_port}"
        try:
            assert request(base, "/api/status")["ready"] is False
            demo = request(base, "/api/setup", "POST", {"mode": "demo"})
            assert demo["mode"] == "demo"
            demo_problems = request(base, "/api/problems")
            assert len(demo_problems) == 5
            metrics = request(base, "/api/metrics")
            assert metrics["summary"]["solved_count"] >= 3
            problem_ids = {item["problem_id"] for item in demo_problems}
            assert all(item["problem_id"] in problem_ids for item in request(base, "/api/attempts"))
            assert all(item["problem_id"] in problem_ids for item in request(base, "/api/upsolving"))
            original_demo = (storage.DATA_DIR / "problems.csv").read_bytes()

            feedback = request(base, "/api/feedback", "POST", {
                "feedback_type": "bug",
                "module": "Dashboard",
                "title": "Indicador confuso",
                "description": "O texto poderia ser mais claro.",
            })
            assert feedback["success"] is True
            assert request(base, "/api/feedback/export")[0]["title"] == "Indicador confuso"

            storage.add_attempt({
                "problem_id": "demo-grid-path",
                "result": "AC",
                "total_time_min": 10,
                "help_level": 0,
            })
            reset = request(base, "/api/demo/reset", "POST", {})
            assert reset["success"] is True
            assert (storage.DATA_DIR / "problems.csv").read_bytes() == original_demo
            assert len(storage.get_attempts()) == 7

            server.RUNTIME_ROOT = root / "other-runtime"
            server.CONFIG_FILE = server.RUNTIME_ROOT / "config.json"
            server.configure_runtime()
            personal = request(base, "/api/setup", "POST", {"mode": "personal"})
            assert personal["mode"] == "personal"
            assert request(base, "/api/problems") == []
            assert not (root / "other-runtime" / "demo-data" / "problems.csv").exists()
        finally:
            httpd.shutdown()
            thread.join(timeout=2)


if __name__ == "__main__":
    run_beta_tests()
    print("[OK] Fluxos beta isolados passaram com sucesso.")
