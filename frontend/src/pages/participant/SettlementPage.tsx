import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useExperiment } from '../../context/ExperimentContext';
import { formatMoney, formatPnl, formatPct, pnlColor } from '../../utils/format';

export default function SettlementPage() {
  const { roundNum } = useParams<{ roundNum: string }>();
  const round = Number(roundNum) || 1;
  const navigate = useNavigate();
  const { setStep } = useAuth();
  const { round1Settlement, round2Settlement } = useExperiment();

  const settlement = round === 1 ? round1Settlement : round2Settlement;

  const handleContinue = () => {
    if (round === 1) {
      setStep('post_test');
      navigate('/questionnaire/post_test');
    } else {
      setStep('final_results');
      navigate('/final-results');
    }
  };

  if (!settlement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <p className="text-ink-400 mb-4">暂无结算数据</p>
          <button onClick={handleContinue} className="btn-primary">
            继续
          </button>
        </div>
      </div>
    );
  }

  const isPositive = settlement.pnl >= 0;

  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-serif font-bold text-ink-900">
            第{round === 1 ? '一' : '二'}轮交易结算
          </h1>
        </div>

        {/* Hero P&L */}
        <div className="card p-6 mb-4">
          <div className="text-center mb-6">
            <div className="text-sm text-ink-400 mb-1">投资收益</div>
            <div
              className={`text-4xl font-mono font-bold ${pnlColor(settlement.pnl)}`}
              style={isPositive ? { textShadow: '0 0 20px rgba(245, 158, 11, 0.15)' } : {}}
            >
              {formatPnl(settlement.pnl)}
            </div>
            <div className={`text-lg font-mono ${pnlColor(settlement.pnl)}`}>
              {formatPct(settlement.pnl_pct)}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <div className="text-xs text-ink-400 mb-0.5">初始资金</div>
              <div className="font-mono text-sm font-medium text-ink-800">{formatMoney(settlement.initial_cash)}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-ink-400 mb-0.5">最终资产</div>
              <div className="font-mono text-sm font-medium text-ink-800">{formatMoney(settlement.final_portfolio_value)}</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-xs text-ink-400 mb-0.5">交易次数</div>
              <div className="font-mono text-sm font-medium text-ink-800">{settlement.total_trades} 笔</div>
            </div>
          </div>
        </div>

        {/* Behavioral score */}
        {settlement.behavioral_fallacy_score !== null && (
          <div className="card p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-serif text-ink-700">行为偏差评分</span>
              <span className="text-sm font-mono font-medium text-ink-800">
                {settlement.behavioral_fallacy_score.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-ink-100 rounded-full h-2.5 border border-ink-200/50">
              <div
                className="h-2.5 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, settlement.behavioral_fallacy_score)}%`,
                  background: 'linear-gradient(90deg, #fbbf24, #d97706)',
                }}
              />
            </div>
            <p className="text-xs text-ink-400 mt-1.5">
              评分越高表示越倾向于在连续涨跌后做出反转押注
            </p>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="w-full btn-primary text-base"
        >
          {round === 1 ? '继续测试' : '查看最终结果'}
        </button>
      </div>
    </div>
  );
}
