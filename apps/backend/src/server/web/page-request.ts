const PAGE_METHOD = "GET"
const SERVER_PATH_PREFIXES = ["/api/", "/mcp", "/assets/"] as const

const pathOf = (url: string): string => url.split("?")[0] ?? url

export const isPageRequest = (method: string, url: string): boolean =>
  method === PAGE_METHOD && !SERVER_PATH_PREFIXES.some((prefix) => pathOf(url).startsWith(prefix))
