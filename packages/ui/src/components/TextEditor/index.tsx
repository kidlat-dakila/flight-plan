import { Markdown } from "@tiptap/markdown"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  BoldIcon,
  CodeIcon,
  FileCodeIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  SquareCodeIcon,
  TextQuoteIcon,
  type LucideIcon,
} from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import Button from "@/components/blocks/button"
import Input from "@/components/blocks/input"
import codeLinkNode, { CODE_LINK_NODE_NAME, type CodeLinkAttributes } from "@/lib/code-link-node"
import { cn } from "@/lib/utils"

export interface CodeLinkRequest {
  readonly selectedText: string
  readonly onInsert: (codeLink: CodeLinkAttributes) => void
  readonly onClose: () => void
}

interface TextEditorProps {
  readonly label: string
  readonly value: string
  readonly errorMessage: string | null
  readonly className?: string
  readonly shouldFocus?: boolean
  readonly renderCodeLinkDialog?: (request: CodeLinkRequest) => ReactNode
  readonly onChange: (markdown: string) => void
}

type FormatName = "bold" | "italic" | "code" | "heading" | "bulletList" | "orderedList" | "blockquote" | "codeBlock"

interface Format {
  readonly name: FormatName
  readonly label: string
  readonly icon: LucideIcon
  readonly toggle: (editor: Editor) => void
}

type ActiveFormats = Readonly<Record<FormatName | "link", boolean>>

const TOOLBAR_HEADING_LEVEL = 3
const LINK_MARK_NAME = "link"
const LINK_LABEL = "Link"
const LINK_ADDRESS_LABEL = "Link address"
const LINK_ADDRESS_PLACEHOLDER = "https://"
const APPLY_LINK_LABEL = "Apply"
const REMOVE_LINK_LABEL = "Remove link"
const CODE_LINK_LABEL = "Code link"
const SELECTED_TEXT_SEPARATOR = " "

const FORMATS: readonly Format[] = [
  { name: "bold", label: "Bold", icon: BoldIcon, toggle: (editor) => { editor.chain().focus().toggleBold().run() } },
  { name: "italic", label: "Italic", icon: ItalicIcon, toggle: (editor) => { editor.chain().focus().toggleItalic().run() } },
  { name: "code", label: "Code", icon: CodeIcon, toggle: (editor) => { editor.chain().focus().toggleCode().run() } },
  {
    name: "heading",
    label: "Heading",
    icon: HeadingIcon,
    toggle: (editor) => { editor.chain().focus().toggleHeading({ level: TOOLBAR_HEADING_LEVEL }).run() },
  },
  { name: "bulletList", label: "Bulleted list", icon: ListIcon, toggle: (editor) => { editor.chain().focus().toggleBulletList().run() } },
  { name: "orderedList", label: "Numbered list", icon: ListOrderedIcon, toggle: (editor) => { editor.chain().focus().toggleOrderedList().run() } },
  { name: "blockquote", label: "Quote", icon: TextQuoteIcon, toggle: (editor) => { editor.chain().focus().toggleBlockquote().run() } },
  { name: "codeBlock", label: "Code block", icon: SquareCodeIcon, toggle: (editor) => { editor.chain().focus().toggleCodeBlock().run() } },
]

const EXTENSIONS = [
  StarterKit.configure({
    strike: false,
    underline: false,
    horizontalRule: false,
    link: { openOnClick: false, autolink: false },
  }),
  codeLinkNode,
  Markdown,
]

const CONTENT_CLASSES = cn(
  "flex min-h-32 flex-col gap-4 px-3 py-2.5 text-base leading-[1.7] text-pretty outline-none",
  "[&_:is(h1,h2,h3,h4,h5,h6)]:text-[1.1875rem] [&_:is(h1,h2,h3,h4,h5,h6)]:leading-7 [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold [&_:is(h1,h2,h3,h4,h5,h6)]:tracking-[-0.01em]",
  "[&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5",
  "[&_ol_ol]:mt-2 [&_ol_ul]:mt-2 [&_ul_ol]:mt-2 [&_ul_ul]:mt-2",
  "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.875em] [&_strong]:font-bold",
  "[&_a]:underline [&_a]:decoration-1 [&_a]:underline-offset-[0.3em]",
  "[&_blockquote]:flex [&_blockquote]:flex-col [&_blockquote]:gap-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-code [&_pre]:px-4 [&_pre]:py-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-6 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[1em]",
  "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-ring",
)

const FRAME_CLASSES = "rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 aria-invalid:border-destructive"
const FORMAT_BUTTON_CLASSES = "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-foreground aria-pressed:text-background"

const activeFormatsOf = (editor: Editor): ActiveFormats => ({
  bold: editor.isActive("bold"),
  italic: editor.isActive("italic"),
  code: editor.isActive("code"),
  heading: editor.isActive("heading"),
  bulletList: editor.isActive("bulletList"),
  orderedList: editor.isActive("orderedList"),
  blockquote: editor.isActive("blockquote"),
  codeBlock: editor.isActive("codeBlock"),
  link: editor.isActive(LINK_MARK_NAME),
})

const linkAddressOf = (editor: Editor): string => {
  const { href } = editor.getAttributes(LINK_MARK_NAME)
  return typeof href === "string" ? href : ""
}

const selectedTextOf = (editor: Editor): string => {
  const { from, to } = editor.state.selection
  return editor.state.doc.textBetween(from, to, SELECTED_TEXT_SEPARATOR)
}

