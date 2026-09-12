import type { ReactNode } from 'react';

export default function PreviewTabs({
  label,
  items,
  selected,
  onChange,
  className,
  children,
}: {
  label: string;
  items: readonly string[];
  selected: number;
  onChange: (index: number) => void;
  className: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={className}
      role="tablist"
      aria-label={label}
      onKeyDown={(event) => {
        const next =
          event.key === 'ArrowRight'
            ? (selected + 1) % items.length
            : event.key === 'ArrowLeft'
              ? (selected + items.length - 1) % items.length
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : -1;
        if (next < 0) return;
        event.preventDefault();
        onChange(next);
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}
    >
      {items.map((item, index) => (
        <button
          key={item}
          role="tab"
          aria-selected={selected === index}
          tabIndex={selected === index ? 0 : -1}
          onClick={() => onChange(index)}
        >
          {item}
        </button>
      ))}
      {children}
    </div>
  );
}
