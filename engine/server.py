"""
Servidor HTTP leve em Python puro (sem dependências externas)
Serve a interface web estática e expõe a API RESTful para manipulação de CSVs.
"""

import http.server
import json
import os
import urllib.parse
from pathlib import Path
from datetime import datetime, timedelta
from . import storage, metrics

BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"


class CPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def _send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        content_len = int(self.headers.get("Content-Length", 0))
        if content_len == 0:
            return {}
        post_data = self.rfile.read(content_len)
        return json.loads(post_data.decode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/metrics":
            data = metrics.compute_all_metrics()
            self._send_json(data)
            return

        elif path == "/api/problems":
            data = storage.get_problems()
            self._send_json(data)
            return

        elif path == "/api/topics":
            data = storage.get_topics()
            self._send_json(data)
            return

        elif path == "/api/reviews":
            data = storage.get_review_queue()
            self._send_json(data)
            return

        elif path == "/api/attempts":
            data = storage.get_attempts()
            self._send_json(data)
            return

        elif path == "/api/contests":
            data = storage.get_contests()
            self._send_json(data)
            return

        elif path == "/api/upsolving":
            data = storage.get_upsolving()
            self._send_json(data)
            return

        elif path == "/api/taxonomy":
            self._send_json({
                "errors": metrics.ERROR_TAXONOMY,
                "labels": metrics.MASTERY_LABELS
            })
            return

        # Servir arquivos estáticos do diretório web
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            body = self._read_json()
        except Exception as e:
            self._send_json({"error": f"JSON inválido: {str(e)}"}, status_code=400)
            return

        # 1. Registrar tentativa rápida
        if path == "/api/attempts":
            try:
                pid = str(body.get("problem_id", "")).strip()
                if not pid:
                    self._send_json({"error": "O campo 'problem_id' é obrigatório."}, status_code=400)
                    return

                # Se o problema ainda não existir no catálogo mestre, cria-o
                existing_prob = storage.get_problem(pid)
                if not existing_prob:
                    prob_data = {
                        "problem_id": pid,
                        "title": body.get("title", pid),
                        "platform": body.get("platform", "Outros"),
                        "source": body.get("source", ""),
                        "link": body.get("link", ""),
                        "difficulty_value": body.get("difficulty_value", ""),
                        "difficulty_source": body.get("difficulty_source", ""),
                        "main_topic": body.get("main_topic", ""),
                        "subtopics": body.get("subtopics", ""),
                        "created_at": datetime.now().strftime("%Y-%m-%d")
                    }
                    storage.save_problem(prob_data)
                else:
                    # Preserva dados existentes no catálogo e preenche apenas se estavam vazios
                    changed = False
                    if body.get("main_topic") and not existing_prob.get("main_topic"):
                        existing_prob["main_topic"] = body.get("main_topic")
                        changed = True
                    if body.get("link") and not existing_prob.get("link"):
                        existing_prob["link"] = body.get("link")
                        changed = True
                    if changed:
                        storage.save_problem(existing_prob)

                # Salva a tentativa
                att_data = {
                    "problem_id": pid,
                    "date": body.get("date") or datetime.now().strftime("%Y-%m-%d"),
                    "result": body.get("result", "AC"),
                    "total_time_min": int(body.get("total_time_min", 0)),
                    "help_level": int(body.get("help_level", 0)),
                    "errors": body.get("errors", ""),
                    "time_complexity": body.get("time_complexity", ""),
                    "space_complexity": body.get("space_complexity", ""),
                    "notes": body.get("notes", ""),
                    "attempt_type": "PRACTICE"
                }
                saved_att = storage.add_attempt(att_data)

                # Agenda revisão se solicitado explicitamente ou se help_level >= 2 ou result != 'AC'
                add_to_review = body.get("add_to_review")
                if add_to_review is True or (add_to_review is None and (int(att_data["help_level"]) >= 2 or att_data["result"] != "AC")):
                    due_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
                    rev_data = {
                        "problem_id": pid,
                        "cycle": "1",
                        "due_date": due_date,
                        "notes": f"Agendado após tentativa com help_level={att_data['help_level']} ({att_data['result']})"
                    }
                    storage.add_to_review_queue(rev_data)

                self._send_json({"success": True, "attempt": saved_att})
            except Exception as e:
                self._send_json({"error": str(e)}, status_code=500)
            return

        # 2. Concluir ou avançar ciclo de revisão
        elif path == "/api/reviews/complete":
            try:
                review_id = body.get("review_id")
                if not review_id:
                    self._send_json({"error": "review_id é obrigatório."}, status_code=400)
                    return

                res = body.get("review_result", "AC")
                time_min = int(body.get("review_time_min", 0))
                help_lvl = int(body.get("review_help_level", 0))
                notes = body.get("notes", "")

                updates = {
                    "status": "COMPLETED",
                    "review_date": datetime.now().strftime("%Y-%m-%d"),
                    "review_result": res,
                    "review_time_min": time_min,
                    "review_help_level": help_lvl,
                    "notes": notes
                }
                updated = storage.update_review_item(review_id, updates)

                # Se o usuário marcou para agendar o próximo ciclo (ex: ciclo 1 -> ciclo 2 em 30 dias)
                schedule_next = body.get("schedule_next_cycle", True)
                if schedule_next and updated and updated.get("cycle") in ["1", "2"] and res == "AC":
                    curr_cycle = int(updated.get("cycle", 1))
                    next_cycle = curr_cycle + 1
                    next_days = 30 if next_cycle == 2 else 90
                    next_due = (datetime.now() + timedelta(days=next_days)).strftime("%Y-%m-%d")
                    
                    next_rev = {
                        "problem_id": updated["problem_id"],
                        "cycle": str(next_cycle),
                        "due_date": next_due,
                        "notes": f"Ciclo {next_cycle} ({next_days}d) agendado após AC com help {help_lvl}"
                    }
                    storage.add_to_review_queue(next_rev)

                # Registra attempt do tipo SPACED_REVIEW para rastrear histórico de retenção
                if updated:
                    storage.add_attempt({
                        "problem_id": updated["problem_id"],
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "result": res,
                        "total_time_min": time_min,
                        "help_level": help_lvl,
                        "errors": "",
                        "notes": f"[Revisão Espaçada Ciclo {updated.get('cycle', '?')}] {notes}".strip(),
                        "attempt_type": "SPACED_REVIEW"
                    })

                self._send_json({"success": True, "review": updated})
            except Exception as e:
                self._send_json({"error": str(e)}, status_code=500)
            return

        # 3. Adicionar/Editar problema no catálogo
        elif path == "/api/problems":
            try:
                pid = str(body.get("problem_id", "")).strip()
                if not pid:
                    self._send_json({"error": "problem_id é obrigatório."}, status_code=400)
                    return
                saved = storage.save_problem(body)
                self._send_json({"success": True, "problem": saved})
            except Exception as e:
                self._send_json({"error": str(e)}, status_code=500)
            return

        # 4. Registrar Contest / Simulado
        elif path == "/api/contests":
            try:
                name = str(body.get("name", "")).strip()
                if not name:
                    self._send_json({"error": "O campo 'name' (Nome do Contest) é obrigatório."}, status_code=400)
                    return

                platform = body.get("platform") or "BOCA"
                contest_date = body.get("contest_date") or datetime.now().strftime("%Y-%m-%d")
                duration_min = int(body.get("duration_min", 300))

                raw_problems = body.get("problems", [])
                problems_count = int(body.get("problems_count", len(raw_problems)))
                solved_count = int(body.get("solved_count", sum(1 for p in raw_problems if p.get("result") == "AC")))
                attempted_count = int(body.get("attempted_count", sum(1 for p in raw_problems if p.get("result") and p.get("result") != "NOT_TRIED")))

                wa_count = int(body.get("wa_count", 0))
                tle_count = int(body.get("tle_count", 0))
                re_count = int(body.get("re_count", 0))
                penalty_min = int(body.get("penalty_min", 0))
                notes = body.get("notes", "")

                existing_contests = storage.get_contests()
                contest_id = body.get("contest_id") or f"contest-{datetime.now().strftime('%Y%m%d')}-{len(existing_contests) + 1:02d}"

                problem_ids = []
                for p_item in raw_problems:
                    pid = str(p_item.get("problem_id", "")).strip()
                    if not pid:
                        continue

                    letter = str(p_item.get("letter", "")).strip().upper()
                    p_res = str(p_item.get("result", "NOT_TRIED")).strip().upper()

                    # Garante que o problema existe no catálogo mestre sem duplicar informações
                    existing_prob = storage.get_problem(pid)
                    if not existing_prob:
                        prob_data = {
                            "problem_id": pid,
                            "title": p_item.get("title") or f"{name} - Problema {letter or pid}",
                            "platform": platform,
                            "source": name,
                            "link": p_item.get("link", ""),
                            "difficulty_value": p_item.get("difficulty_value", ""),
                            "difficulty_source": p_item.get("difficulty_source") or ("ICPC_LA" if "ICPC" in platform.upper() else platform),
                            "main_topic": p_item.get("main_topic", ""),
                            "subtopics": "",
                            "created_at": contest_date
                        }
                        storage.save_problem(prob_data)

                    problem_ids.append(pid)

                    # Adiciona entrada inicial para upsolving
                    failure_reason = ""
                    if p_res == "NOT_TRIED":
                        failure_reason = "não tentei"
                    elif p_res in ["WA", "TLE", "RE"]:
                        failure_reason = p_res

                    upsolve_item = {
                        "contest_id": contest_id,
                        "problem_id": pid,
                        "problem_letter": letter,
                        "contest_result": p_res,
                        "contest_time_min": str(p_item.get("contest_time_min") or ""),
                        "contest_failure_reason": failure_reason,
                        "original_error": "",
                        "upsolve_status": "AC" if p_res == "AC" else "PENDING",
                        "upsolve_result": "AC" if p_res == "AC" else "PENDING",
                        "upsolve_time_min": "",
                        "help_level": "0",
                        "technique_learned": "",
                        "insight": "",
                        "notes": "",
                        "solved_date": contest_date if p_res == "AC" else ""
                    }
                    storage.add_upsolving_item(upsolve_item)

                contest_record = {
                    "contest_id": contest_id,
                    "name": name,
                    "platform": platform,
                    "contest_date": contest_date,
                    "duration_min": duration_min,
                    "problems_count": problems_count,
                    "solved_count": solved_count,
                    "attempted_count": attempted_count,
                    "wa_count": wa_count,
                    "tle_count": tle_count,
                    "re_count": re_count,
                    "penalty_min": penalty_min,
                    "notes": notes,
                    "problem_ids": ";".join(problem_ids)
                }

                saved_contest = storage.add_contest(contest_record)
                self._send_json({"success": True, "contest": saved_contest})
            except Exception as e:
                self._send_json({"error": str(e)}, status_code=500)
            return

        # 5. Atualizar / Registrar Upsolving (Módulo 2B)
        elif path == "/api/upsolving":
            try:
                upsolve_id = str(body.get("upsolve_id", "")).strip()
                if not upsolve_id:
                    self._send_json({"error": "upsolve_id é obrigatório."}, status_code=400)
                    return

                items = storage.get_upsolving()
                existing_item = next((it for it in items if it.get("upsolve_id") == upsolve_id), None)
                if not existing_item:
                    self._send_json({"error": f"Item de upsolving {upsolve_id} não encontrado."}, status_code=404)
                    return

                res = str(body.get("upsolve_result", "AC")).strip().upper()
                status = str(body.get("upsolve_status") or ("AC" if res == "AC" else "IN_PROGRESS")).strip().upper()
                time_min = int(body.get("upsolve_time_min", 0))
                help_lvl = int(body.get("help_level", 0))
                tech = str(body.get("technique_learned", "")).strip()
                insight = str(body.get("insight", "")).strip()
                notes = str(body.get("notes", "")).strip()
                failure_reason = str(body.get("contest_failure_reason", "")).strip()
                orig_err = str(body.get("original_error", "")).strip()
                contest_time = str(body.get("contest_time_min", existing_item.get("contest_time_min", ""))).strip()

                today_str = datetime.now().strftime("%Y-%m-%d")

                updates = {
                    "contest_failure_reason": failure_reason or existing_item.get("contest_failure_reason", ""),
                    "original_error": orig_err or existing_item.get("original_error", ""),
                    "contest_time_min": contest_time,
                    "upsolve_status": status,
                    "upsolve_result": res,
                    "upsolve_time_min": time_min,
                    "help_level": help_lvl,
                    "technique_learned": tech,
                    "insight": insight,
                    "notes": notes,
                    "solved_date": today_str if res == "AC" else existing_item.get("solved_date", "")
                }

                updated = storage.update_upsolving_item(upsolve_id, updates)

                # Busca metadados do contest e do problema para os registros complementares
                cont = storage.get_contest(existing_item.get("contest_id", "")) or {}
                contest_name = cont.get("name", existing_item.get("contest_id", ""))
                prob_id = existing_item.get("problem_id", "")

                # 1. Se foi resolvido com AC, alimenta o histórico de treinamento (attempts.csv)
                if res == "AC":
                    upsolve_note = f"[Upsolve: {contest_name} - Prob {existing_item.get('problem_letter', '')}]"
                    if tech:
                        upsolve_note += f" Técnica: {tech}."
                    if insight:
                        upsolve_note += f" Insight: {insight}."
                    if notes:
                        upsolve_note += f" Obs: {notes}."

                    storage.add_attempt({
                        "problem_id": prob_id,
                        "date": today_str,
                        "result": "AC",
                        "total_time_min": time_min,
                        "help_level": help_lvl,
                        "errors": orig_err,
                        "notes": upsolve_note.strip(),
                        "attempt_type": "UPSOLVE"
                    })

                # 2. Se marcado para enviar para a Fila de Revisão Espaçada (Retenção 7/30/90 dias)
                if body.get("schedule_review"):
                    cycle = str(body.get("review_cycle", "1"))
                    days = 7 if cycle == "1" else (30 if cycle == "2" else 90)
                    due_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
                    rev_data = {
                        "problem_id": prob_id,
                        "cycle": cycle,
                        "due_date": due_date,
                        "notes": f"Revisão ({days}d) pós-upsolve no contest {contest_name} (Ajuda: {help_lvl})"
                    }
                    storage.add_to_review_queue(rev_data)

                # 3. Se marcado para criar Pattern no Caderno de Padrões
                if body.get("create_pattern") and body.get("pattern_title"):
                    pat_data = {
                        "title": str(body.get("pattern_title", "")).strip(),
                        "topic_id": str(body.get("pattern_topic_id", "")).strip(),
                        "related_problems": prob_id,
                        "triggers": str(body.get("pattern_triggers", "")).strip(),
                        "key_idea": str(body.get("pattern_key_idea", "")).strip(),
                        "common_mistakes": orig_err,
                        "complexity": "",
                        "tags": tech
                    }
                    storage.add_pattern(pat_data)

                self._send_json({"success": True, "upsolve": updated})
            except Exception as e:
                self._send_json({"error": str(e)}, status_code=500)
            return

        self._send_json({"error": "Endpoint não encontrado"}, status_code=404)


def run_server(port=8080):
    server_address = ("127.0.0.1", port)
    httpd = http.server.HTTPServer(server_address, CPRequestHandler)
    print(f"==================================================")
    print(f"  Painel de Treinamento ICPC 2027 iniciado!")
    print(f"  URL Local: http://localhost:{port}")
    print(f"  Diretório de dados: {storage.DATA_DIR}")
    print(f"  Pressione Ctrl+C para encerrar o servidor.")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        httpd.server_close()
