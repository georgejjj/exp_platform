import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExperiment } from '../../context/ExperimentContext';
import { BIAS_LABELS } from '../../utils/format';

const BIAS_CONFIGS: Record<string, { color: string; badge: string; desc: string }> = {
  mild: {
    color: 'text-success',
    badge: 'bg-green-100 text-green-700 border-green-200',
    desc: '您在概率判断方面表现良好！您能较好地识别独立事件，受赌徒谬误影响较小。不过在实际投资中仍需保持警惕。',
  },
  moderate: {
    color: 'text-warning',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    desc: '您在概率判断方面存在一定的赌徒谬误倾向。在面对连续的涨跌时，您可能会认为趋势即将反转。这是一个很常见的认知偏差，通过学习可以改善。',
  },
  severe: {
    color: 'text-error',
    badge: 'bg-red-100 text-red-700 border-red-200',
    desc: '您在概率判断方面受赌徒谬误影响较大。您倾向于认为连续的涨跌后必然会出现反转。不用担心，这是可以通过训练来纠正的。',
  },
};

export default function PersonalityFeedbackPage() {
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const { preTestResult } = useExperiment();

  const biasLevel = preTestResult?.bias_level || 'mild';
  const config = BIAS_CONFIGS[biasLevel] || BIAS_CONFIGS.mild;
  const score = preTestResult?.score ?? 0;

  const handleContinue = () => {
    setStep('phase1_trading');
    navigate('/trading/1');
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg animate-fade-up">
        {/* Score hero */}
        <div className="card p-8 text-center mb-6">
          <h2 className="text-xl font-serif font-bold text-ink-900 mb-4">您的测试结果</h2>
          <div className="text-5xl font-serif font-bold text-ink-900 mb-3">
            {score.toFixed(0)}
            <span className="text-2xl text-ink-400 ml-1">分</span>
          </div>
          <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${config.badge}`}>
            {BIAS_LABELS[biasLevel]}倾向
          </span>
          <div className="text-sm text-ink-400 mt-3 font-mono">
            正确率：{score.toFixed(0)}%（{preTestResult?.correct_count}/{preTestResult?.total_questions}）
          </div>
        </div>

        {/* Analysis */}
        <div className="card p-6 mb-6">
          <h3 className="font-serif font-bold text-ink-900 mb-3">分析说明</h3>
          <p className="text-ink-700 text-sm leading-relaxed">{config.desc}</p>
        </div>

        {/* Next phase info */}
        <div className="card border-l-4 border-l-amber-500 p-6 mb-6">
          <h3 className="font-serif font-bold text-ink-900 mb-2">接下来</h3>
          <p className="text-sm text-ink-700 leading-relaxed">
            您将进入模拟交易环节。系统会为您提供一个初始资金账户，
            您需要根据股票价格走势进行买卖决策。请像真实交易一样认真对待每一个决策！
          </p>
        </div>

        <button
          onClick={handleContinue}
          className="w-full btn-primary text-base"
        >
          开始交易
        </button>
      </div>
    </div>
  );
}
