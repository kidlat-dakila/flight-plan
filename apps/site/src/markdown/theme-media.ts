import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri"

type MdastPlugin = NonNullable<SatteriProcessorOptions["mdastPlugins"]>[number]

export const DOCS_MEDIA_PATH = "/docs-media/"

const THEMED_FILE_NAME = /(?<stem>[\w-]+)-light\.(?<extension>webm|mp4|png|webp)$/
const VIDEO_EXTENSIONS = new Set(["webm", "mp4"])
const POSTER_EXTENSION = "webp"
const THEMES = ["light", "dark"] as const

type Theme = (typeof THEMES)[number]

interface ThemedFile {
  readonly stem: string
  readonly extension: string
}

const escapeAttribute = (text: string): string =>
  text.replaceAll("&", "&amp;").replaceAll("\"", "&quot;").replaceAll("<", "&lt;")

const findThemedFile = (url: string): ThemedFile | null => {
  const groups = THEMED_FILE_NAME.exec(url)?.groups
  return groups === undefined ? null : { stem: groups.stem, extension: groups.extension }
}

const mediaUrl = (file: ThemedFile, theme: Theme, extension: string): string =>
  `${DOCS_MEDIA_PATH}${file.stem}-${theme}.${extension}`

const videoHtml = (file: ThemedFile, theme: Theme, label: string): string =>
  `<video class="theme-media__${theme}" data-docs-clip src="${mediaUrl(file, theme, file.extension)}" `
  + `poster="${mediaUrl(file, theme, POSTER_EXTENSION)}" aria-label="${label}" `
  + "autoplay muted loop playsinline controls preload=\"metadata\"></video>"

const imageHtml = (file: ThemedFile, theme: Theme, label: string): string =>
  `<img class="theme-media__${theme}" src="${mediaUrl(file, theme, file.extension)}" alt="${label}" loading="lazy" decoding="async">`

export const themeMediaHtml = (url: string, alt: string): string | null => {
  const file = findThemedFile(url)
  if (file === null) return null
  const label = escapeAttribute(alt)
  const toHtml = VIDEO_EXTENSIONS.has(file.extension) ? videoHtml : imageHtml
  return `<span class="theme-media">${THEMES.map((theme) => toHtml(file, theme, label)).join("")}</span>`
}

export const themeMediaPlugin: MdastPlugin = {
  name: "flight-plan-theme-media",
  image(node) {
    const html = themeMediaHtml(node.url, node.alt ?? "")
    return html === null ? undefined : { type: "html", value: html }
  },
}
