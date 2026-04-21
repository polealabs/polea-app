import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border border-terra-pale bg-white px-3 py-2 text-ink outline-none ring-terra focus:ring-2 ${className}`}
      {...props}
    />
  );
}
