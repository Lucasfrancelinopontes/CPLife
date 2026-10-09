"""
Bateria de Testes Automatizados com Isolamento Total (Fixtures Temporárias).
Garante que NENHUM dado fictício seja gravado em data/ durante os testes.
"""

import sys
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from engine import storage, metrics

def run_isolated_tests():
    print("=== INICIANDO BATERIA DE TESTES ISOLADOS (MÓDULO 2A) ===")
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        print(f"Ambiente temporário criado em: {tmp_path}")

        # Salva caminhos originais
        orig_data_dir = storage.DATA_DIR
        orig_problems = storage.PROBLEMS_FILE
        orig_attempts = storage.ATTEMPTS_FILE
        orig_topics = storage.TOPICS_FILE
        orig_review = storage.REVIEW_QUEUE_FILE
        orig_contests = storage.CONTESTS_FILE
        orig_upsolving = storage.UPSOLVING_FILE
        orig_patterns = storage.PATTERNS_FILE

        try:
            # Redireciona storage para o diretório temporário
            storage.DATA_DIR = tmp_path
            storage.PROBLEMS_FILE = tmp_path / "problems.csv"
            storage.ATTEMPTS_FILE = tmp_path / "attempts.csv"
            storage.TOPICS_FILE = tmp_path / "topics.csv"
            storage.REVIEW_QUEUE_FILE = tmp_path / "review_queue.csv"
            storage.CONTESTS_FILE = tmp_path / "contests.csv"
            storage.UPSOLVING_FILE = tmp_path / "upsolving.csv"
            storage.PATTERNS_FILE = tmp_path / "patterns.csv"

            # 1. Inicializa CSVs de teste no diretório temporário
            storage._write_csv(storage.TOPICS_FILE, storage.TOPIC_FIELDS, [
                {"topic_id": "graphs_bfs", "category": "Graphs", "name": "BFS", "icpc_weight": "2.5", "notes": ""},
                {"topic_id": "dp_1d", "category": "DP", "name": "DP 1D", "icpc_weight": "2.7", "notes": ""}
            ])

            storage._write_csv(storage.PROBLEMS_FILE, storage.PROBLEM_FIELDS, [
                {
                    "problem_id": "prob-test-1",
                    "title": "Test Problem 1",
                    "platform": "CSES",
                    "source": "CSES",
                    "link": "https://cses.fi/task/1",
                    "difficulty_value": "Easy",
                    "difficulty_source": "CSES",
                    "main_topic": "dp_1d",
                    "subtopics": "",
                    "created_at": "2026-09-26"
                },
                {
                    "problem_id": "prob-test-2",
                    "title": "Test Problem 2 (Contest Problem)",
                    "platform": "ICPC Latin America",
                    "source": "Simulado ICPC 2024",
                    "link": "https://codeforces.com/group/test/2",
                    "difficulty_value": "B",
                    "difficulty_source": "ICPC_LA",
                    "main_topic": "graphs_bfs",
                    "subtopics": "",
                    "created_at": "2026-09-28"
                }
            ])

            storage._write_csv(storage.ATTEMPTS_FILE, storage.ATTEMPT_FIELDS, [])
            storage._write_csv(storage.REVIEW_QUEUE_FILE, storage.REVIEW_FIELDS, [])
            storage._write_csv(storage.CONTESTS_FILE, storage.CONTEST_FIELDS, [])
            storage._write_csv(storage.UPSOLVING_FILE, storage.UPSOLVING_FIELDS, [])
            storage._write_csv(storage.PATTERNS_FILE, storage.PATTERN_FIELDS, [])

            print("[1] Fixtures temporárias criadas com sucesso.")

            # 2. Teste de Registro de Tentativa e Link
            p1 = storage.get_problem("prob-test-1")
            assert p1 is not None, "prob-test-1 deveria existir no fixture"
            assert p1["link"] == "https://cses.fi/task/1", "Link inicial deve ser preservado"

            att = storage.add_attempt({
                "problem_id": "prob-test-1",
                "date": "2026-09-27",
                "result": "AC",
                "total_time_min": 25,
                "help_level": 0,
                "errors": "",
                "notes": "Tentativa solo"
            })
            assert att["attempt_id"].startswith("att-"), "ID da tentativa gerado corretamente"
            print("[2] Registro de tentativa e integridade do link OK.")

            # 3. Teste de Cálculo de Métricas Básicas e Domínio
            m = metrics.compute_all_metrics()
            assert m["summary"]["solved_count"] == 1, "Deveria ter 1 resolvido"
            assert m["summary"]["pure_solo_rate"] == 100.0, "Taxa solo deveria ser 100%"
            assert m["summary"]["contests_count"] == 0, "Inicialmente zero contests"
            print("[3] Cálculo de métricas básicas OK.")

            # 4. Teste de Registro de Contest (Etapa 2A)
            test_contest = {
                "contest_id": "contest-test-01",
                "name": "Simulado ICPC 2024",
                "platform": "BOCA",
                "contest_date": "2026-09-28",
                "duration_min": 300,
                "problems_count": 5,
                "solved_count": 3,
                "attempted_count": 4,
                "wa_count": 2,
                "tle_count": 1,
                "re_count": 0,
                "penalty_min": 320,
                "notes": "Simulado teste de 5h",
                "problem_ids": "prob-test-1;prob-test-2;prob-test-3"
            }
            storage.add_contest(test_contest)
            assert len(storage.get_contests()) == 1, "Deveria ter 1 contest gravado"

            # Adiciona problemas de upsolving vinculados ao contest
            up1 = storage.add_upsolving_item({
                "contest_id": "contest-test-01",
                "problem_id": "prob-test-1",
                "problem_letter": "A",
                "contest_result": "AC",
                "upsolve_status": "AC",
                "upsolve_result": "AC",
                "help_level": "0",
                "technique_learned": "",
                "original_error": "",
                "notes": ""
            })

            up2 = storage.add_upsolving_item({
                "contest_id": "contest-test-01",
                "problem_id": "prob-test-2",
                "problem_letter": "B",
                "contest_result": "WA",
                "contest_failure_reason": "WA",
                "original_error": "C",
                "upsolve_status": "PENDING",
                "upsolve_result": "PENDING",
                "help_level": "0",
                "technique_learned": "",
                "notes": "Estratégia errada"
            })

            # Verifica métricas atualizadas de contests
            m2 = metrics.compute_all_metrics()
            assert m2["summary"]["contests_count"] == 1, "Deveria ter 1 contest nas métricas"
            assert m2["summary"]["avg_contest_solved"] == 3.0, "Média de resolvidos deveria ser 3.0"
            assert m2["summary"]["pending_upsolving_count"] == 1, "Deveria haver 1 problema pendente de upsolving"
            assert m2["contests"]["best_contest"]["name"] == "Simulado ICPC 2024"
            print("[4] Registro de contest e métricas de competição OK.")

            # 5. Teste de Upsolving (Etapa 2B)
            # Atualiza o item B que estava com WA para resolvido (AC) com técnica e insight
            updated_up2 = storage.update_upsolving_item(up2["upsolve_id"], {
                "upsolve_status": "AC",
                "upsolve_result": "AC",
                "upsolve_time_min": "35",
                "help_level": "1",
                "technique_learned": "Two Pointers com multiset",
                "insight": "Manter a janela ordenada com multiset para consulta O(1)",
                "notes": "Resolvido após pequena dica de estrutura",
                "solved_date": "2026-09-29"
            })
            assert updated_up2 is not None, "Item de upsolving deveria ser atualizado com sucesso"
            assert updated_up2["upsolve_status"] == "AC", "Status de upsolve deve ser AC"
            assert updated_up2["technique_learned"] == "Two Pointers com multiset"

            # Registra attempt de treino pós-upsolve (como feito pelo endpoint /api/upsolving)
            storage.add_attempt({
                "problem_id": "prob-test-2",
                "date": "2026-09-29",
                "result": "AC",
                "total_time_min": 35,
                "help_level": 1,
                "errors": "C",
                "notes": "[Upsolve: Simulado ICPC 2024 - Prob B] Técnica: Two Pointers com multiset"
            })

            # Agenda na fila de retenção espaçada (Ciclo 1 - 7 dias)
            storage.add_to_review_queue({
                "problem_id": "prob-test-2",
                "cycle": "1",
                "due_date": "2026-10-06",
                "notes": "Revisão pós-upsolve no contest Simulado ICPC 2024"
            })

            # Adiciona ao Caderno de Padrões (Patterns)
            pat = storage.add_pattern({
                "title": "Two Pointers com Janela Deslizante Ordenada",
                "topic_id": "graphs_bfs",
                "related_problems": "prob-test-2",
                "triggers": "Manter k-ésimo menor elemento dinâmico em janela deslizante",
                "key_idea": "Balancear dois multisets ou multiset único com iterador",
                "common_mistakes": "C",
                "complexity": "O(N log K)",
                "tags": "Two Pointers com multiset"
            })
            assert pat["pattern_id"].startswith("pat-"), "ID do pattern gerado corretamente"
            assert len(storage.get_patterns()) == 1, "Caderno de Patterns deve ter 1 pattern gravado"

            # Valida métricas completas de Upsolving (Etapa 2B)
            m3 = metrics.compute_all_metrics()
            up_m = m3["upsolving"]
            assert up_m["total_count"] == 1, f"Total de upsolve deveria ser 1 (exclui AC direto de prova), obteve {up_m['total_count']}"
            assert up_m["solved_count"] == 1, f"Resolvidos no upsolve deveria ser 1, obteve {up_m['solved_count']}"
            assert up_m["pending_count"] == 0, f"Pendentes deveria ser 0, obteve {up_m['pending_count']}"
            assert up_m["upsolve_rate"] == 100.0, f"Taxa de upsolve deveria ser 100%, obteve {up_m['upsolve_rate']}"
            assert up_m["avg_time_min"] == 35.0, f"Tempo médio deveria ser 35m, obteve {up_m['avg_time_min']}"
            assert up_m["avg_help_level"] == 1.0, f"Ajuda média deveria ser 1.0, obteve {up_m['avg_help_level']}"
            assert len(up_m["failure_reasons"]) >= 1 and up_m["failure_reasons"][0]["reason"] == "WA"
            assert len(up_m["top_techniques"]) >= 1 and up_m["top_techniques"][0]["technique"] == "Two Pointers com multiset"
            assert m3["summary"]["upsolve_solved_count"] == 1, "Resumo deve contabilizar 1 upsolve resolvido"

            print("[5] Atualização de upsolving, métricas pós-contest, patterns e revisão OK.")

        finally:
            # Restaura caminhos originais
            storage.DATA_DIR = orig_data_dir
            storage.PROBLEMS_FILE = orig_problems
            storage.ATTEMPTS_FILE = orig_attempts
            storage.TOPICS_FILE = orig_topics
            storage.REVIEW_QUEUE_FILE = orig_review
            storage.CONTESTS_FILE = orig_contests
            storage.UPSOLVING_FILE = orig_upsolving
            storage.PATTERNS_FILE = orig_patterns

    print("\n[OK] TODOS OS TESTES ISOLADOS PASSARAM COM SUCESSO!")
    print("[OK] Diretório real Documentos/CP/data permaneceu 100% intacto.")

if __name__ == "__main__":
    run_isolated_tests()
