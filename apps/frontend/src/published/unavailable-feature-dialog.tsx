import { useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import IconButton from "@flightplan/ui/IconButton"

interface InstallCommand {
  readonly label: string
  readonly command: string
}

interface InstallGuide {
  readonly intro: string
  readonly commands: readonly InstallCommand[]
  readonly copyLabel: string
  readonly copiedLabel: string
}

interface UnavailableFeatureDialogProps {
  readonly title: string
  readonly description: string
  readonly closeLabel: string
  readonly install: InstallGuide
  readonly onClose: () => void
}

const UnavailableFeatureDialog = ({ title, description, closeLabel, install, onClose }: UnavailableFeatureDialogProps) => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const copyCommand = (command: string): void => {
    navigator.clipboard.writeText(command).then(
      () => {
        setCopiedCommand(command)
      },
      () => {
        setCopiedCommand(null)
      },
    )
  }
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p>{install.intro}</p>
          <ul className="flex flex-col gap-3">
            {install.commands.map(({ label, command }) => {
              const isCopied = copiedCommand === command
              return (
                <li key={command} className="flex flex-col gap-1">
                  <p className="text-muted-foreground">{label}</p>
                  <div className="flex items-center gap-2 rounded-sm bg-muted py-1 pr-1 pl-3">
                    <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] leading-5 select-all">
                      <code>{command}</code>
                    </pre>
                    <IconButton
                      icon={isCopied ? "copied" : "copy"}
                      label={isCopied ? install.copiedLabel : install.copyLabel}
                      onClick={() => { copyCommand(command) }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>{closeLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UnavailableFeatureDialog
