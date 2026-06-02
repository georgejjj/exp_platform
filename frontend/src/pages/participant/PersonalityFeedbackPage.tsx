import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExperiment } from '../../context/ExperimentContext';
import { BIAS_LABELS } from '../../utils/format';

const BIAS_CONFIGS: Record<string, { badge: string; tone: string; desc: string }> = {
  mild: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    tone: 'text-emerald-700',
    desc: '您对独立事件的概率判断较为稳健。在面对连续涨跌时，您较少陷入"该反转了"的直觉。不过实际投资中仍需保持警惕。',
  },
  moderate: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    tone: 'text-amber-700',
    desc: '您在概率判断方面存在一定的赌徒谬误倾向。面对连续涨跌时，您可能会下意识地认为趋势即将反转。这是常见的认知偏差，通过学习可以改善。',
  },
  severe: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    tone: 'text-red-700',
    desc: '您在概率判断方面较强地受到赌徒谬误影响。您倾向于认为连续涨跌后必然反转。不用担心，这是可以通过训练纠正的认知模式。',
  },
};

export default function PersonalityFeedbackPage() {
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const { preTestResult, gameResult } = useExperiment();

  const cognitiveScore = preTestResult?.score ?? 0; // % correct on questionnaire
  const cognitiveFallacy =
    gameResult?.cognitive_fallacy_score ?? Math.max(0, 100 - cognitiveScore);
  const behavioralFallacy = gameResult?.fallacy_score ?? null;
  const combinedScore = gameResult?.combined_score ?? cognitiveFallacy;
  const cw = Math.round((gameResult?.cognitive_weight ?? 0.4) * 100);
  const bw = Math.round((gameResult?.behavioral_weight ?? 0.6) * 100);

  const biasLevel = gameResult?.bias_level ?? preTestResult?.bias_level ?? 'mild';
  const config = BIAS_CONFIGS[biasLevel] || BIAS_CONFIGS.mild;

  const handleContinue = () => {
    setStep('phase1_trading');
    navigate('/trading/1');
  };

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg animate-fade-up">
        {/* Combined headline */}
        <div className="card p-8 text-center mb-5">
          <div className="text-xs uppercase tracking-widest text-ink-400 font-mono mb-2">
            综合赌徒谬误指数
          </div>
          <div className="text-6xl font-serif font-bold text-ink-900 mb-3">
            {combinedScore.toFixed(0)}
            <span className="text-2xl text-ink-400 ml-1 font-mono">/100</span>
          </div>
          <span
            className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${config.badge}`}
          >
            {BIAS_LABELS[biasLevel]}倾向
          </span>
          <ScoreBar value={combinedScore} muted />
          <p className="text-xs text-ink-400 mt-3 font-mono">
            基于行为问卷（权重 {cw}%）与避障小游戏（权重 {bw}%）加权
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-3 mb-5">
          <BreakdownCard
            label="行为问卷"
            sublabel="认知偏差"
            value={cognitiveFallacy}
            weight={`权重 ${cw}%`}
            stat={
              preTestResult
                ? `答对 ${preTestResult.correct_count} / ${preTestResult.total_questions}`
                : '—'
            }
            hint="根据您对独立事件概率题的作答正确率换算得到。"
          />
          <BreakdownCard
            label="避障小游戏"
            sublabel="行为偏差"
            value={behavioralFallacy}
            weight={`权重 ${bw}%`}
            stat={
              gameResult
                ? `预判正确 ${gameResult.correct_count} / ${gameResult.total_rounds}`
                : '—'
            }
            hint="在连续序列后选择反转方向的比例（越高 → 越倾向预判反转）。"
            unavailableText="本次游戏未形成足够长的连续序列，未计入。"
          />
        </div>

        {/* Analysis */}
        <div className="card p-6 mb-5">
          <h3 className="font-serif font-bold text-ink-900 mb-2">分析说明</h3>
          <p className={`text-sm leading-relaxed ${config.tone}`}>{config.desc}</p>
        </div>

        {/* Next phase */}
        <div className="card border-l-4 border-l-amber-500 p-6 mb-6">
          <h3 className="font-serif font-bold text-ink-900 mb-2">接下来</h3>
          <p className="text-sm text-ink-700 leading-relaxed">
            您将进入模拟交易环节。系统会为您提供一个初始资金账户，
            您需要根据股票价格走势进行买卖决策。请像真实交易一样认真对待每一个决策！
          </p>
        </div>

        <button onClick={handleContinue} className="w-full btn-primary text-base">
          开始交易
        </button>
      </div>
    </div>
  );
}

function BreakdownCard({
  label,
  sublabel,
  value,
  weight,
  stat,
  hint,
  unavailableText,
}: {
  label: string;
  sublabel: string;
  value: number | null;
  weight: string;
  stat: string;
  hint: string;
  unavailableText?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-ink-900">{label}</div>
          <div className="text-[11px] text-ink-400 font-mono uppercase tracking-wider mt-0.5">
            {sublabel}
          </div>
        </div>
        <span className="text-[10px] font-mono text-ink-400 mt-1">{weight}</span>
      </div>
      {value !== null ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-serif font-bold text-ink-900">
              {value.toFixed(0)}
            </span>
            <span className="text-xs text-ink-400 font-mono">/ 100</span>
            <span className="ml-auto text-xs text-ink-500 font-mono">{stat}</span>
          </div>
          <ScoreBar value={value} muted />
          <p className="text-[11px] text-ink-500 mt-2 leading-relaxed">{hint}</p>
        </>
      ) : (
        <p className="text-xs text-ink-500 mt-2 leading-relaxed">
          {unavailableText || '暂无数据'}
        </p>
      )}
    </div>
  );
}

function ScoreBar({ value, muted = false }: { value: number; muted?: boolean }) {
  return (
    <div
      className={`h-2 rounded-full overflow-hidden mt-2 ${muted ? 'bg-ink-200' : 'bg-ink-700'}`}
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
