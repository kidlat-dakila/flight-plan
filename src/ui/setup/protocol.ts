/**
 * What the setup view sends to the extension.
 *
 * The state it receives is declared once, in `src/utils/setup/state.ts`.
 */

import type { ToggleableBody } from "../../lib/schemas/defaultProfile"

/** What the settings screen sends back when the user changes configuration. */
export type ConfigMessage =
  | { type: "config"; op: "switch"; profile: string }
  | { type: "config"; op: "create"; name: string }
  | { type: "config"; op: "save"; path: string; content: string }
  | { type: "config"; op: "toggle"; body: ToggleableBody; on: boolean }
