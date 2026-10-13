import TextEditor from "@flightplan/ui/TextEditor"

interface CommentEditorProps {
  readonly label: string
  readonly shouldFocus: boolean
  readonly onChange: (markdown: string) => void
}

const CONTENT_CLASSES = "font-sans text-sm [&_.tiptap]:min-h-20 [&_.tiptap]:text-sm [&_.tiptap]:leading-6"

const CommentEditor = ({ label, shouldFocus, onChange }: CommentEditorProps) => (
  <TextEditor label={label} value="" errorMessage={null} shouldFocus={shouldFocus} className={CONTENT_CLASSES} onChange={onChange} />
)

export default CommentEditor
