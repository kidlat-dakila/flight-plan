import Button from "@/components/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/blocks/dialog"
import { cn } from "@/lib/utils"

interface BrowsedFolder {
  readonly name: string
  readonly path: string
  readonly kind: "repository" | "added-repository" | "folder"
  readonly kindLabel: string
}

export interface FolderBrowser {
  readonly path: string
  readonly parentPath: string | null
  readonly folders: readonly BrowsedFolder[]
  readonly message: string | null
}

interface FolderBrowserDialogProps {
  readonly isOpen: boolean
  readonly title: string
  readonly description: string
  readonly browser: FolderBrowser | null
  readonly errorMessage: string | null
  readonly onOpenFolder: (path: string) => void
  readonly onChooseRepository: (path: string) => void
  readonly onChooseFolder: ((path: string) => void) | null
  readonly onClose: () => void
}

interface FolderListProps {
  readonly browser: FolderBrowser
  readonly onOpenFolder: (path: string) => void
  readonly onChooseRepository: (path: string) => void
}

const NAME_CLASSES: Record<BrowsedFolder["kind"], string> = {
  "repository": "font-bold",
  "added-repository": "text-muted-foreground",
  "folder": "",
}

interface FolderActionProps {
  readonly folder: BrowsedFolder
  readonly onOpenFolder: (path: string) => void
  readonly onChooseRepository: (path: string) => void
}

const FolderAction = ({ folder, onOpenFolder, onChooseRepository }: FolderActionProps) => {
  if (folder.kind === "added-repository") return null
  return folder.kind === "repository"
    ? (
        <Button
          type="button"
          size="sm"
          aria-label={`Choose ${folder.name}`}
          onClick={() => { onChooseRepository(folder.path) }}
        >
          Choose
        </Button>
      )
    : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Open ${folder.name}`}
          onClick={() => { onOpenFolder(folder.path) }}
        >
          Open
        </Button>
      )
}

const FolderList = ({ browser, onOpenFolder, onChooseRepository }: FolderListProps) => (
  <div className="grid gap-3">
    <div className="flex items-center gap-3">
      <p className="min-w-0 flex-1 font-mono text-[0.82rem] wrap-anywhere">{browser.path}</p>
      {browser.parentPath === null
        ? null
        : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { if (browser.parentPath !== null) onOpenFolder(browser.parentPath) }}
            >
              Up one folder
            </Button>
          )}
    </div>
    {browser.message === null
      ? (
          <ul className="max-h-[calc(20rem+1px)] overflow-y-auto border-t border-border">
            {browser.folders.map((folder) => (
              <li key={folder.path} className="flex h-10 items-center gap-3 border-b border-border">
                <span className={cn("min-w-0 flex-1 truncate", NAME_CLASSES[folder.kind])}>{folder.name}</span>
                <span className="text-muted-foreground">{folder.kindLabel}</span>
                <FolderAction
                  folder={folder}
                  onOpenFolder={onOpenFolder}
                  onChooseRepository={onChooseRepository}
                />
              </li>
            ))}
          </ul>
        )
      : <p className="border-t border-border pt-3 text-muted-foreground">{browser.message}</p>}
  </div>
)

const FolderBrowserDialog = ({
  isOpen,
  title,
  description,
  browser,
  errorMessage,
  onOpenFolder,
  onChooseRepository,
  onChooseFolder,
  onClose,
}: FolderBrowserDialogProps) => (
  <Dialog open={isOpen} onOpenChange={(isNextOpen) => { if (!isNextOpen) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {browser === null
        ? <p role="status" className="text-muted-foreground">Reading the folder…</p>
        : (
            <FolderList
              browser={browser}
              onOpenFolder={onOpenFolder}
              onChooseRepository={onChooseRepository}
            />
          )}
      {errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      {browser === null || onChooseFolder === null
        ? null
        : (
            <DialogFooter>
              <Button type="button" onClick={() => { onChooseFolder(browser.path) }}>Use this folder</Button>
            </DialogFooter>
          )}
    </DialogContent>
  </Dialog>
)

export default FolderBrowserDialog
