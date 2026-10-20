export type AttemptResult = "AC" | "WA" | "TLE" | "RE" | "CE" | "GIVE_UP" | string;

export type ReviewStatus = "PENDING" | "COMPLETED" | string;

export type UpsolvingStatus = "PENDING" | "IN_PROGRESS" | "AC" | "STILL_FAILED" | string;

export interface Problem {
  problem_id: string;
  title: string;
  platform: string;
  source: string;
  link: string;
  difficulty_value: string | number;
  difficulty_source: string;
  main_topic: string;
  subtopics: string;
  created_at: string;
  personal_tags?: string[];
  topic_mappings?: Array<{ topic_id: string; source?: string }>;
  external_id?: string;
  rating?: number | null;
  solved_count?: number | null;
  tags?: string[];
  attempted?: boolean;
}

export interface Attempt {
  attempt_id?: string;
  problem_id: string;
  session_id?: string;
  date: string;
  result: AttemptResult;
  total_time_min: number | string;
  help_level: number | string;
  errors: string;
  time_complexity: string;
  space_complexity: string;
  notes: string;
  attempt_type: string;
  problem_title?: string;
  platform?: string;
  main_topic?: string;
}

export interface ReviewQueueItem {
  review_id: string;
  problem_id: string;
  cycle: number | string;
  added_date?: string;
  due_date: string;
  status: ReviewStatus;
  review_date?: string;
  review_result?: AttemptResult;
  review_time_min?: number | string;
  review_help_level?: number | string;
  notes?: string;
  problem_title?: string;
  platform?: string;
  main_topic?: string;
  difficulty_value?: string | number;
  difficulty_source?: string;
  link?: string;
}

export interface TrainingSession {
  session_id: string;
  date: string;
  duration_min: number | string;
  notes: string;
}

export interface Recommendation {
  external_id: string;
  title: string;
  link: string;
  platform?: string;
  rating?: number | null;
  solved_count?: number | null;
  tags?: string[];
  topic_mappings?: Array<{ topic_id: string; source?: string }>;
  attempted: boolean;
  reason: string;
}

export interface MetricsSummary {
  total_problems: number;
  solved_count: number;
  solo_count: number;
  pure_solo_rate: number;
  weighted_autonomy: number;
  total_time_min: number;
  total_time_hours: number;
  cses_solved: number;
  icpc_solved: number;
  other_solved: number;
  platform_solved_counts: Record<string, number>;
  pending_reviews_count: number;
  due_today_count: number;
  contests_count: number;
  avg_contest_solved: number;
  pending_upsolving_count: number;
  upsolve_solved_count: number;
  first_contact_ac_count: number;
  with_help_ac_count: number;
  review_solo_ac_count: number;
}

export interface TopicMetric {
  topic_id: string;
  name: string;
  category: string;
  icpc_weight: number;
  score: number;
  label: string;
  solved_count: number;
  total_attempts: number;
  explanation: string;
  base_score: number;
  multiplier: number;
  penalty: number;
  avg_help: number;
}

export interface ErrorMetric {
  code: string;
  name: string;
  count: number;
}

export interface UpsolvingItem {
  upsolve_id: string;
  contest_id: string;
  problem_id: string;
  problem_letter: string;
  contest_result: AttemptResult;
  contest_time_min: number | string;
  contest_failure_reason: string;
  original_error: string;
  upsolve_status: UpsolvingStatus;
  upsolve_result: AttemptResult;
  upsolve_time_min: number | string;
  help_level: number | string;
  technique_learned: string;
  insight: string;
  notes: string;
  solved_date: string;
  problem_title?: string;
  link?: string;
  difficulty_value?: string | number;
  difficulty_source?: string;
  main_topic?: string;
  contest_name?: string;
  contest_platform?: string;
  contest_date?: string;
}

export interface Metrics {
  summary: MetricsSummary;
  errors: ErrorMetric[];
  topics: TopicMetric[];
  review_queue: {
    pending: ReviewQueueItem[];
    completed: ReviewQueueItem[];
    due_today_count: number;
  };
  recent_attempts: Attempt[];
  contests: {
    count: number;
    avg_solved: number;
    best_contest: Record<string, string | number> | null;
    pending_upsolving_count: number;
    history: Record<string, string | number>[];
  };
  upsolving: {
    total_count: number;
    pending_count: number;
    in_progress_count: number;
    solved_count: number;
    still_failed_count: number;
    upsolve_rate: number;
    avg_time_min: number;
    avg_help_level: number;
    failure_reasons: Array<{ reason: string; count: number }>;
    top_techniques: Array<{ technique: string; count: number }>;
    contest_errors: ErrorMetric[];
    items: UpsolvingItem[];
  };
}
