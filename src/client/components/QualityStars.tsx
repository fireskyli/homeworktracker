interface Props {
  value: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
}

function FilledStar() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"
        fill="#facc15"
        stroke="#eab308"
        strokeWidth="1"
      />
    </svg>
  );
}

function OutlineStar() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"
        fill="white"
        stroke="#facc15"
        strokeWidth="1.5"
      />
    </svg>
  );
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
          className={`transition-transform ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
        >
          {value && star <= value ? <FilledStar /> : <OutlineStar />}
        </button>
      ))}
    </div>
  );
}
