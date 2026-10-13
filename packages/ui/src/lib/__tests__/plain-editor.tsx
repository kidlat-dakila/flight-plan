import type { CommentEditorRenderer } from "@/components/CommentThread"

export const renderPlainEditor: CommentEditorRenderer = ({ label, onChange }) => (
  <textarea aria-label={label} onChange={(event) => { onChange(event.target.value) }} />
)
