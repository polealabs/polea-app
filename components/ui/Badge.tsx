import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-terra-pale px-2.5 py-1 text-xs font-medium text-terra ${className}`}
      {...props}
    />
  );
}
