export function formatMoney(v: number): string {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPct(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

export function formatPnl(v: number): string {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${formatMoney(v)}`;
}

export function pnlColor(v: number): string {
  if (v > 0) return 'text-up';
  if (v < 0) return 'text-down';
  return 'text-gray-500';
}

export const STEP_LABELS: Record<string, string> = {
  joined: '已加入',
  demographics: '基本信息',
  pre_test: '前测',
  personality_feedback: '性格反馈',
  phase1_trading: '第一轮交易',
  phase1_settlement: '第一轮结算',
  post_test: '后测',
  analysis: '综合分析',
  education: '学习教育',
  phase2_trading: '第二轮交易',
  phase2_settlement: '第二轮结算',
  final_results: '最终结果',
  completed: '已完成',
};

export const GROUP_LABELS: Record<string, string> = {
  control: '对照组',
  feedback: '反馈组',
  guidance: '引导组',
  feedback_guidance: '反馈+引导组',
};

export const BIAS_LABELS: Record<string, string> = {
  mild: '轻度',
  moderate: '中度',
  severe: '重度',
};
