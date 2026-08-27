import type { CSSProperties, ReactNode } from "react";

export function ReboxBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded bg-[var(--accent-soft)] text-[11px] font-medium text-[var(--accent)] ${className}`}>
      {children}
    </span>
  );
}

export function ProductVisual({
  className = "",
  gradient,
  label,
  labelClassName = ""
}: {
  className?: string;
  gradient?: string;
  label: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg text-white ${className}`}
      style={gradient ? ({ backgroundImage: gradient } as CSSProperties) : undefined}
    >
      <strong className={`font-bold leading-5 ${labelClassName}`}>{label}</strong>
    </div>
  );
}