const applyLink = (editor: Editor, href: string): void => {
  if (editor.state.selection.empty && !editor.isActive(LINK_MARK_NAME)) {
    editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: LINK_MARK_NAME, attrs: { href } }] }).run()
    return
  }
  editor.chain().focus().extendMarkRange(LINK_MARK_NAME).setLink({ href }).run()
}

const removeLink = (editor: Editor): void => {
  editor.chain().focus().extendMarkRange(LINK_MARK_NAME).unsetLink().run()
}

const insertCodeLink = (editor: Editor, codeLink: CodeLinkAttributes): void => {
  editor.chain().focus().insertContent({ type: CODE_LINK_NODE_NAME, attrs: codeLink }).run()
}

interface ToolbarButtonProps {
  readonly label: string
  readonly icon: LucideIcon
  readonly isPressed: boolean
  readonly onClick: () => void
}

const ToolbarButton = (props: ToolbarButtonProps) => (
  <button
    type="button"
    aria-label={props.label}
    title={props.label}
    aria-pressed={props.isPressed}
    className={FORMAT_BUTTON_CLASSES}
    onMouseDown={(event) => { event.preventDefault() }}
    onClick={props.onClick}
  >
    <props.icon aria-hidden="true" className="size-4" />
  </button>
)

interface LinkFieldProps {
  readonly address: string
  readonly canRemove: boolean
  readonly onApply: (address: string) => void
  readonly onRemove: () => void
}

const LinkField = ({ address, canRemove, onApply, onRemove }: LinkFieldProps) => {
  const [draft, setDraft] = useState(address)
  const trimmedDraft = draft.trim()
  return (
    <div className="flex items-center gap-2 border-b border-input px-2 py-1.5">
      <Input
        type="url"
        value={draft}
        placeholder={LINK_ADDRESS_PLACEHOLDER}
        aria-label={LINK_ADDRESS_LABEL}
        className="h-7 flex-1"
        onChange={(event) => { setDraft(event.target.value) }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          if (trimmedDraft !== "") onApply(trimmedDraft)
        }}
      />
      {canRemove ? <Button type="button" variant="ghost" size="sm" onClick={onRemove}>{REMOVE_LINK_LABEL}</Button> : null}
      <Button type="button" size="sm" disabled={trimmedDraft === ""} onClick={() => { onApply(trimmedDraft) }}>{APPLY_LINK_LABEL}</Button>
    </div>
  )
}

interface FormatToolbarProps {
  readonly editor: Editor
  readonly label: string
  readonly isLinking: boolean
  readonly canLinkCode: boolean
  readonly onToggleLinking: () => void
  readonly onLinkCode: () => void
}

const FormatToolbar = ({ editor, label, isLinking, canLinkCode, onToggleLinking, onLinkCode }: FormatToolbarProps) => {
  const activeFormats = useEditorState({ editor, selector: (snapshot) => activeFormatsOf(snapshot.editor) })
  return (
    <div role="toolbar" aria-label={label} className="flex flex-wrap items-center gap-1 border-b border-input px-2 py-1.5">
      {FORMATS.map((format) => (
        <ToolbarButton
          key={format.name}
          label={format.label}
          icon={format.icon}
          isPressed={activeFormats[format.name]}
          onClick={() => { format.toggle(editor) }}
        />
      ))}
      <ToolbarButton label={LINK_LABEL} icon={LinkIcon} isPressed={activeFormats.link || isLinking} onClick={onToggleLinking} />
      {canLinkCode ? <ToolbarButton label={CODE_LINK_LABEL} icon={FileCodeIcon} isPressed={false} onClick={onLinkCode} /> : null}
    </div>
  )
}

const TextEditor = ({ label, value, errorMessage, className, shouldFocus = false, renderCodeLinkDialog, onChange }: TextEditorProps) => {
  const errorId = useId()
  const [isLinking, setIsLinking] = useState(false)
  const [isLinkingCode, setIsLinkingCode] = useState(false)
  const hasError = errorMessage !== null
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    contentType: "markdown",
    autofocus: shouldFocus,
    editorProps: {
      attributes: { "role": "textbox", "aria-multiline": "true", "aria-label": label, "class": CONTENT_CLASSES },
    },
    onUpdate: ({ editor: updated }) => { onChange(updated.getMarkdown()) },
  })

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div aria-invalid={hasError} className={FRAME_CLASSES}>
        <FormatToolbar
          editor={editor}
          label={`${label} formatting`}
          isLinking={isLinking}
          canLinkCode={renderCodeLinkDialog !== undefined}
          onToggleLinking={() => { setIsLinking((isOpen) => !isOpen) }}
          onLinkCode={() => { setIsLinkingCode(true) }}
        />
        {isLinking
          ? (
              <LinkField
                address={linkAddressOf(editor)}
                canRemove={editor.isActive(LINK_MARK_NAME)}
                onApply={(address) => {
                  applyLink(editor, address)
                  setIsLinking(false)
                }}
                onRemove={() => {
                  removeLink(editor)
                  setIsLinking(false)
                }}
              />
            )
          : null}
        <EditorContent editor={editor} aria-describedby={hasError ? errorId : undefined} />
      </div>
      {hasError ? <p id={errorId} role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
      {isLinkingCode && renderCodeLinkDialog !== undefined
        ? renderCodeLinkDialog({
            selectedText: selectedTextOf(editor),
            onInsert: (codeLink) => {
              insertCodeLink(editor, codeLink)
              setIsLinkingCode(false)
            },
            onClose: () => { setIsLinkingCode(false) },
          })
        : null}
    </div>
  )
}

export default TextEditor
