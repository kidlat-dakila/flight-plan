import blastPosterDark from "@/assets/screenshots/blast-poster-dark.png"
import blastPosterLight from "@/assets/screenshots/blast-poster-light.png"
import customizeDark from "@/assets/screenshots/customize-dark.png"
import customizeLight from "@/assets/screenshots/customize-light.png"
import heroPosterDark from "@/assets/screenshots/hero-poster-dark.png"
import heroPosterLight from "@/assets/screenshots/hero-poster-light.png"
import tracePosterDark from "@/assets/screenshots/trace-poster-dark.png"
import tracePosterLight from "@/assets/screenshots/trace-poster-light.png"
import filtersPosterDark from "@/assets/screenshots/walkthrough-filters-poster-dark.png"
import filtersPosterLight from "@/assets/screenshots/walkthrough-filters-poster-light.png"
import tooltipsPosterDark from "@/assets/screenshots/walkthrough-tooltips-poster-dark.png"
import tooltipsPosterLight from "@/assets/screenshots/walkthrough-tooltips-poster-light.png"
import waypointsPosterDark from "@/assets/screenshots/walkthrough-waypoints-poster-dark.png"
import waypointsPosterLight from "@/assets/screenshots/walkthrough-waypoints-poster-light.png"

export const HERO_POSTER = {
  light: heroPosterLight,
  dark: heroPosterDark,
  alt: "Flight Plan's review page for a pull request of demo-react: the section rail at the left, and the Code Walkthrough of src/api/orders.ts with a waypoint opened that explains updateOrder() and carries a Needs Attention note.",
} as const

export const HERO_VIDEOS = {
  light: { webm: "/media/hero-light.webm", mp4: "/media/hero-light.mp4" },
  dark: { webm: "/media/hero-dark.webm", mp4: "/media/hero-dark.mp4" },
} as const

export const TRACE_POSTER = {
  light: tracePosterLight,
  dark: tracePosterDark,
  alt: "A Trace Diagram in full screen: the hook useOrders is open in the side panel, with its code and the waypoint that explains useOrders(), next to the ViewOrdersPage card that calls it.",
} as const

export const TRACE_VIDEOS = {
  light: { webm: "/media/trace-light.webm", mp4: "/media/trace-light.mp4" },
  dark: { webm: "/media/trace-dark.webm", mp4: "/media/trace-dark.mp4" },
} as const

export const BLAST_POSTER = {
  light: blastPosterLight,
  dark: blastPosterDark,
  alt: "A Blast Diagram in full screen, in its Import bound view: the changed files of the segment among the files they import that the change did not touch, such as SessionProvider.tsx, button.tsx and use-customers.ts.",
} as const

export const BLAST_VIDEOS = {
  light: { webm: "/media/blast-light.webm", mp4: "/media/blast-light.mp4" },
  dark: { webm: "/media/blast-dark.webm", mp4: "/media/blast-dark.mp4" },
} as const

export const WAYPOINTS_POSTER = {
  light: waypointsPosterLight,
  dark: waypointsPosterDark,
  alt: "A waypoint of the Code Walkthrough marked Risk: updateOrder() sends back the status the form loaded, with the trace of how it happens and the suggested fix as a diff.",
} as const

export const WAYPOINTS_VIDEOS = {
  light: { webm: "/media/walkthrough-waypoints-light.webm", mp4: "/media/walkthrough-waypoints-light.mp4" },
  dark: { webm: "/media/walkthrough-waypoints-dark.webm", mp4: "/media/walkthrough-waypoints-dark.mp4" },
} as const

export const FILTERS_POSTER = {
  light: filtersPosterLight,
  dark: filtersPosterDark,
  alt: "The Code Walkthrough filtered to component and hook waypoints: 19 waypoints left, starting with useOrders() in src/hooks/use-orders.ts.",
} as const

export const FILTERS_VIDEOS = {
  light: { webm: "/media/walkthrough-filters-light.webm", mp4: "/media/walkthrough-filters-light.mp4" },
  dark: { webm: "/media/walkthrough-filters-dark.webm", mp4: "/media/walkthrough-filters-dark.mp4" },
} as const

export const TOOLTIPS_POSTER = {
  light: tooltipsPosterLight,
  dark: tooltipsPosterDark,
  alt: "A hover card on OrderForm in the code: 2 usages in 2 files, the lines of create.tsx and edit.tsx that render it.",
} as const

export const TOOLTIPS_VIDEOS = {
  light: { webm: "/media/walkthrough-tooltips-light.webm", mp4: "/media/walkthrough-tooltips-light.mp4" },
  dark: { webm: "/media/walkthrough-tooltips-dark.webm", mp4: "/media/walkthrough-tooltips-dark.mp4" },
} as const

export const CUSTOMIZE_SHOT = {
  light: customizeLight,
  dark: customizeDark,
  alt: "Flight Plan's settings for the Standard configuration: a list of every field of a review at the left, and the instruction for how the agent writes a waypoint's reading, open in an editor.",
} as const
