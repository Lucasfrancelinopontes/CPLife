"""
Módulo de cálculo de métricas e diagnóstico do treinamento para ICPC 2027.
Implementa métricas transparentes, auditáveis e explicáveis baseadas nos dados CSV.
"""

from datetime import datetime, date
from typing import Dict, List, Any
from . import storage

ERROR_TAXONOMY = {
    "A": "Não entendi o problema",
    "B": "Não reconheci a técnica",
    "C": "Estratégia errada",
    "D": "Raciocínio/prova errada",
    "E": "Complexidade (TLE/MLE)",
    "F": "Implementação / Bug lógico",
    "G": "Edge case não considerado",
    "H": "Bug de C++ / STL",
    "I": "Overflow / Tipos numéricos",
    "J": "Leitura desatenta"
}

MASTERY_LABELS = [
    (0.0, 0.9, "Sem Prática"),
    (1.0, 1.9, "Contato Inicial"),
    (2.0, 2.9, "Básico"),
    (3.0, 3.9, "Funcional"),
    (4.0, 4.9, "Sólido"),
    (5.0, 5.0, "Domínio Elevado")
]

def get_mastery_label(score: float) -> str:
    for low, high, label in MASTERY_LABELS:
        if low <= score <= high:
            return label
    return "Domínio Elevado" if score >= 5.0 else "Sem Prática"


def _parse_difficulty_points(diff_val: str) -> float:
    """Classifica a pontuação base por dificuldade de forma flexível."""
    val = (diff_val or "").strip().lower()
    if not val:
        return 0.3
    # Se for rating numérico
    if val.isdigit():
        num = int(val)
        if num >= 1800:
            return 0.8
        elif num >= 1400:
            return 0.5
        else:
            return 0.3
    # Strings descritivas
    if any(k in val for k in ["hard", "diff", "dificil"]):
        return 0.8
    if any(k in val for k in ["medium", "medio", "inter"]):
        return 0.5
    return 0.3


