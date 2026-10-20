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
  readonly summary: string | null
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
  readonly onChoose: (key: string) => void
}

interface OptionTextProps {
  readonly option: SelectDialogOption
}

const TRIGGER_CLASSES = "flex w-full max-w-xl cursor-pointer items-start gap-3 rounded-lg border border-input bg-card px-3 py-2.5 text-left transition-colors duration-[180ms] ease-out outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-expanded:bg-muted"

const OptionText = ({ option }: OptionTextProps) => (
  <>
    <span className="block font-bold">{option.label}</span>
    {option.summary === null ? null : <span className="block text-sm">{option.summary}</span>}
    <span className="block text-sm text-muted-foreground">{option.description}</span>
  </>
)

const SelectDialog = ({
  label,
  dialogTitle,
  dialogDescription,
  chooseLabel,
  cancelLabel,
  options,
  selectedKey,
  onChoose,
}: SelectDialogProps) => {
  const groupId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingKey, setPendingKey] = useState(selectedKey)
  const selected = options.find((option) => option.key === selectedKey)

  const open = () => {
    setPendingKey(selectedKey)
    setIsOpen(true)
  }

  const choose = () => {
    onChoose(pendingKey)
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={selected === undefined ? label : `${label}, ${selected.label}`}
        className={TRIGGER_CLASSES}
        onClick={open}
      >
        <span className="min-w-0 flex-1">
          {selected === undefined ? null : <OptionText option={selected} />}
        </span>
        <ChevronsUpDownIcon aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
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
                      <OptionText option={option} />
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
            <Button type="button" onClick={choose}>{chooseLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SelectDialog
