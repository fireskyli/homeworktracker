interface Props {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
}

function FilledSun() {
  return <span className="text-2xl">☀️</span>;
}

function OutlineSun() {
  return <span className="text-2xl opacity-30">☀️</span>;
}

export default function SunStars({ value, onChange, readonly }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-transform ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
        >
          {value && star <= value ? <FilledSun /> : <OutlineSun />}
        </button>
      ))}
    </div>
  );
}
