import blastPosterDark from "@/assets/screenshots/blast-poster-dark.png"
import blastPosterLight from "@/assets/screenshots/blast-poster-light.png"
import changeOverviewPosterDark from "@/assets/screenshots/change-overview-poster-dark.png"
import changeOverviewPosterLight from "@/assets/screenshots/change-overview-poster-light.png"
import customizeDark from "@/assets/screenshots/customize-dark.png"
import customizeLight from "@/assets/screenshots/customize-light.png"
import explainDark from "@/assets/screenshots/explain-dark.png"
import explainLight from "@/assets/screenshots/explain-light.png"
import heroPosterDark from "@/assets/screenshots/hero-poster-dark.png"
import heroPosterLight from "@/assets/screenshots/hero-poster-light.png"
import spotlightDark from "@/assets/screenshots/spotlight-dark.png"
import spotlightLight from "@/assets/screenshots/spotlight-light.png"
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
  alt: "Flight Plan's review page for pull request 57 of pokedex-web. The section rail is at the left, and the Code Walkthrough of src/hooks/use-pokemon.ts has the waypoint for usePokemon() open, marked Core change and Spotlight, with the agent's note on why it is a core change.",
} as const

export const HERO_VIDEOS = {
  light: { webm: "/media/hero-light.webm", mp4: "/media/hero-light.mp4" },
  dark: { webm: "/media/hero-dark.webm", mp4: "/media/hero-dark.mp4" },
} as const

export const CHANGE_OVERVIEW_POSTER = {
  light: changeOverviewPosterLight,
  dark: changeOverviewPosterDark,
  alt: "The Change Overview of a segment, with its changed code blocks in rows by classification, Page, Component, UI state and Logic. The pointer rests on the card of usePokemon, which shows the hook's code.",
} as const

export const CHANGE_OVERVIEW_VIDEOS = {
  light: { webm: "/media/change-overview-light.webm", mp4: "/media/change-overview-light.mp4" },
  dark: { webm: "/media/change-overview-dark.webm", mp4: "/media/change-overview-dark.mp4" },
} as const

export const TRACE_POSTER = {
  light: tracePosterLight,
  dark: tracePosterDark,
  alt: "A Trace Diagram in full screen, from a FastAPI review. The side panel shows the code of create_pokemon() with the waypoint for its session.commit() open, beside the route handler add_pokemon that calls it.",
} as const

export const TRACE_VIDEOS = {
  light: { webm: "/media/trace-light.webm", mp4: "/media/trace-light.mp4" },
  dark: { webm: "/media/trace-dark.webm", mp4: "/media/trace-dark.mp4" },
} as const

export const BLAST_POSTER = {
  light: blastPosterLight,
  dark: blastPosterDark,
  alt: "A Blast Diagram in full screen, in its Import bound view: the changed files of the segment among the files they import that the change did not touch, such as SessionProvider.tsx and button.tsx.",
} as const

export const BLAST_VIDEOS = {
  light: { webm: "/media/blast-light.webm", mp4: "/media/blast-light.mp4" },
  dark: { webm: "/media/blast-dark.webm", mp4: "/media/blast-dark.mp4" },
} as const

export const WAYPOINTS_POSTER = {
  light: waypointsPosterLight,
  dark: waypointsPosterDark,
  alt: "A waypoint of the Code Walkthrough marked Risk: PokemonFilters hides a failed load of the trainers, with the trace of how it happens and the suggested fix as a diff.",
} as const

export const WAYPOINTS_VIDEOS = {
  light: { webm: "/media/walkthrough-waypoints-light.webm", mp4: "/media/walkthrough-waypoints-light.mp4" },
  dark: { webm: "/media/walkthrough-waypoints-dark.webm", mp4: "/media/walkthrough-waypoints-dark.mp4" },
} as const

export const SPOTLIGHT_SHOT = {
  light: spotlightLight,
  dark: spotlightDark,
  alt: "A waypoint for the hook usePokemon(), marked Core change and Spotlight. The agent explains what the hook does, then why the rest of the change depends on it.",
} as const

export const FILTERS_POSTER = {
  light: filtersPosterLight,
  dark: filtersPosterDark,
  alt: "The Code Walkthrough filtered to Component and UI state. The filter has gone to the first waypoint it keeps, the Zustand store usePokemonFilters, and shows its card above the code.",
} as const

export const FILTERS_VIDEOS = {
  light: { webm: "/media/walkthrough-filters-light.webm", mp4: "/media/walkthrough-filters-light.mp4" },
  dark: { webm: "/media/walkthrough-filters-dark.webm", mp4: "/media/walkthrough-filters-dark.mp4" },
} as const

export const TOOLTIPS_POSTER = {
  light: tooltipsPosterLight,
  dark: tooltipsPosterDark,
  alt: "A hover card on usePokemonFilters in the code. It lists 3 usages in 2 files, the lines of use-pokemon.ts and PokemonFilters.tsx that call it.",
} as const

export const TOOLTIPS_VIDEOS = {
  light: { webm: "/media/walkthrough-tooltips-light.webm", mp4: "/media/walkthrough-tooltips-light.mp4" },
  dark: { webm: "/media/walkthrough-tooltips-dark.webm", mp4: "/media/walkthrough-tooltips-dark.mp4" },
} as const

export const EXPLAIN_SHOT = {
  light: explainLight,
  dark: explainDark,
  alt: "The dialog that asks Claude to explain a review. It lists the parts to explain, the prompt configuration, the Code Walkthrough order, the segments and the 29 waypoints to check, above the buttons Configure, Not now and Explain.",
} as const

export const CUSTOMIZE_SHOT = {
  light: customizeLight,
  dark: customizeDark,
  alt: "Flight Plan's settings for the Standard configuration: a list of every field of a review at the left, and the instruction for how the agent writes a waypoint's reading, open in an editor.",
} as const
