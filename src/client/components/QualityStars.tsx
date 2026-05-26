interface Props {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
}

export default function QualityStars({ value, onChange, readonly }: Props) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`text-2xl transition-transform ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${value && star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}
