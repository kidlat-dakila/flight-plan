import { useId } from "react"

export type WalkthroughOrder = "imports-bottom-up" | "imports-top-down" | "important-first"

interface WalkthroughOrderFieldProps {
  readonly value: WalkthroughOrder
  readonly onChange: (value: WalkthroughOrder) => void
}

const LEGEND = "Code Walkthrough order"

const ORDERS: readonly { readonly value: WalkthroughOrder, readonly label: string, readonly description: string }[] = [
  {
    value: "imports-bottom-up",
    label: "Bottom up",
    description: "A file comes before the files that import it. If c.ts imports b.ts and b.ts imports a.ts, the walkthrough reads a.ts, b.ts, c.ts.",
  },
  {
    value: "imports-top-down",
    label: "Top down",
    description: "A file comes before the files it imports: c.ts, b.ts, a.ts.",
  },
  {
    value: "important-first",
    label: "Important changes first",
    description: "Files with a core change and a spotlight change come first, then the core changes, then the spotlight changes, then the rest.",
  },
]

const WalkthroughOrderField = ({ value, onChange }: WalkthroughOrderFieldProps) => {
  const groupId = useId()
  return (
    <fieldset>
      <legend className="pb-2 font-bold">{LEGEND}</legend>
      <ul className="border-t border-border">
        {ORDERS.map((order) => (
          <li key={order.value} className="border-b border-border py-3">
            <label className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
              <input
                type="radio"
                name={groupId}
                checked={value === order.value}
                className="mt-1 size-4 shrink-0 accent-(--primary)"
                onChange={() => { onChange(order.value) }}
              />
              <span className="font-bold">{order.label}</span>
              <span className="col-start-2 max-w-[62ch] text-sm text-muted-foreground">{order.description}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

export default WalkthroughOrderField
