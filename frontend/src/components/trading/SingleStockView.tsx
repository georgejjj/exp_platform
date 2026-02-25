import { useState } from 'react';
import type { TradingState } from '../../types';
import { formatMoney, formatPnl, pnlColor } from '../../utils/format';
import PriceLineChart from '../charts/PriceLineChart';

interface SingleStockViewProps {
  state: TradingState;
  onTrade: (symbol: string, action: string, quantity: number) => Promise<void>;
  disabled?: boolean;
}

export default function SingleStockView({ state, onTrade, disabled }: SingleStockViewProps) {
  const [quantity, setQuantity] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const stock = state.prices[0];
  if (!stock) return null;

  const holding = state.holdings.find((h) => h.symbol === stock.symbol);
  const chartData = state.price_history.map((periodPrices, idx) => {
    const p = periodPrices.find((pp) => pp.symbol === stock.symbol);
    return { period: idx, price: p?.price ?? 0, direction: p?.direction };
  });

  const maxBuy = stock.price > 0 ? Math.floor(state.cash / stock.price) : 0;
  const maxSell = holding?.quantity ?? 0;

  const handleAction = async (action: string) => {
    if (disabled || submitting) return;
    setSubmitting(true);
    try {
      await onTrade(stock.symbol, action, action === 'hold' ? 0 : quantity);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Portfolio Bar */}
      <div className="bg-ink-800 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="border-r border-ink-700">
            <div className="text-xs text-ink-400">总资产</div>
            <div className="font-mono font-bold text-white">{formatMoney(state.total_value)}</div>
          </div>
          <div className="border-r border-ink-700">
            <div className="text-xs text-ink-400">可用现金</div>
            <div className="font-mono font-medium text-ink-200">{formatMoney(state.cash)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-400">盈亏</div>
            <div className={`font-mono font-medium ${state.pnl > 0 ? 'text-red-400' : state.pnl < 0 ? 'text-green-400' : 'text-ink-400'}`}>
              {formatPnl(state.pnl)}
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-serif font-bold text-lg text-ink-900">{stock.symbol}</span>
            <span className="ml-2 text-xl font-mono font-bold text-ink-800">{formatMoney(stock.price)}</span>
          </div>
          <div className="text-sm font-mono text-ink-400">
            {state.current_period}/{state.total_periods}
          </div>
        </div>
        <PriceLineChart data={chartData} height={250} />
      </div>

      {/* Holdings */}
      {holding && (
        <div className="card p-4">
          <div className="flex justify-between text-sm py-1.5">
            <span className="text-ink-400">持仓</span>
            <span className="font-mono font-medium text-ink-800">{holding.quantity} 股</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-t border-ink-100">
            <span className="text-ink-400">成本价</span>
            <span className="font-mono text-ink-700">{formatMoney(holding.avg_cost)}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-t border-ink-100">
            <span className="text-ink-400">持仓盈亏</span>
            <span className={`font-mono font-medium ${pnlColor(holding.pnl)}`}>{formatPnl(holding.pnl)}</span>
          </div>
        </div>
      )}

      {/* Trading Controls */}
      {!state.is_observation ? (
        <div className="card p-4">
          <div className="mb-3">
            <label className="text-sm text-ink-400 mb-1.5 block">交易数量</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 100))}
                className="px-3 py-2 border border-ink-200 rounded-lg hover:bg-ink-50 text-ink-700 font-mono transition-colors"
              >
                -100
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                min={1}
                className="flex-1 px-3 py-2 border border-ink-200 rounded-lg text-center font-mono bg-paper focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
              />
              <button
                onClick={() => setQuantity(quantity + 100)}
                className="px-3 py-2 border border-ink-200 rounded-lg hover:bg-ink-50 text-ink-700 font-mono transition-colors"
              >
                +100
              </button>
            </div>
            <div className="text-xs text-ink-400 mt-1.5 flex justify-between font-mono">
              <span>可买: {maxBuy}</span>
              <span>可卖: {maxSell}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleAction('buy')}
              disabled={disabled || submitting || quantity > maxBuy || quantity <= 0}
              className="py-3 bg-up text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              买入
            </button>
            <button
              onClick={() => handleAction('hold')}
              disabled={disabled || submitting}
              className="py-3 border border-ink-300 text-ink-700 rounded-lg font-medium hover:bg-ink-50 disabled:opacity-50 transition-colors"
            >
              观望
            </button>
            <button
              onClick={() => handleAction('sell')}
              disabled={disabled || submitting || quantity > maxSell || maxSell <= 0}
              className="py-3 bg-down text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              卖出
            </button>
          </div>
        </div>
      ) : (
        <div className="card border-l-4 border-l-amber-500 p-4 text-center">
          <p className="text-ink-700 text-sm font-medium">
            观察期（第 {state.current_period + 1} / {state.observation_periods} 期）— 请先观察价格走势
          </p>
          <button
            onClick={() => handleAction('hold')}
            disabled={disabled || submitting}
            className="mt-3 btn-primary"
          >
            {submitting ? '处理中...' : '下一期'}
          </button>
        </div>
      )}
    </div>
  );
}
