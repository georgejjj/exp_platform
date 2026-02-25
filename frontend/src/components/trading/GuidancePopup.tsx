import { useState } from 'react';
import AlertBanner from '../shared/AlertBanner';

interface GuidancePopupProps {
  stockSymbol: string;
  onSubmit: (predictedProb: number) => Promise<{
    actual_up_prob: number;
    shows_bias: boolean;
    bias_message: string | null;
  }>;
  onClose: () => void;
}

export default function GuidancePopup({ stockSymbol, onSubmit, onClose }: GuidancePopupProps) {
  const [prob, setProb] = useState(50);
  const [result, setResult] = useState<{
    actual_up_prob: number;
    shows_bias: boolean;
    bias_message: string | null;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await onSubmit(prob / 100);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink-900/85 flex items-center justify-center z-50 px-4">
      <div className="bg-paper border border-ink-200 rounded-2xl p-6 w-full max-w-md animate-fade-up">
        <h3 className="text-lg font-serif font-bold text-ink-900 mb-4">交易前预测</h3>

        {!result ? (
          <>
            <p className="text-ink-700 text-sm mb-4 leading-relaxed">
              在进行交易之前，请预测股票 <span className="font-mono font-medium">{stockSymbol}</span> 下一期上涨的概率：
            </p>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-ink-400 mb-2">
                <span>一定下跌</span>
                <span className="font-mono font-bold text-lg text-amber-600">{prob}%</span>
                <span>一定上涨</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={prob}
                onChange={(e) => setProb(Number(e.target.value))}
                className="w-full h-2 bg-ink-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full btn-primary"
            >
              {submitting ? '提交中...' : '提交预测'}
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 p-4 bg-ink-50 rounded-lg border border-ink-200">
              <div className="text-sm text-ink-400 mb-1">实际上涨概率</div>
              <div className="text-2xl font-mono font-bold text-amber-600">
                {(result.actual_up_prob * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-ink-400 mt-1 font-mono">
                您的预测：{prob}%
              </div>
            </div>

            {result.shows_bias && result.bias_message && (
              <div className="mb-4">
                <AlertBanner type="warning" message={result.bias_message} />
              </div>
            )}

            {!result.shows_bias && (
              <div className="mb-4">
                <AlertBanner type="success" message="您的预测较为合理，没有明显的偏差。" />
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full btn-primary"
            >
              继续交易
            </button>
          </>
        )}
      </div>
    </div>
  );
}
