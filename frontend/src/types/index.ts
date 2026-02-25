// Auth
export interface JoinResponse {
  token: string;
  participant_id: string;
  experiment_id: string;
  group: string | null;
  current_step: string;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
  display_name: string | null;
}

// Demographics
export interface DemographicsData {
  gender: string;
  age_range: string;
  education_level: string;
  investment_experience: string;
  risk_preference: string;
  extra?: Record<string, unknown>;
}

// Questionnaire
export interface QuestionOption {
  key: string;
  text: string;
}

export interface QuestionItem {
  id: string;
  text: string;
  options: QuestionOption[];
  category?: string;
}

export interface QuestionnaireData {
  questionnaire_id: string;
  phase: string;
  questions: QuestionItem[];
  total: number;
}

export interface AnswerResponse {
  is_correct: boolean | null;
  explanation: string | null;
  show_explanation: boolean;
}

export interface CompleteResponse {
  score: number;
  total_questions: number;
  correct_count: number;
  bias_level: string | null;
  next_step: string;
}

// Trading
export interface StockPrice {
  symbol: string;
  price: number;
  direction: string | null;
  change_pct?: number | null;
}

export interface HoldingInfo {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  pnl: number;
  pnl_pct: number;
}

export interface TradingState {
  session_id: string;
  round_num: number;
  current_period: number;
  total_periods: number;
  observation_periods: number;
  is_observation: boolean;
  status: string;
  cash: number;
  holdings: HoldingInfo[];
  total_value: number;
  prices: StockPrice[];
  price_history: StockPrice[][];
  pnl: number;
  pnl_pct: number;
}

export interface TradeActionResponse {
  success: boolean;
  message: string;
  new_cash: number;
  period_advanced: boolean;
  new_period: number;
  is_last_period: boolean;
}

export interface GuidanceSubmitResponse {
  actual_up_prob: number;
  shows_bias: boolean;
  bias_message: string | null;
}

export interface SettlementData {
  round_num: number;
  initial_cash: number;
  final_cash: number;
  final_portfolio_value: number;
  pnl: number;
  pnl_pct: number;
  total_trades: number;
  behavioral_fallacy_score: number | null;
  streak_reversal_ratio: number | null;
  next_step: string;
}

// Analysis
export interface CognitiveDimension {
  pre_test_score: number;
  post_test_score: number;
  improvement: number;
  bias_level: string;
}

export interface BehavioralDimension {
  round1_fallacy_score: number | null;
  round2_fallacy_score: number | null;
  improvement: number | null;
  streak_reversal_ratio_r1: number | null;
  streak_reversal_ratio_r2: number | null;
}

export interface InvestorProfile {
  type_name: string;
  description: string;
  consistency_score: number;
}

export interface ComprehensiveAnalysis {
  cognitive: CognitiveDimension;
  behavioral: BehavioralDimension;
  profile: InvestorProfile;
  group: string;
}

export interface RoundComparison {
  round1_pnl: number;
  round1_pnl_pct: number;
  round2_pnl: number;
  round2_pnl_pct: number;
  pnl_improvement: number;
  round1_fallacy_score: number | null;
  round2_fallacy_score: number | null;
  fallacy_improvement: number | null;
}

export interface FinalResults {
  comparison: RoundComparison;
  cognitive: CognitiveDimension;
  behavioral: BehavioralDimension;
  profile: InvestorProfile;
  group: string;
  education_received: string;
  had_guidance: boolean;
}

// Education
export interface EducationSection {
  heading: string;
  body: string;
  image_url?: string | null;
}

export interface EducationExample {
  scenario: string;
  correct_thinking: string;
}

export interface EducationContent {
  title: string;
  bias_level: string;
  version: string;
  sections: EducationSection[];
  key_takeaways: string[];
  examples: EducationExample[];
}

// Admin
export interface ExperimentConfig {
  total_periods: number;
  observation_periods: number;
  num_assets: number;
  initial_cash: number;
  price_mode: string;
  assets: Array<{
    symbol: string;
    name: string;
    initial_price: number;
    up_prob: number;
    change_pct: number;
  }>;
  seed_round1: number;
  seed_round2: number;
  education_version: string;
  show_explanations: boolean;
  group_assignment: string;
}

export interface ExperimentOut {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  config: ExperimentConfig;
  participant_count: number;
  created_at: string;
}

export interface ExperimentStats {
  total_participants: number;
  completed: number;
  in_progress: number;
  group_distribution: Record<string, number>;
  step_distribution: Record<string, number>;
}

export interface ParticipantSummary {
  id: string;
  nickname: string | null;
  group: string | null;
  current_step: string;
  bias_level: string | null;
  created_at: string;
}

// Experiment steps
export type ExperimentStep =
  | 'joined'
  | 'demographics'
  | 'pre_test'
  | 'personality_feedback'
  | 'phase1_trading'
  | 'phase1_settlement'
  | 'post_test'
  | 'analysis'
  | 'education'
  | 'phase2_trading'
  | 'phase2_settlement'
  | 'final_results'
  | 'completed';
