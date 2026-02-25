interface ScoreBarProps {
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  suffix?: string;
}

export default function ScoreBar({
  label,
  value,
  maxValue = 100,
  color,
  suffix = '%',
}: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (value / maxValue) * 100));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-ink-700 font-medium font-serif">{label}</span>
        <span className="font-mono text-ink-800 font-medium">
          {value.toFixed(1)}{suffix}
        </span>
      </div>
      <div className="w-full bg-ink-100 rounded-full h-2.5 border border-ink-200/50">
        <div
          className="h-2.5 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: color || 'linear-gradient(90deg, #fbbf24, #d97706)',
          }}
        />
      </div>
    </div>
  );
}
