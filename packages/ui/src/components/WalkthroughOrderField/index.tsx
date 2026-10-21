import SelectDialog, { type SelectDialogOption } from "@/components/SelectDialog"

export type WalkthroughOrder = "imports-bottom-up" | "imports-top-down" | "important-first"

interface WalkthroughOrderFieldProps {
  readonly value: WalkthroughOrder
  readonly onChange: (value: WalkthroughOrder) => void
}

const LABEL = "Code Walkthrough order"
const DIALOG_TITLE = "Choose a Code Walkthrough order"
const DIALOG_DESCRIPTION = "It decides which changed file you read first."
const CHOOSE_LABEL = "Choose"
const CANCEL_LABEL = "Cancel"

const ORDERS: readonly { readonly value: WalkthroughOrder, readonly label: string, readonly description: string }[] = [
  {
    value: "imports-bottom-up",
    label: "Building blocks first",
    description: "Start with the files the rest of the change depends on, then read the code that uses them.",
  },
  {
    value: "imports-top-down",
    label: "Entry points first",
    description: "Start where the change is used, like pages and routes, then follow it down to the details.",
  },
  {
    value: "important-first",
    label: "Most important first",
    description: "Start with the heart of the change and the topics you care about most, then read the rest.",
  },
]

const OPTIONS: readonly SelectDialogOption[] = ORDERS.map((order) => ({
  key: order.value,
  label: order.label,
  summary: null,
  description: order.description,
  note: null,
}))

const orderOf = (key: string): WalkthroughOrder | null =>
  ORDERS.find((order) => order.value === key)?.value ?? null

const WalkthroughOrderField = ({ value, onChange }: WalkthroughOrderFieldProps) => (
  <SelectDialog
    label={LABEL}
    dialogTitle={DIALOG_TITLE}
    dialogDescription={DIALOG_DESCRIPTION}
    chooseLabel={CHOOSE_LABEL}
    cancelLabel={CANCEL_LABEL}
    options={OPTIONS}
    selectedKey={value}
    onChoose={(key) => {
      const order = orderOf(key)
      if (order !== null) onChange(order)
    }}
  />
)

export default WalkthroughOrderField