def compute_all_metrics() -> Dict[str, Any]:
    problems = storage.get_problems()
    attempts = storage.get_attempts()
    topics = storage.get_topics()
    reviews = storage.get_review_queue()

    problems_by_id = {p["problem_id"]: p for p in problems}
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Helper: normaliza attempt_type (registros antigos sem o campo -> PRACTICE)
    def _atype(att: dict) -> str:
        t = str(att.get("attempt_type") or "PRACTICE").strip().upper()
        return t if t in {"PRACTICE", "UPSOLVE", "SPACED_REVIEW"} else "PRACTICE"

    # 1. Agrupamento de tentativas por problema
    attempts_by_problem = {}
    for att in attempts:
        pid = att.get("problem_id")
        if pid not in attempts_by_problem:
            attempts_by_problem[pid] = []
        attempts_by_problem[pid].append(att)

    # Segmentação global por tipo
    practice_attempts   = [a for a in attempts if _atype(a) == "PRACTICE"]
    upsolve_attempts    = [a for a in attempts if _atype(a) == "UPSOLVE"]
    review_att_list     = [a for a in attempts if _atype(a) == "SPACED_REVIEW"]

    # 2. Resumo Geral de Desempenho
    total_problems = len(problems)
    total_time_min = sum(int(att.get("total_time_min") or 0) for att in attempts)

    solved_problem_ids = set()
    solo_problem_ids = set()
    practice_solved_ids = set()   # AC em tentativa PRACTICE (1º contato real)
    cses_solved = set()
    icpc_solved = set()

    for pid, p_attempts in attempts_by_problem.items():
        prob = problems_by_id.get(pid, {})
        has_ac = any(a.get("result") == "AC" for a in p_attempts)
        if has_ac:
            solved_problem_ids.add(pid)
            platform = prob.get("platform", "").upper()
            if "CSES" in platform:
                cses_solved.add(pid)
            if "ICPC" in platform:
                icpc_solved.add(pid)

            # Solo estrito: pelo menos um AC com help_level == 0 (qualquer tipo)
            if any(a.get("result") == "AC" and int(a.get("help_level") or 0) == 0 for a in p_attempts):
                solo_problem_ids.add(pid)

            # Resolvido em prática direta (PRACTICE AC)
            if any(a.get("result") == "AC" and _atype(a) == "PRACTICE" for a in p_attempts):
                practice_solved_ids.add(pid)

    solved_count = len(solved_problem_ids)
    solo_count = len(solo_problem_ids)
    pure_solo_rate = round((solo_count / solved_count * 100), 1) if solved_count > 0 else 0.0

    # Autonomia: calculada apenas sobre ACs do tipo PRACTICE
    # (upsolves e reviews não devem inflar a autonomia de prática)
    practice_ac = [a for a in practice_attempts if a.get("result") == "AC"]
    ac_attempts = [a for a in attempts if a.get("result") == "AC"]  # mantido para uso legado
    if practice_ac:
        autonomy_sum = sum((4 - int(a.get("help_level") or 0)) / 4.0 for a in practice_ac)
        weighted_autonomy = round((autonomy_sum / len(practice_ac)) * 100, 1)
    else:
        weighted_autonomy = 0.0

    # Contadores por tipo de AC
    practice_ac_count  = len([a for a in practice_ac if True])
    upsolve_ac_count   = len([a for a in upsolve_attempts if a.get("result") == "AC"])
    review_ac_count    = len([a for a in review_att_list if a.get("result") == "AC"])
    solo_ac_count      = len([a for a in ac_attempts if a.get("result") == "AC" and int(a.get("help_level") or 0) == 0])
    with_help_ac_count = len([a for a in ac_attempts if a.get("result") == "AC" and int(a.get("help_level") or 0) > 0])


    # 3. Distribuição de Erros A-J
    error_counts = {code: 0 for code in ERROR_TAXONOMY}
    for att in attempts:
        err_str = att.get("errors", "")
        if err_str:
            codes = [c.strip().upper() for c in err_str.replace(",", ";").split(";") if c.strip()]
            for c in codes:
                if c in error_counts:
                    error_counts[c] += 1

    error_distribution = [
        {
            "code": code,
            "name": ERROR_TAXONOMY[code],
            "count": count
        }
        for code, count in sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # 4. Domínio por Tópico (Fórmula Transparente e Auditável)
    # Escala consistente: Base até 3.5 pts | Multiplicador de 0.3x a 1.4x | Penalidade até 0.5 pts
    # attempt_type distingue a qualidade dos ACs:
    #   PRACTICE     → conta integralmente na base e autonomia
    #   UPSOLVE      → conta 60% na base (confirmou competência pós-contest) e usa seu help_level no multiplicador
    #   SPACED_REVIEW → não conta na base (retenção), mas melhora o multiplicador de autonomia
    topic_metrics = []
    for topic in topics:
        tid = topic["topic_id"]
        tname = topic["name"]
        cat = topic["category"]
        icpc_weight = float(topic.get("icpc_weight") or 2.0)

        # Problemas pertencentes a este tópico
        topic_problems = [p for p in problems if p.get("main_topic") == tid]
        t_problem_ids = {p["problem_id"] for p in topic_problems}

        t_attempts = [a for a in attempts if a.get("problem_id") in t_problem_ids]
        t_ac_attempts = [a for a in t_attempts if a.get("result") == "AC"]

        # Separa ACs por tipo dentro do tópico
        t_practice_ac = [a for a in t_ac_attempts if _atype(a) == "PRACTICE"]
        t_upsolve_ac  = [a for a in t_ac_attempts if _atype(a) == "UPSOLVE"]
        t_review_ac   = [a for a in t_ac_attempts if _atype(a) == "SPACED_REVIEW"]

        # Base de volume e dificuldade:
        # PRACTICE → peso 1.0 | UPSOLVE → peso 0.6 | SPACED_REVIEW → peso 0 (retorção, não volume)
        base_points = 0.0
        solved_in_topic = set()
        for a in t_practice_ac:
            pid = a["problem_id"]
            if pid not in solved_in_topic:
                solved_in_topic.add(pid)
                prob = problems_by_id.get(pid, {})
                base_points += _parse_difficulty_points(prob.get("difficulty_value", ""))

        # Upsolves adicionam problemas novos na base com peso 0.6
        for a in t_upsolve_ac:
            pid = a["problem_id"]
            if pid not in solved_in_topic:
                solved_in_topic.add(pid)
                prob = problems_by_id.get(pid, {})
                base_points += _parse_difficulty_points(prob.get("difficulty_value", "")) * 0.6

        base_score = min(3.5, round(base_points, 2))

        # Multiplicador de autonomia:
        # Usa PRACTICE + UPSOLVE para o cálculo (ajuda real no momento da resolução).
        # SPACED_REVIEW não entra: reflete retenção, não dificuldade de aprender.
        t_scored_ac = t_practice_ac + t_upsolve_ac
        if t_scored_ac:
            avg_help = sum(int(a.get("help_level") or 0) for a in t_scored_ac) / len(t_scored_ac)
            # Fórmula linear exata: 0 ajuda -> 1.4x | 4 ajuda -> 0.3x
            multiplier = 0.3 + 1.1 * ((4.0 - avg_help) / 4.0)
        else:
            avg_help = 0.0
            multiplier = 1.0

        # Penalidade de erros conceituais recentes (B: não reconheceu técnica, C: estratégia errada, D: prova errada)
        conceptual_errors = 0
        for a in t_attempts[-5:]:  # olha as últimas 5 tentativas no tópico
            errs = (a.get("errors") or "").upper()
            if "B" in errs: conceptual_errors += 1
            if "C" in errs: conceptual_errors += 1
            if "D" in errs: conceptual_errors += 1
        
        penalty = min(0.5, round(conceptual_errors * 0.1, 2))

        # Cálculo final do score de domínio
        if len(solved_in_topic) == 0:
            final_score = 0.0
        else:
            raw_score = (base_score * multiplier) - penalty
            final_score = max(0.0, min(5.0, round(raw_score, 2)))

        label = get_mastery_label(final_score)
        explanation = (
            f"Base: {base_score:.1f} pts ({len(t_practice_ac)} PRACTICE + {len(t_upsolve_ac)}×0.6 UPSOLVE AC) "
            f"× Autonomia: {multiplier:.2f}x (Ajuda média: {avg_help:.1f}) "
            f"- Penalidade Erros: {penalty:.1f} pts"
            + (f" | +{len(t_review_ac)} revisões retidas" if t_review_ac else "")
        )

        topic_metrics.append({
            "topic_id": tid,
            "name": tname,
            "category": cat,
            "icpc_weight": icpc_weight,
            "score": final_score,
            "label": label,
            "solved_count": len(solved_in_topic),
            "total_attempts": len(t_attempts),
            "explanation": explanation,
            "base_score": base_score,
            "multiplier": round(multiplier, 2),
            "penalty": penalty,
            "avg_help": round(avg_help, 1)
        })

    # Ordena tópicos por categoria e depois por nome
    topic_metrics.sort(key=lambda x: (x["category"], -x["score"]))

    # 5. Fila de Revisão Espaçada
    pending_reviews = []
    completed_reviews = []
    due_today_count = 0

    for rev in reviews:
        pid = rev.get("problem_id", "")
        prob = problems_by_id.get(pid, {})
        rev_info = {
            **rev,
            "problem_title": prob.get("title", pid),
            "platform": prob.get("platform", "Outros"),
            "main_topic": prob.get("main_topic", ""),
            "difficulty_value": prob.get("difficulty_value", ""),
            "difficulty_source": prob.get("difficulty_source", ""),
            "link": prob.get("link", "")
        }

        if rev.get("status") == "PENDING":
            pending_reviews.append(rev_info)
            due_date = rev.get("due_date", "")
            if due_date and due_date <= today_str:
                due_today_count += 1
        else:
            completed_reviews.append(rev_info)

    # Ordena pendentes por data de vencimento
    pending_reviews.sort(key=lambda x: x.get("due_date", "9999-99-99"))

    # 6. Histórico Recente de Tentativas
    recent_attempts = []
    for att in reversed(attempts[-10:]):
        pid = att.get("problem_id")
        prob = problems_by_id.get(pid, {})
        recent_attempts.append({
            **att,
            "problem_title": prob.get("title", pid),
            "platform": prob.get("platform", "Outros"),
            "main_topic": prob.get("main_topic", "")
        })

    # 7. Métricas de Contests (Módulo 2A)
    contests = storage.get_contests()
    upsolving_list = storage.get_upsolving()

    contests_count = len(contests)
    total_contest_solved = sum(int(c.get("solved_count") or 0) for c in contests)
    avg_solved_per_contest = round(total_contest_solved / contests_count, 1) if contests_count > 0 else 0.0

    best_contest = None
    if contests:
        best_contest = max(
            contests,
            key=lambda c: (
                int(c.get("solved_count") or 0),
                -int(c.get("penalty_min") or 999999)
            )
        )

    # 8. Métricas de Upsolving (Módulo 2B)
    contests_by_id = {c["contest_id"]: c for c in contests}

    enriched_upsolving = []
    failure_reasons_count = {}
    techniques_learned_count = {}
    contest_errors_count = {code: 0 for code in ERROR_TAXONOMY}

    pending_upsolve = 0
    in_progress_upsolve = 0
    solved_upsolve = 0
    still_failed_upsolve = 0

    upsolve_times = []
    upsolve_helps = []
    solo_upsolve_count = 0

    for u in upsolving_list:
        pid = u.get("problem_id", "")
        cid = u.get("contest_id", "")
        prob = problems_by_id.get(pid, {})
        cont = contests_by_id.get(cid, {})

        status = u.get("upsolve_status") or ("AC" if u.get("contest_result") == "AC" else "PENDING")
        res = u.get("upsolve_result") or status

        # Apenas problemas que não foram AC durante o contest entram na esteira de upsolve
        if u.get("contest_result") != "AC":
            if status == "PENDING":
                pending_upsolve += 1
            elif status == "IN_PROGRESS":
                in_progress_upsolve += 1
            elif status == "AC" or res == "AC":
                solved_upsolve += 1
                try:
                    t = int(u.get("upsolve_time_min") or 0)
                    if t > 0: upsolve_times.append(t)
                except ValueError:
                    pass
                try:
                    h = int(u.get("help_level") or 0)
                    upsolve_helps.append(h)
                    if h == 0:
                        solo_upsolve_count += 1
                except ValueError:
                    pass
            elif status == "STILL_FAILED":
                still_failed_upsolve += 1

            # Motivos de falha no contest
            reason = (u.get("contest_failure_reason") or "").strip()
            if reason:
                failure_reasons_count[reason] = failure_reasons_count.get(reason, 0) + 1

            # Erros originais do contest (A a J)
            orig_err = u.get("original_error", "")
            if orig_err:
                for c_code in [c.strip().upper() for c in orig_err.replace(",", ";").split(";") if c.strip()]:
                    if c_code in contest_errors_count:
                        contest_errors_count[c_code] += 1

            # Técnicas aprendidas no upsolve
            tech = (u.get("technique_learned") or "").strip()
            if tech:
                techniques_learned_count[tech] = techniques_learned_count.get(tech, 0) + 1

        enriched_upsolving.append({
            **u,
            "upsolve_status": status,
            "upsolve_result": res,
            "problem_title": prob.get("title", pid),
            "link": prob.get("link", ""),
            "difficulty_value": prob.get("difficulty_value", ""),
            "difficulty_source": prob.get("difficulty_source", ""),
            "main_topic": prob.get("main_topic", ""),
            "contest_name": cont.get("name", cid),
            "contest_platform": cont.get("platform", ""),
            "contest_date": cont.get("contest_date", "")
        })

    total_upsolve_target = pending_upsolve + in_progress_upsolve + solved_upsolve + still_failed_upsolve
    upsolve_rate = round(solved_upsolve / total_upsolve_target * 100, 1) if total_upsolve_target > 0 else 0.0
    avg_upsolve_time = round(sum(upsolve_times) / len(upsolve_times), 1) if upsolve_times else 0.0
    avg_upsolve_help = round(sum(upsolve_helps) / len(upsolve_helps), 1) if upsolve_helps else 0.0

    # Distinções de AC no treinamento (Item 6):
    # 1. AC no primeiro contato: problemas cujo primeiro attempt foi AC
    first_contact_ac_count = 0
    for pid, p_atts in attempts_by_problem.items():
        if p_atts and p_atts[0].get("result") == "AC":
            first_contact_ac_count += 1

    # 2. AC com ajuda: attempts AC com help > 0
    with_help_ac_count = sum(1 for a in ac_attempts if int(a.get("help_level") or 0) > 0)

    # 3. AC solo em revisão: reviews concluídas com help == 0
    review_solo_ac_count = sum(1 for r in reviews if r.get("status") == "COMPLETED" and int(r.get("review_help_level") or 99) == 0)

    return {
        "summary": {
            "total_problems": total_problems,
            "solved_count": solved_count,
            "solo_count": solo_count,
            "pure_solo_rate": pure_solo_rate,
            "weighted_autonomy": weighted_autonomy,
            "total_time_min": total_time_min,
            "total_time_hours": round(total_time_min / 60.0, 1),
            "cses_solved": len(cses_solved),
            "icpc_solved": len(icpc_solved),
            "other_solved": max(0, solved_count - len(cses_solved) - len(icpc_solved)),
            "pending_reviews_count": len(pending_reviews),
            "due_today_count": due_today_count,
            "contests_count": contests_count,
            "avg_contest_solved": avg_solved_per_contest,
            "pending_upsolving_count": pending_upsolve + in_progress_upsolve,
            "upsolve_solved_count": solved_upsolve,
            "first_contact_ac_count": first_contact_ac_count,
            "with_help_ac_count": with_help_ac_count,
            "review_solo_ac_count": review_solo_ac_count
        },
        "errors": error_distribution,
        "topics": topic_metrics,
        "review_queue": {
            "pending": pending_reviews,
            "completed": completed_reviews,
            "due_today_count": due_today_count
        },
        "recent_attempts": recent_attempts,
        "contests": {
            "count": contests_count,
            "avg_solved": avg_solved_per_contest,
            "best_contest": best_contest,
            "pending_upsolving_count": pending_upsolve + in_progress_upsolve,
            "history": list(reversed(contests))
        },
        "upsolving": {
            "total_count": total_upsolve_target,
            "pending_count": pending_upsolve,
            "in_progress_count": in_progress_upsolve,
            "solved_count": solved_upsolve,
            "still_failed_count": still_failed_upsolve,
            "upsolve_rate": upsolve_rate,
            "avg_time_min": avg_upsolve_time,
            "avg_help_level": avg_upsolve_help,
            "solo_upsolve_count": solo_upsolve_count,
            "failure_reasons": sorted([{"reason": k, "count": v} for k, v in failure_reasons_count.items()], key=lambda x: -x["count"]),
            "top_techniques": sorted([{"technique": k, "count": v} for k, v in techniques_learned_count.items()], key=lambda x: -x["count"]),
            "contest_errors": sorted([{"code": k, "name": ERROR_TAXONOMY[k], "count": v} for k, v in contest_errors_count.items() if v > 0], key=lambda x: -x["count"]),
            "items": list(reversed(enriched_upsolving))
        }
    }


