import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-black text-white",
  ghost: "bg-transparent",
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn("rounded px-3 py-2", VARIANT_CLASSES[variant], className)} {...props} />
}
