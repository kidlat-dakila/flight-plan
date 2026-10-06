import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface DialogProps {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Dialog({ title, open, onClose, children }: DialogProps) {
  if (!open) return null
  return (
    <div role="dialog" aria-label={title}>
      <h2>{title}</h2>
      {children}
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>
  )
}
