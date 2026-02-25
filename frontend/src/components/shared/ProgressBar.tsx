interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-ink-700 font-medium">{label}</span>
          <span className="font-mono text-ink-400 text-xs">
            {current}/{total}
          </span>
        </div>
      )}
      <div className="w-full bg-ink-100 rounded-full h-2 border border-ink-200/50">
        <div
          className="h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            boxShadow: pct > 0 ? '0 0 8px rgba(245, 158, 11, 0.3)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
