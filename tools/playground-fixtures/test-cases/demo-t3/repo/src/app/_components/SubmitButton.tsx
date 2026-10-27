export function SubmitButton({ label, isPending }: { label: string; isPending: boolean }) {
  return (
    <button type="submit" disabled={isPending} className="rounded bg-indigo-500 px-4 py-2 font-semibold disabled:opacity-50">
      {isPending ? "Saving…" : label}
    </button>
  )
}
