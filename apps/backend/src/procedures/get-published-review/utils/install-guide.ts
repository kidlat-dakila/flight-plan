import type { InstallGuide } from "./schemas"

export const PACKAGE_NAME = "@kidlat-dakila/flightplan"

const LATEST_PACKAGE = `${PACKAGE_NAME}@latest`

export const NPX_COMMAND = `npx ${LATEST_PACKAGE}`
export const GLOBAL_INSTALL_COMMAND = `npm install -g ${LATEST_PACKAGE}`

export const INSTALL_GUIDE: InstallGuide = {
  intro: "Flight Plan runs on your own machine, with Node.js 22 or later. Start it from a terminal:",
  commands: [
    { label: "Run it without installing", command: NPX_COMMAND },
    { label: "Or install it once, then start it with flightplan", command: GLOBAL_INSTALL_COMMAND },
  ],
  copyLabel: "Copy command",
  copiedLabel: "Copied",
}
