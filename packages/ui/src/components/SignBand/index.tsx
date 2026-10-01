import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SignBandProps {
  readonly brand: ReactNode
  readonly width?: "column" | "full"
  readonly children?: ReactNode
}

const WIDTH_CLASSES: Record<NonNullable<SignBandProps["width"]>, string> = {
  column: "max-w-5xl px-4 sm:px-6",
  full: "px-6",
}

const SignBand = ({ brand, width = "column", children }: SignBandProps) => (
  <header className="sticky top-0 z-40 bg-sign text-sign-foreground">
    <div className={cn("mx-auto flex h-14 w-full items-center justify-between gap-6", WIDTH_CLASSES[width])}>
      {brand}
      {children}
    </div>
  </header>
)

export default SignBand
