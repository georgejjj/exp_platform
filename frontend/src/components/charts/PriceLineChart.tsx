import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface PriceLineChartProps {
  data: Array<{ period: number; price: number; direction?: string | null }>;
  height?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-paper border border-ink-200 rounded-lg px-3 py-2 shadow-sm">
      <p className="text-xs text-ink-400 mb-0.5">第 {label} 期</p>
      <p className="text-sm font-mono font-medium text-ink-900">
        ¥{payload[0].value.toFixed(2)}
      </p>
    </div>
  );
}

export default function PriceLineChart({ data, height = 300 }: PriceLineChartProps) {
  if (data.length === 0) return null;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const padding = (maxP - minP) * 0.1 || 5;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}
          label={{ value: '期数', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
          stroke="#e2e8f0"
        />
        <YAxis
          domain={[Math.floor(minP - padding), Math.ceil(maxP + padding)]}
          tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}
          label={{ value: '价格', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
          stroke="#e2e8f0"
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={data[0]?.price} stroke="#cbd5e1" strokeDasharray="5 5" />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (!payload.direction)
              return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#f59e0b" />;
            const color = payload.direction === 'up' ? '#dc2626' : '#16a34a';
            return <circle key={props.key} cx={cx} cy={cy} r={4} fill={color} stroke={color} />;
          }}
          activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fefdfb', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
