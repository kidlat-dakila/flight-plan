import { spawn } from "node:child_process"

export interface BrowserCommand {
  readonly executable: string
  readonly commandArguments: readonly string[]
}

const WINDOWS = "win32"
const MAC = "darwin"
const EMPTY_WINDOW_TITLE = ""

export const browserCommandOf = (platform: string, url: string): BrowserCommand => {
  if (platform === MAC) return { executable: "open", commandArguments: [url] }
  if (platform === WINDOWS) return { executable: "cmd", commandArguments: ["/c", "start", EMPTY_WINDOW_TITLE, url] }
  return { executable: "xdg-open", commandArguments: [url] }
}

export const openBrowser = async (platform: string, url: string): Promise<boolean> => {
  const { executable, commandArguments } = browserCommandOf(platform, url)
  return await new Promise((resolve) => {
    const browser = spawn(executable, [...commandArguments], { stdio: "ignore", detached: true })
    browser.once("error", () => {
      resolve(false)
    })
    browser.once("spawn", () => {
      browser.unref()
      resolve(true)
    })
  })
}
