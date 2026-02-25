import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComprehensiveAnalysis } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { ComprehensiveAnalysis } from '../../types';
import ScoreBar from '../../components/charts/ScoreBar';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const [data, setData] = useState<ComprehensiveAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: analysis } = await getComprehensiveAnalysis();
        setData(analysis);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleContinue = () => {
    setStep('education');
    navigate('/education');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">分析中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <button onClick={handleContinue} className="btn-primary">
          继续
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-6">
      <div className="max-w-lg mx-auto animate-fade-up">
        <h1 className="text-2xl font-serif font-bold text-center text-ink-900 mb-6">综合分析报告</h1>

        {/* Investor Profile */}
        <div className="bg-ink-900 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 bg-amber-500 rounded-full" />
            <span className="text-sm text-ink-400">您的投资者画像</span>
          </div>
          <div className="text-2xl font-serif font-bold text-white mb-2">{data.profile.type_name}</div>
          <p className="text-sm text-ink-400 leading-relaxed">{data.profile.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-ink-400">知行一致性:</span>
            <div className="flex-1 bg-ink-700 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${data.profile.consistency_score * 100}%`,
                  background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                }}
              />
            </div>
            <span className="text-sm font-mono font-medium text-amber-500">
              {(data.profile.consistency_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Two-column layout on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Cognitive Dimension */}
          <div className="card p-4">
            <h3 className="font-serif font-bold text-ink-900 mb-3">认知维度</h3>
            <ScoreBar label="前测得分" value={data.cognitive.pre_test_score} color="linear-gradient(90deg, #94a3b8, #334155)" />
            <ScoreBar label="后测得分" value={data.cognitive.post_test_score} color="linear-gradient(90deg, #fbbf24, #d97706)" />
            <div className="border-t border-ink-200 pt-2 mt-1 text-sm text-ink-400">
              提升:{' '}
              <span className={data.cognitive.improvement >= 0 ? 'text-success font-medium' : 'text-error font-medium'}>
                {data.cognitive.improvement >= 0 ? '+' : ''}{data.cognitive.improvement.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Behavioral Dimension */}
          <div className="card p-4">
            <h3 className="font-serif font-bold text-ink-900 mb-3">行为维度</h3>
            {data.behavioral.round1_fallacy_score !== null && (
              <ScoreBar
                label="第一轮偏差"
                value={data.behavioral.round1_fallacy_score}
                color="linear-gradient(90deg, #94a3b8, #334155)"
              />
            )}
            {data.behavioral.round2_fallacy_score !== null && (
              <ScoreBar
                label="第二轮偏差"
                value={data.behavioral.round2_fallacy_score}
                color="linear-gradient(90deg, #fbbf24, #d97706)"
              />
            )}
            {data.behavioral.improvement !== null && (
              <div className="border-t border-ink-200 pt-2 mt-1 text-sm text-ink-400">
                改善:{' '}
                <span className={data.behavioral.improvement >= 0 ? 'text-success font-medium' : 'text-error font-medium'}>
                  {data.behavioral.improvement >= 0 ? '+' : ''}{data.behavioral.improvement.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="w-full btn-primary text-base"
        >
          进入学习
        </button>
      </div>
    </div>
  );
}
