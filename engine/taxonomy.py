"""Taxonomia canônica e compatibilidade com o formato legado de tópicos."""

from __future__ import annotations

from pathlib import Path
import re
from typing import Dict, Iterable, List

TAXONOMY_FIELDS = [
    "topic_id",
    "parent_id",
    "name",
    "category",
    "description",
    "aliases",
    "external_tags",
    "icpc_weight",
    "is_builtin",
    "status",
]

PROBLEM_TOPIC_FIELDS = [
    "problem_id",
    "topic_id",
    "source",
    "confidence",
    "is_primary",
]

PERSONAL_TAG_FIELDS = ["problem_id", "tag"]
EXTERNAL_TAG_FIELDS = ["problem_id", "tag", "source"]

LEGACY_TOPIC_MAP = {
    "graphs_bfs": "graphs_bfs",
    "graphs_dfs": "graphs_dfs",
    "graphs_dijkstra": "graphs_dijkstra",
    "dp_1d": "dp_1d",
    "dp_2d": "dp_2d",
    "dp_knapsack": "dp_knapsack",
    "dp_lis": "dp_lis",
    "dp_tree": "dp_tree",
    "dp_bitmask": "dp_bitmask",
    "search_binary_answer": "search_binary_answer",
    "greedy_two_pointers": "greedy_two_pointers",
    "ds_fenwick": "ds_fenwick",
    "ds_segment_tree": "ds_segment_tree",
}


def _topic(
    topic_id: str,
    parent_id: str,
    name: str,
    category: str,
    description: str,
    aliases: str,
    external_tags: str,
    icpc_weight: str = "2.0",
) -> Dict[str, str]:
    return {
        "topic_id": topic_id,
        "parent_id": parent_id,
        "name": name,
        "category": category,
        "description": description,
        "aliases": aliases,
        "external_tags": external_tags,
        "icpc_weight": icpc_weight,
        "is_builtin": "true",
        "status": "active",
    }


BUILTIN_TOPICS = [
    _topic("graphs", "root", "Graphs", "Graphs", "Algoritmos em grafos", "graph;grafos", "graphs"),
    _topic("graphs_bfs", "graphs", "BFS", "Graphs", "Busca em largura", "bfs;breadth first search", "bfs"),
    _topic("graphs_dfs", "graphs", "DFS", "Graphs", "Busca em profundidade", "dfs;depth first search", "dfs"),
    _topic("graphs_dijkstra", "graphs", "Dijkstra", "Graphs", "Menor caminho com pesos não negativos", "dijkstra", "dijkstra"),
    _topic("graphs_shortest_paths", "graphs", "Shortest Paths", "Graphs", "Caminhos mínimos sem classificação específica", "shortest paths;shortest path", "shortest paths"),
    _topic("graphs_mst", "graphs", "MST", "Graphs", "Árvore geradora mínima", "mst;minimum spanning tree", "minimum spanning tree;mst"),
    _topic("graphs_dsu", "graphs", "DSU", "Graphs", "Disjoint Set Union", "dsu;union find", "dsu"),
    _topic("graphs_scc", "graphs", "SCC", "Graphs", "Componentes fortemente conexos", "scc;strongly connected components", "scc"),
    _topic("dp", "root", "DP", "DP", "Programação dinâmica", "dynamic programming", "dp"),
    _topic("dp_1d", "dp", "DP 1D", "DP", "Programação dinâmica linear", "dp 1d", "dp"),
    _topic("dp_2d", "dp", "DP 2D", "DP", "Programação dinâmica em duas dimensões", "dp 2d", "dp"),
    _topic("dp_knapsack", "dp", "Knapsack", "DP", "Problemas de mochila", "knapsack", "knapsack"),
    _topic("dp_lis", "dp", "LIS", "DP", "Longest Increasing Subsequence", "lis", "increasing subsequence"),
    _topic("dp_tree", "dp", "Tree DP", "DP", "Programação dinâmica em árvores", "tree dp", "trees"),
    _topic("dp_bitmask", "dp", "Bitmask DP", "DP", "DP com estados em máscaras", "bitmask dp", "bitmask"),
    _topic("greedy", "root", "Greedy", "Greedy", "Estratégias gulosas", "greedy;guloso", "greedy"),
    _topic("sorting", "root", "Sorting", "Sorting", "Ordenação e técnicas relacionadas", "sorting;ordenacao", "sortings"),
    _topic("binary_search", "root", "Binary Search", "Search", "Busca binária", "binary search", "binary search"),
    _topic("two_pointers", "root", "Two Pointers", "Greedy", "Dois ponteiros e janelas", "two pointers;sliding window", "two pointers;sliding window"),
    _topic("strings", "root", "Strings", "Strings", "Algoritmos para strings", "string;strings", "strings"),
    _topic("math", "root", "Math", "Math", "Matemática", "math;matematica", "math"),
    _topic("number_theory", "math", "Number Theory", "Math", "Teoria dos números", "number theory", "number theory"),
    _topic("data_structures", "root", "Data Structures", "Data Structures", "Estruturas de dados", "data structures", "data structures"),
    _topic("ds_segment_tree", "data_structures", "Segment Tree", "Data Structures", "Árvore de segmentos", "segment tree", "segment tree"),
    _topic("ds_fenwick", "data_structures", "Fenwick Tree", "Data Structures", "Árvore de Fenwick", "fenwick;binary indexed tree", "fenwick;binary indexed tree"),
]


