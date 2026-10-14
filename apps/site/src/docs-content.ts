export const DOCS_CONTENT_FOLDER = "../../packages/docs/src/"

const DOCS_ROUTE = "docs"
const MARKDOWN_EXTENSION = /\.md$/
const INDEX_PAGE = /(?:^|\/)index$/

export const toDocsId = ({ entry }: { readonly entry: string }): string =>
  [DOCS_ROUTE, entry.replace(MARKDOWN_EXTENSION, "").replace(INDEX_PAGE, "")].filter(Boolean).join("/")
