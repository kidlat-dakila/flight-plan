import blastDark from "@/assets/screenshots/blast-dark.png"
import blastLight from "@/assets/screenshots/blast-light.png"
import contextDark from "@/assets/screenshots/context-dark.png"
import contextLight from "@/assets/screenshots/context-light.png"
import customizeDark from "@/assets/screenshots/customize-dark.png"
import customizeLight from "@/assets/screenshots/customize-light.png"
import heroPosterDark from "@/assets/screenshots/hero-poster-dark.png"
import heroPosterLight from "@/assets/screenshots/hero-poster-light.png"
import journeyDark from "@/assets/screenshots/journey-dark.png"
import journeyLight from "@/assets/screenshots/journey-light.png"
import walkthroughDark from "@/assets/screenshots/walkthrough-dark.png"
import walkthroughLight from "@/assets/screenshots/walkthrough-light.png"

export const HERO_POSTER = {
  light: heroPosterLight,
  dark: heroPosterDark,
  alt: "Flight Plan's review page for a pull request of demo-react: the section rail at the left, and the Code Walkthrough of src/api/orders.ts with a waypoint opened that explains updateOrder() and carries a Needs Attention note.",
} as const

export const HERO_VIDEOS = {
  light: { webm: "/media/hero-light.webm", mp4: "/media/hero-light.mp4" },
  dark: { webm: "/media/hero-dark.webm", mp4: "/media/hero-dark.mp4" },
} as const

export const CONTEXT_SHOT = {
  light: contextLight,
  dark: contextDark,
  alt: "The Context of a review: a paragraph on why the change exists, then an Overview of what a staff member sees, written as When and then.",
} as const

export const JOURNEY_SHOT = {
  light: journeyLight,
  dark: journeyDark,
  alt: "A Journey Flow Diagram: the hooks useCreateOrder and useUpdateOrder, each with its steps, call createOrder and updateOrder.",
} as const

export const BLAST_SHOT = {
  light: blastLight,
  dark: blastDark,
  alt: "A Blast Diagram: 10 files, 9 changed, 15 imports and 1 file the change did not touch, drawn as marks joined by import arrows.",
} as const

export const WALKTHROUGH_SHOT = {
  light: walkthroughLight,
  dark: walkthroughDark,
  alt: "The head of a Code Walkthrough: it covers all 6 changed files in 63 waypoints, says in what order it reads them, and opens the first file with its waypoints.",
} as const

export const CUSTOMIZE_SHOT = {
  light: customizeLight,
  dark: customizeDark,
  alt: "Flight Plan's settings for the Standard configuration: a list of every field of a review at the left, and the instruction for how the agent writes a waypoint's reading, open in an editor.",
} as const
