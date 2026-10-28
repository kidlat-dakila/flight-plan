export interface PlaygroundRoute {
  readonly language: string | null
  readonly framework: string | null
}

interface RoutedPlayground {
  readonly id: string
  readonly language: string
  readonly framework: string
}

export interface PlaygroundGroup<Playground> {
  readonly language: string
  readonly playgrounds: readonly Playground[]
}

export const PLAYGROUND_PATH = "/playground"
const PATH_SEPARATOR = "/"

export const isPlaygroundPath = (pathname: string): boolean =>
  pathname === PLAYGROUND_PATH || pathname.startsWith(`${PLAYGROUND_PATH}${PATH_SEPARATOR}`)

export const playgroundRouteOf = (pathname: string): PlaygroundRoute => {
  const parts = pathname.slice(PLAYGROUND_PATH.length).split(PATH_SEPARATOR).filter((part) => part !== "")
  return { language: parts.at(0) ?? null, framework: parts.at(1) ?? null }
}

export const playgroundPagePathOf = (id: string): string => `${PLAYGROUND_PATH}${PATH_SEPARATOR}${id}`

export const chosenPlaygroundOf = <Playground extends RoutedPlayground>(playgrounds: readonly Playground[], { language, framework }: PlaygroundRoute): Playground | null =>
  playgrounds.find((playground) => playground.language === language && playground.framework === framework)
  ?? playgrounds.find((playground) => playground.language === language)
  ?? playgrounds.at(0)
  ?? null

export const redirectPathOf = (pathname: string, chosen: RoutedPlayground | null): string | null => {
  if (chosen === null) return null
  const chosenPath = playgroundPagePathOf(chosen.id)
  return chosenPath === pathname ? null : chosenPath
}

export const playgroundGroupsOf = <Playground extends RoutedPlayground>(playgrounds: readonly Playground[]): PlaygroundGroup<Playground>[] =>
  [...new Set(playgrounds.map((playground) => playground.language))].map((language) => ({
    language,
    playgrounds: playgrounds.filter((playground) => playground.language === language),
  }))
