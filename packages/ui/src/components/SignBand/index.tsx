import type { ReactNode } from "react"

interface SignBandProps {
  readonly brand: ReactNode
  readonly children?: ReactNode
}

const SignBand = ({ brand, children }: SignBandProps) => (
  <header className="sticky top-0 z-40 bg-sign text-sign-foreground">
    <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
      {brand}
      {children}
    </div>
  </header>
)

export default SignBand
