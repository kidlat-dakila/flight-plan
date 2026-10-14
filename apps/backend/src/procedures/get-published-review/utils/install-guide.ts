import type { InstallGuide } from "./schemas"

export const PACKAGE_NAME = "@kidlat-dakila/flightplan"

export const INSTALL_GUIDE: InstallGuide = {
  intro: "Flight Plan runs on your own machine, with Node.js 22 or later. Start it from a terminal:",
  commands: [
    { label: "Run it without installing", command: `npx ${PACKAGE_NAME}` },
    { label: "Or install it once, then start it with flightplan", command: `npm install -g ${PACKAGE_NAME}` },
  ],
  copyLabel: "Copy command",
  copiedLabel: "Copied",
}
