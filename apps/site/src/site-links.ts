export const REPOSITORY_URL = "https://github.com/kidlat-dakila/flight-plan"
export const INSTALL_COMMAND = "npx @kidlat-dakila/flightplan"
export const INSTALL_ANCHOR = "#install"

export const NAVIGATION_LINKS = [
  { label: "Docs", href: "/docs/", isCompact: true },
  { label: "Demo", href: "/demo/", isCompact: true },
  { label: "About", href: "/about/", isCompact: false },
  { label: "GitHub", href: REPOSITORY_URL, isCompact: false },
] as const
