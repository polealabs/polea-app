import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "w-full rounded-lg px-4 py-2.5 font-semibold transition-colors";
  const variantClasses =
    variant === "primary"
      ? "bg-terra text-white hover:bg-terra-light"
      : "border border-terra text-terra hover:bg-terra-pale";

  return <button className={`${baseClasses} ${variantClasses} ${className}`} {...props} />;
}
