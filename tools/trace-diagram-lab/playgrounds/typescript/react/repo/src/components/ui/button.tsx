import type { ButtonHTMLAttributes } from "react"

type ButtonVariant = "primary" | "ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "button button-primary",
  ghost: "button button-ghost",
}

export function Button({ variant = "primary", ...props }: ButtonProps) {
  return <button className={VARIANT_CLASSES[variant]} {...props} />
}
