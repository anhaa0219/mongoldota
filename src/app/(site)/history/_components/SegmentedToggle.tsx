interface SegmentedToggleProps<T extends string> {
  /** Read by screen readers as the group's name. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of choices where exactly one is on (e.g. All · Wins · Losses). */
export function SegmentedToggle<T extends string>({ label, options, value, onChange }: SegmentedToggleProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-[0.3rem] rounded-full bg-white/[0.04] p-[0.2rem]">
      {options.map((option) => {
        const isChosen = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isChosen}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-[0.85rem] py-[0.3rem] text-[0.95rem] transition-colors ${
              isChosen ? "bg-accent font-semibold text-ink" : "text-white/75 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
