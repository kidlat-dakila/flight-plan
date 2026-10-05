import { ChevronsUpDownIcon } from "lucide-react"
import { useId, useState } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"

export interface SelectDialogOption {
  readonly key: string
  readonly label: string
  readonly tagLabel: string | null
  readonly summary: string
  readonly description: string
  readonly note: string | null
}

interface SelectDialogProps {
  readonly label: string
  readonly dialogTitle: string
  readonly dialogDescription: string
  readonly chooseLabel: string
  readonly cancelLabel: string
  readonly options: readonly SelectDialogOption[]
  readonly selectedKey: string
  readonly describedBy?: string
  readonly onChoose: (key: string) => void
}

interface OptionNameProps {
  readonly option: SelectDialogOption
}

const TRIGGER_CLASSES = "flex w-full max-w-xl items-center gap-3 rounded-lg border border-input bg-card px-3 py-2 text-left transition-colors duration-[180ms] ease-out outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-expanded:bg-muted"

const OptionName = ({ option }: OptionNameProps) => (
  <span className="flex items-baseline gap-2">
    <span className="font-bold">{option.label}</span>
    {option.tagLabel === null ? null : <span className="text-sm text-muted-foreground">{option.tagLabel}</span>}
  </span>
)

const SelectDialog = ({
  label,
  dialogTitle,
  dialogDescription,
  chooseLabel,
  cancelLabel,
  options,
  selectedKey,
  describedBy,
  onChoose,
}: SelectDialogProps) => {
  const groupId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingKey, setPendingKey] = useState(selectedKey)
  const selected = options.find((option) => option.key === selectedKey)

  const handleOpen = () => {
    setPendingKey(selectedKey)
    setIsOpen(true)
  }

  const handleChoose = () => {
    onChoose(pendingKey)
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        aria-describedby={describedBy}
        className={TRIGGER_CLASSES}
        onClick={handleOpen}
      >
        <span className="min-w-0 flex-1">
          {selected === undefined
            ? null
            : (
                <>
                  <OptionName option={selected} />
                  <span className="block text-sm text-muted-foreground">{selected.summary}</span>
                </>
              )}
        </span>
        <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <form action={handleChoose} className="grid gap-4">
            <fieldset>
              <legend className="sr-only">{label}</legend>
              <ul className="max-h-[60dvh] overflow-y-auto border-t border-border">
                {options.map((option) => (
                  <li key={option.key} className="border-b border-border py-3">
                    <label className="flex cursor-pointer items-start gap-3 text-base">
                      <input
                        type="radio"
                        name={groupId}
                        checked={pendingKey === option.key}
                        className="mt-1 size-4 shrink-0 accent-(--primary)"
                        onChange={() => { setPendingKey(option.key) }}
                      />
                      <span className="min-w-0">
                        <OptionName option={option} />
                        <span className="block text-sm">{option.summary}</span>
                        <span className="block text-sm text-muted-foreground">{option.description}</span>
                        {option.note === null
                          ? null
                          : <span className="block text-sm text-muted-foreground">{option.note}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setIsOpen(false) }}>{cancelLabel}</Button>
              <Button type="submit">{chooseLabel}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SelectDialog
