import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  startTrading,
  getTradingState,
  submitTradeAction,
  submitGuidanceResponse,
  completeTrading,
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useExperiment } from '../../context/ExperimentContext';
import { useEventLogger } from '../../hooks/useEventLogger';
import type { TradingState } from '../../types';
import SingleStockView from '../../components/trading/SingleStockView';
import GuidancePopup from '../../components/trading/GuidancePopup';
import AlertBanner from '../../components/shared/AlertBanner';

export default function TradingPage() {
  const { roundNum } = useParams<{ roundNum: string }>();
  const round = Number(roundNum) || 1;
  const navigate = useNavigate();
  const { group, setStep } = useAuth();
  const { setRound1Settlement, setRound2Settlement } = useExperiment();
  const { log } = useEventLogger();

  const [state, setState] = useState<TradingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);
  const [guidanceCompleted, setGuidanceCompleted] = useState(false);

  const needsGuidance =
    round === 2 && (group === 'guidance' || group === 'feedback_guidance');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await startTrading(round);
        setState(data);
        log('trading_start', `trading_round${round}`);
      } catch {
        try {
          const { data } = await getTradingState();
          setState(data);
        } catch {
          setError('无法加载交易数据');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [round, log]);

  // Show guidance popup at start of each trading period in round 2
  useEffect(() => {
    if (
      needsGuidance &&
      state &&
      !state.is_observation &&
      state.status === 'active' &&
      !guidanceCompleted
    ) {
      setShowGuidance(true);
    }
  }, [needsGuidance, state?.current_period, state?.is_observation, state?.status, guidanceCompleted]);

  const handleTrade = useCallback(
    async (symbol: string, action: string, quantity: number) => {
      setError('');
      try {
        const { data } = await submitTradeAction(symbol, action, quantity);
        log('trade_action', `trading_round${round}`, {
          symbol,
          action,
          quantity,
          period: state?.current_period,
        });

        if (data.is_last_period) {
          const settlement = await completeTrading();
          if (round === 1) {
            setRound1Settlement(settlement.data);
            setStep('post_test');
            navigate('/settlement/1');
          } else {
            setRound2Settlement(settlement.data);
            setStep('final_results');
            navigate('/settlement/2');
          }
          return;
        }

        // Refresh state
        const { data: newState } = await getTradingState();
        setState(newState);
        setGuidanceCompleted(false); // reset for new period
      } catch (err: any) {
        setError(err.response?.data?.detail || '交易失败');
      }
    },
    [round, state, log, navigate, setStep, setRound1Settlement, setRound2Settlement]
  );

  const handleGuidanceSubmit = async (predictedProb: number) => {
    const symbol = state?.prices[0]?.symbol || 'A';
    const { data } = await submitGuidanceResponse(symbol, predictedProb);
    return data;
  };

  const handleGuidanceClose = () => {
    setShowGuidance(false);
    setGuidanceCompleted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">加载交易数据...</div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <AlertBanner type="error" message={error || '交易数据加载失败'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="bg-ink-900 px-4 py-3 flex justify-between items-center">
        <h1 className="font-serif font-bold text-white">
          第{round === 1 ? '一' : '二'}轮交易
        </h1>
        <div className="font-mono text-sm text-amber-500">
          {state.current_period}/{state.total_periods}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {error && (
          <div className="mb-4">
            <AlertBanner type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <SingleStockView
          state={state}
          onTrade={handleTrade}
          disabled={showGuidance && !guidanceCompleted}
        />
      </div>

      {showGuidance && !guidanceCompleted && state.prices[0] && (
        <GuidancePopup
          stockSymbol={state.prices[0].symbol}
          onSubmit={handleGuidanceSubmit}
          onClose={handleGuidanceClose}
        />
      )}
    </div>
  );
}
