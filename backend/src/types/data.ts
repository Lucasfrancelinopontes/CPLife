export interface Problem {
  problem_id: string;
  title: string;
  platform: string;
  source: string;
  link: string;
  difficulty_value: string;
  difficulty_source: string;
  main_topic: string;
  subtopics: string;
  created_at: string;
}

export interface CodeforcesTag {
  id: string;
  name: string;
  source: "codeforces";
  is_official: boolean;
  active: boolean;
  description: string;
}

export interface Attempt {
  attempt_id: string;
  problem_id: string;
  session_id: string;
  date: string;
  result: string;
  total_time_min: string;
  help_level: string;
  errors: string;
  time_complexity: string;
  space_complexity: string;
  notes: string;
  attempt_type: string;
}

export interface ReviewItem {
  review_id: string;
  problem_id: string;
  cycle: string;
  added_date: string;
  due_date: string;
  status: string;
  review_date: string;
  review_result: string;
  review_time_min: string;
  review_help_level: string;
  notes: string;
}

export interface TrainingSession {
  session_id: string;
  date: string;
  duration_min: string;
  notes: string;
}

export interface Feedback {
  feedback_id: string;
  created_at: string;
  feedback_type: string;
  module: string;
  title: string;
  description: string;
  reproduction_steps: string;
  expected_result: string;
  observed_result: string;
  severity: string;
}

export interface Topic {
  topic_id: string;
  category: string;
  name: string;
  icpc_weight: string;
  notes: string;
}

export interface Contest {
  contest_id: string;
  name: string;
  platform: string;
  contest_date: string;
  duration_min: string;
  problems_count: string;
  solved_count: string;
  attempted_count: string;
  wa_count: string;
  tle_count: string;
  re_count: string;
  penalty_min: string;
  notes: string;
  problem_ids: string;
}

export interface UpsolvingItem {
  upsolve_id: string;
  contest_id: string;
  problem_id: string;
  problem_letter: string;
  contest_result: string;
  contest_time_min: string;
  contest_failure_reason: string;
  original_error: string;
  upsolve_status: string;
  upsolve_result: string;
  upsolve_time_min: string;
  help_level: string;
  technique_learned: string;
  insight: string;
  notes: string;
  solved_date: string;
}

export interface Pattern {
  pattern_id: string;
  title: string;
  topic_id: string;
  related_problems: string;
  triggers: string;
  key_idea: string;
  common_mistakes: string;
  complexity: string;
  tags: string;
}

export interface Template {
  template_id: string;
  title: string;
  language: string;
  path: string;
  tags: string;
  notes: string;
}

export interface WeeklyReview {
  review_id: string;
  week_start: string;
  summary: string;
  next_focus: string;
}
