import api, { adminApi } from './client';
import type {
  JoinResponse,
  AdminLoginResponse,
  DemographicsData,
  QuestionnaireData,
  AnswerResponse,
  CompleteResponse,
  TradingState,
  TradeActionResponse,
  GuidanceSubmitResponse,
  SettlementData,
  ComprehensiveAnalysis,
  FinalResults,
  EducationContent,
  ExperimentOut,
  ExperimentStats,
  ParticipantSummary,
} from '../types';

// Auth
export const joinExperiment = (code: string, nickname?: string) =>
  api.post<JoinResponse>('/auth/join', { experiment_code: code, nickname });

export const adminLogin = (username: string, password: string) =>
  api.post<AdminLoginResponse>('/auth/admin/login', { username, password });

// Demographics
export const submitDemographics = (data: DemographicsData) =>
  api.post('/demographics', data);

// Questionnaire
export const getQuestionnaire = (phase: string) =>
  api.get<QuestionnaireData>(`/questionnaire/${phase}`);

export const submitAnswer = (
  phase: string,
  questionnaire_id: string,
  question_id: string,
  selected_option: string,
  response_time_ms?: number
) =>
  api.post<AnswerResponse>(`/questionnaire/${phase}/answer`, {
    questionnaire_id,
    question_id,
    selected_option,
    response_time_ms,
  });

export const completeQuestionnaire = (phase: string, questionnaire_id: string) =>
  api.post<CompleteResponse>(`/questionnaire/${phase}/complete`, { questionnaire_id });

// Trading
export const startTrading = (round_num: number) =>
  api.post<TradingState>('/trading/start', { round_num });

export const getTradingState = () =>
  api.get<TradingState>('/trading/state');

export const submitTradeAction = (stock_symbol: string, action: string, quantity: number) =>
  api.post<TradeActionResponse>('/trading/action', { stock_symbol, action, quantity });

export const submitGuidanceResponse = (
  stock_symbol: string,
  predicted_up_prob: number,
  response_time_ms?: number
) =>
  api.post<GuidanceSubmitResponse>('/trading/guidance-response', {
    stock_symbol,
    predicted_up_prob,
    response_time_ms,
  });

export const completeTrading = () =>
  api.post<SettlementData>('/trading/complete');

// Analysis
export const getComprehensiveAnalysis = () =>
  api.get<ComprehensiveAnalysis>('/analysis/comprehensive');

export const getFinalResults = () =>
  api.get<FinalResults>('/analysis/final-results');

// Education
export const getEducationContent = () =>
  api.get<EducationContent>('/education/content');

// Events
export const logEvents = (events: Array<{
  event_type: string;
  page?: string;
  data?: Record<string, unknown>;
  client_timestamp?: string;
}>) =>
  api.post('/events/batch', { events });

// Admin
export const getExperiments = () =>
  adminApi.get<ExperimentOut[]>('/admin/experiments');

export const createExperiment = (data: { name: string; code: string; description?: string; config?: Record<string, unknown> }) =>
  adminApi.post<ExperimentOut>('/admin/experiments', data);

export const updateExperiment = (id: string, data: { name?: string; description?: string; status?: string; config?: Record<string, unknown> }) =>
  adminApi.put<ExperimentOut>(`/admin/experiments/${id}`, data);

export const getExperimentStats = (id: string) =>
  adminApi.get<ExperimentStats>(`/admin/experiments/${id}/stats`);

export const getParticipants = (id: string) =>
  adminApi.get<ParticipantSummary[]>(`/admin/experiments/${id}/participants`);

export const exportData = (experimentId: string, dataType: string) =>
  adminApi.get(`/admin/experiments/${experimentId}/export/${dataType}`, { responseType: 'blob' });