def migrate_legacy_topics(legacy_topics: Iterable[Dict[str, str]]) -> List[Dict[str, str]]:
    """Converte linhas legadas sem modificar seus IDs, nomes ou pesos."""
    migrated = []
    known = set()
    for legacy in legacy_topics:
        topic_id = str(legacy.get("topic_id", "")).strip()
        if not topic_id or topic_id in known:
            continue
        known.add(topic_id)
        migrated.append({
            "topic_id": topic_id,
            "parent_id": _parent_for_legacy(topic_id),
            "name": legacy.get("name", topic_id),
            "category": legacy.get("category", ""),
            "description": legacy.get("notes", ""),
            "aliases": topic_id,
            "external_tags": "",
            "icpc_weight": legacy.get("icpc_weight", "2.0"),
            "is_builtin": "true",
            "status": "active",
        })
    return migrated


def _parent_for_legacy(topic_id: str) -> str:
    if topic_id.startswith("graphs_"):
        return "graphs"
    if topic_id.startswith("dp_"):
        return "dp"
    if topic_id.startswith("ds_"):
        return "data_structures"
    if topic_id.startswith("greedy_"):
        return "greedy"
    if topic_id.startswith("search_"):
        return "binary_search"
    return "root"


def build_taxonomy(legacy_topics: Iterable[Dict[str, str]]) -> List[Dict[str, str]]:
    """Une grupos padrão com os registros legados, priorizando valores legados."""
    legacy = migrate_legacy_topics(legacy_topics)
    by_id = {topic["topic_id"]: topic for topic in BUILTIN_TOPICS}
    for topic in legacy:
        by_id[topic["topic_id"]] = topic
    return list(by_id.values())


def map_external_tags(tags: Iterable[str]) -> List[Dict[str, str]]:
    """Mapeia somente relações conservadoras e deixa ambiguidades sem tópico."""
    normalized = {
        re.sub(r"\s+", " ", str(tag).strip().lower())
        for tag in tags
        if str(tag).strip()
    }
    result = []
    direct = {
        "bfs": ("graphs_bfs", "high"),
        "dfs": ("graphs_dfs", "high"),
        "dijkstra": ("graphs_dijkstra", "high"),
        "dsu": ("graphs_dsu", "high"),
        "mst": ("graphs_mst", "high"),
        "scc": ("graphs_scc", "high"),
        "dp": ("dp", "medium"),
        "segment tree": ("ds_segment_tree", "high"),
        "fenwick": ("ds_fenwick", "high"),
        "binary search": ("binary_search", "high"),
        "two pointers": ("two_pointers", "high"),
    }
    for tag in sorted(normalized):
        if tag in {"shortest paths", "shortest path"}:
            result.append({
                "external_tag": tag,
                "topic_id": "graphs_shortest_paths",
                "confidence": "medium",
            })
            continue
        matched = next(
            (canonical for canonical in direct
             if tag == canonical or tag.startswith(f"{canonical} ")),
            None,
        )
        if matched:
            topic_id, confidence = direct[matched]
            result.append({
                "external_tag": tag,
                "topic_id": topic_id,
                "confidence": confidence,
            })
    return result
