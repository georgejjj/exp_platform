import { useState, useEffect } from 'react';
import { getFinalResults } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { FinalResults } from '../../types';
import { formatMoney, formatPnl, formatPct, pnlColor, GROUP_LABELS } from '../../utils/format';
import ScoreBar from '../../components/charts/ScoreBar';

export default function FinalResultsPage() {
  const { setStep } = useAuth();
  const [data, setData] = useState<FinalResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: results } = await getFinalResults();
        setData(results);
        setStep('completed');
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, [setStep]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">生成最终报告...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <p className="text-ink-400">暂无数据</p>
      </div>
    );
  }

  const c = data.comparison;

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-6">
      <div className="max-w-lg mx-auto animate-fade-up">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-serif font-bold text-ink-900">实验报告</h1>
          <div className="w-12 h-0.5 bg-amber-500 mx-auto mt-2 mb-1" />
          <p className="text-sm text-ink-400 mt-2">
            {GROUP_LABELS[data.group] || data.group}
          </p>
        </div>

        {/* Round Comparison */}
        <div className="card p-6 mb-4">
          <h3 className="font-serif font-bold text-ink-900 mb-4">两轮交易对比</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-ink-50 rounded-lg border border-ink-200">
              <div className="text-xs text-ink-400 mb-1">第一轮收益</div>
              <div className={`text-xl font-mono font-bold ${pnlColor(c.round1_pnl)}`}>
                {formatPnl(c.round1_pnl)}
              </div>
              <div className={`text-sm font-mono ${pnlColor(c.round1_pnl)}`}>
                {formatPct(c.round1_pnl_pct)}
              </div>
            </div>
            <div className="text-center p-3 bg-ink-50 rounded-lg border border-ink-200">
              <div className="text-xs text-ink-400 mb-1">第二轮收益</div>
              <div className={`text-xl font-mono font-bold ${pnlColor(c.round2_pnl)}`}>
                {formatPnl(c.round2_pnl)}
              </div>
              <div className={`text-sm font-mono ${pnlColor(c.round2_pnl)}`}>
                {formatPct(c.round2_pnl_pct)}
              </div>
            </div>
          </div>

          <div className="text-center p-3 bg-amber-100/50 rounded-lg border border-amber-200">
            <div className="text-xs text-amber-600 mb-1">收益变化</div>
            <div className={`text-lg font-mono font-bold ${pnlColor(c.pnl_improvement)}`}>
              {formatPnl(c.pnl_improvement)}
            </div>
          </div>
        </div>

        {/* Fallacy Score Comparison */}
        {(c.round1_fallacy_score !== null || c.round2_fallacy_score !== null) && (
          <div className="card p-4 mb-4">
            <h3 className="font-serif font-bold text-ink-900 mb-3">行为偏差变化</h3>
            {c.round1_fallacy_score !== null && (
              <ScoreBar label="第一轮" value={c.round1_fallacy_score} color="linear-gradient(90deg, #94a3b8, #334155)" />
            )}
            {c.round2_fallacy_score !== null && (
              <ScoreBar label="第二轮" value={c.round2_fallacy_score} color="linear-gradient(90deg, #fbbf24, #d97706)" />
            )}
            {c.fallacy_improvement !== null && (
              <div className="border-t border-ink-200 pt-2 mt-1 text-sm text-ink-400">
                改善幅度:{' '}
                <span className={c.fallacy_improvement >= 0 ? 'text-success font-medium' : 'text-error font-medium'}>
                  {c.fallacy_improvement >= 0 ? '+' : ''}{c.fallacy_improvement.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cognitive Progress */}
        <div className="card p-4 mb-4">
          <h3 className="font-serif font-bold text-ink-900 mb-3">认知进步</h3>
          <ScoreBar label="前测" value={data.cognitive.pre_test_score} color="linear-gradient(90deg, #94a3b8, #334155)" />
          <ScoreBar label="后测" value={data.cognitive.post_test_score} color="linear-gradient(90deg, #fbbf24, #d97706)" />
        </div>

        {/* Profile */}
        <div className="bg-ink-900 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <span className="text-sm text-ink-400">最终投资者画像</span>
          </div>
          <div className="text-2xl font-serif font-bold text-white mb-2">{data.profile.type_name}</div>
          <p className="text-sm text-ink-400 leading-relaxed">{data.profile.description}</p>
        </div>

        {/* Experiment Info */}
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">教育类型</span>
              <span className="text-ink-700 font-medium">{data.education_received === 'personalized' ? '个性化教育' : '通用教育'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">引导提示</span>
              <span className="text-ink-700 font-medium">{data.had_guidance ? '有' : '无'}</span>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-ink-400 py-4 font-serif italic">
          感谢您参与本次实验！您的数据将用于行为金融研究。
        </div>
      </div>
    </div>
  );
}
