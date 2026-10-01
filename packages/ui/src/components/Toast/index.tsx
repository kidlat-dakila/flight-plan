interface ToastProps {
  readonly message: string | null
}

const Toast = ({ message }: ToastProps) => (
  <div role="status" className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
    {message === null
      ? null
      : (
          <p className="rounded-lg border border-foreground bg-popover px-3 py-2 text-sm text-popover-foreground duration-150 animate-in fade-in-0">
            {message}
          </p>
        )}
  </div>
)

export default Toast
