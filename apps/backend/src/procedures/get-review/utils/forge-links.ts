import type { ForgeAdapterName } from "@/procedures/list-repositories/utils/repository"
import type { LineRange } from "./review-artifact"

export interface ForgeLocation {
  readonly forge: ForgeAdapterName
  readonly forgeSlug: string | null
  readonly commit: string
}

export interface ForgeLink {
  readonly href: string
  readonly label: string
}

interface ForgeSite {
  readonly name: string
  readonly blobUrl: (slug: string, commit: string, path: string) => string
  readonly lineFragment: (range: LineRange) => string
}

const GITHUB: ForgeSite = {
  name: "GitHub",
  blobUrl: (slug, commit, path) => `https://github.com/${slug}/blob/${commit}/${path}`,
  lineFragment: (range) => `#L${String(range.lineStart)}-L${String(range.lineEnd)}`,
}

const GITLAB: ForgeSite = {
  name: "GitLab",
  blobUrl: (slug, commit, path) => `https://gitlab.com/${slug}/-/blob/${commit}/${path}`,
  lineFragment: (range) => `#L${String(range.lineStart)}-${String(range.lineEnd)}`,
}

const BITBUCKET: ForgeSite = {
  name: "Bitbucket",
  blobUrl: (slug, commit, path) => `https://bitbucket.org/${slug}/src/${commit}/${path}`,
  lineFragment: (range) => `#lines-${String(range.lineStart)}:${String(range.lineEnd)}`,
}

const SITE_BY_FORGE: Readonly<Record<ForgeAdapterName, ForgeSite | null>> = {
  git: null,
  gh: GITHUB,
  github: GITHUB,
  gitlab: GITLAB,
  bitbucket: BITBUCKET,
}

export const forgeNameOf = (forge: ForgeAdapterName): string | null => SITE_BY_FORGE[forge]?.name ?? null

export const blobLinkOf = (location: ForgeLocation, path: string, range: LineRange | null): ForgeLink | null => {
  const site = SITE_BY_FORGE[location.forge]
  if (site === null || location.forgeSlug === null) return null
  const fragment = range === null ? "" : site.lineFragment(range)
  return {
    href: `${site.blobUrl(location.forgeSlug, location.commit, path)}${fragment}`,
    label: `Open on ${site.name}`,
  }
}
