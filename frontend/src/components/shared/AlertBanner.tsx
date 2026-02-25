interface AlertBannerProps {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onClose?: () => void;
}

const styles = {
  info:    { border: 'border-l-info',    dot: 'bg-info',    text: 'text-ink-800' },
  success: { border: 'border-l-success', dot: 'bg-success', text: 'text-ink-800' },
  warning: { border: 'border-l-warning', dot: 'bg-warning', text: 'text-ink-800' },
  error:   { border: 'border-l-error',   dot: 'bg-error',   text: 'text-ink-800' },
};

export default function AlertBanner({ type, message, onClose }: AlertBannerProps) {
  const s = styles[type];
  return (
    <div
      className={`bg-paper border border-ink-200 border-l-4 ${s.border} rounded-lg px-4 py-3 flex items-center gap-3`}
    >
      <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
      <span className={`text-sm flex-1 ${s.text}`}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-ink-400 hover:text-ink-700 transition-colors text-lg leading-none"
        >
          &times;
        </button>
      )}
    </div>
  );
}
