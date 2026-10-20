import type { Problem, Topic } from "../types/data.js";

export interface TaxonomyTopic extends Topic {
  parent_id: string;
  description: string;
  aliases: string;
  external_tags: string;
  is_builtin: string;
  status: string;
}

export interface ExternalTagMapping {
  external_tag: string;
  topic_id: string;
  confidence: "high" | "medium";
}

const topic = (
  topic_id: string,
  parent_id: string,
  name: string,
  category: string,
  description: string,
  aliases: string,
  external_tags: string,
  icpc_weight = "2.0",
): TaxonomyTopic => ({
  topic_id, parent_id, name, category, description, aliases, external_tags,
  icpc_weight, notes: "", is_builtin: "true", status: "active",
});

export const BUILTIN_TOPICS: TaxonomyTopic[] = [
  topic("graphs", "root", "Graphs", "Graphs", "Algoritmos em grafos", "graph;grafos", "graphs"),
  topic("graphs_bfs", "graphs", "BFS", "Graphs", "Busca em largura", "bfs;breadth first search", "bfs"),
  topic("graphs_dfs", "graphs", "DFS", "Graphs", "Busca em profundidade", "dfs;depth first search", "dfs"),
  topic("graphs_dijkstra", "graphs", "Dijkstra", "Graphs", "Menor caminho com pesos não negativos", "dijkstra", "dijkstra"),
  topic("graphs_shortest_paths", "graphs", "Shortest Paths", "Graphs", "Caminhos mínimos", "shortest paths;shortest path", "shortest paths"),
  topic("graphs_mst", "graphs", "MST", "Graphs", "Árvore geradora mínima", "mst;minimum spanning tree", "minimum spanning tree;mst"),
  topic("graphs_dsu", "graphs", "DSU", "Graphs", "Disjoint Set Union", "dsu;union find", "dsu"),
  topic("graphs_scc", "graphs", "SCC", "Graphs", "Componentes fortemente conexos", "scc;strongly connected components", "scc"),
  topic("dp", "root", "DP", "DP", "Programação dinâmica", "dynamic programming", "dp"),
  topic("dp_1d", "dp", "DP 1D", "DP", "Programação dinâmica linear", "dp 1d", "dp"),
  topic("dp_2d", "dp", "DP 2D", "DP", "Programação dinâmica em duas dimensões", "dp 2d", "dp"),
  topic("dp_knapsack", "dp", "Knapsack", "DP", "Problemas de mochila", "knapsack", "knapsack"),
  topic("dp_lis", "dp", "LIS", "DP", "Longest Increasing Subsequence", "lis", "increasing subsequence"),
  topic("dp_tree", "dp", "Tree DP", "DP", "Programação dinâmica em árvores", "tree dp", "trees"),
  topic("dp_bitmask", "dp", "Bitmask DP", "DP", "DP com estados em máscaras", "bitmask dp", "bitmask"),
  topic("greedy", "root", "Greedy", "Greedy", "Estratégias gulosas", "greedy;guloso", "greedy"),
  topic("sorting", "root", "Sorting", "Sorting", "Ordenação", "sorting;ordenacao", "sortings"),
  topic("binary_search", "root", "Binary Search", "Search", "Busca binária", "binary search", "binary search"),
  topic("two_pointers", "root", "Two Pointers", "Greedy", "Dois ponteiros e janelas", "two pointers;sliding window", "two pointers;sliding window"),
  topic("strings", "root", "Strings", "Strings", "Algoritmos para strings", "string;strings", "strings"),
  topic("math", "root", "Math", "Math", "Matemática", "math;matematica", "math"),
  topic("number_theory", "math", "Number Theory", "Math", "Teoria dos números", "number theory", "number theory"),
  topic("data_structures", "root", "Data Structures", "Data Structures", "Estruturas de dados", "data structures", "data structures"),
  topic("ds_segment_tree", "data_structures", "Segment Tree", "Data Structures", "Árvore de segmentos", "segment tree", "segment tree"),
  topic("ds_fenwick", "data_structures", "Fenwick Tree", "Data Structures", "Árvore de Fenwick", "fenwick;binary indexed tree", "fenwick;binary indexed tree"),
];

const directMappings: Record<string, [string, "high" | "medium"]> = {
  bfs: ["graphs_bfs", "high"], dfs: ["graphs_dfs", "high"],
  dijkstra: ["graphs_dijkstra", "high"], dsu: ["graphs_dsu", "high"],
  mst: ["graphs_mst", "high"], scc: ["graphs_scc", "high"],
  dp: ["dp", "medium"], "segment tree": ["ds_segment_tree", "high"],
  fenwick: ["ds_fenwick", "high"], "binary search": ["binary_search", "high"],
  "two pointers": ["two_pointers", "high"],
};

export function normalizeTag(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapExternalTags(tags: Iterable<unknown>): ExternalTagMapping[] {
  const normalized = [...new Set([...tags].map(normalizeTag).filter(Boolean))].sort();
  return normalized.flatMap((tag) => {
    if (tag === "shortest paths" || tag === "shortest path") {
      return [{ external_tag: tag, topic_id: "graphs_shortest_paths", confidence: "medium" as const }];
    }
    const key = Object.keys(directMappings).find(
      (candidate) => tag === candidate || tag.startsWith(`${candidate} `),
    );
    if (!key) return [];
    const [topic_id, confidence] = directMappings[key];
    return [{ external_tag: tag, topic_id, confidence }];
  });
}

export function getProblemTopicIds(problem: Problem, mappings: Array<{ topic_id: string }> = []): string[] {
  const related = mappings.map((item) => item.topic_id).filter(Boolean);
  const legacy = [problem.main_topic, ...problem.subtopics.split(";")].filter(Boolean);
  return [...new Set([...related, ...legacy])];
}

export function getBuiltinTopics(): TaxonomyTopic[] {
  return BUILTIN_TOPICS.map((item) => ({ ...item }));
}

export function getDescendantTopicIds(topicId: string): Set<string> {
  const descendants = new Set([topicId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const topic of BUILTIN_TOPICS) {
      if (descendants.has(topic.parent_id) && !descendants.has(topic.topic_id)) {
        descendants.add(topic.topic_id);
        changed = true;
      }
    }
  }
  return descendants;
}
