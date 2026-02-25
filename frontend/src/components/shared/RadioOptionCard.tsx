interface RadioOptionCardProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  description?: string;
  disabled?: boolean;
}

export default function RadioOptionCard({
  label,
  selected,
  onClick,
  description,
  disabled,
}: RadioOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? 'border-amber-500 bg-amber-100/50 border-l-4 border-l-amber-500'
          : 'border-ink-200 bg-paper hover:bg-ink-50 hover:border-ink-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            selected ? 'border-amber-500 bg-amber-500' : 'border-ink-300'
          }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <div>
          <div className="font-medium text-ink-800">{label}</div>
          {description && (
            <div className="text-sm text-ink-400 mt-0.5">{description}</div>
          )}
        </div>
      </div>
    </button>
  );
}
