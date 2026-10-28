import type { MouseEvent } from "react"
import { isPlainClick } from "./browser-navigation"
import { playgroundGroupsOf, playgroundPagePathOf } from "./playground-path"

interface NavPlayground {
  readonly id: string
  readonly language: string
  readonly framework: string
}

interface PlaygroundNavProps {
  readonly playgrounds: readonly NavPlayground[]
  readonly currentId: string | null
  readonly onNavigate: (path: string) => void
}

interface NavLinkProps {
  readonly path: string
  readonly label: string
  readonly isCurrent: boolean
  readonly testId: string
  readonly playgroundId?: string
  readonly onNavigate: (path: string) => void
}

const NAV_LABEL = "Playgrounds"
const FIXTURE_LAB_LABEL = "Fixture lab"
const FIXTURE_LAB_PATH = "/"
const CURRENT_PAGE = "page"
const LINK_CLASSES = "block rounded-sm px-2 py-0.5 text-foreground hover:bg-accent aria-[current=page]:bg-primary aria-[current=page]:font-medium aria-[current=page]:text-primary-foreground"

const NavLink = ({ path, label, isCurrent, testId, playgroundId, onNavigate }: NavLinkProps) => {
  const followLink = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    onNavigate(path)
  }
  return (
    <a href={path} aria-current={isCurrent ? CURRENT_PAGE : undefined} data-testid={testId} data-playground-id={playgroundId} className={LINK_CLASSES} onClick={followLink}>
      {label}
    </a>
  )
}

const PlaygroundNav = ({ playgrounds, currentId, onNavigate }: PlaygroundNavProps) => (
  <nav
    aria-label={NAV_LABEL}
    data-testid="playground-nav"
    className="sticky top-0 z-[60] flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-input bg-card px-4 py-2 text-sm text-foreground"
  >
    <NavLink path={FIXTURE_LAB_PATH} label={FIXTURE_LAB_LABEL} isCurrent={false} testId="fixture-lab-link" onNavigate={onNavigate} />
    {playgroundGroupsOf(playgrounds).map(({ language, playgrounds: languagePlaygrounds }) => (
      <div key={language} className="flex flex-wrap items-center gap-1">
        <span className="pr-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{language}</span>
        <ul aria-label={language} className="flex flex-wrap items-center gap-0.5">
          {languagePlaygrounds.map((playground) => (
            <li key={playground.id}>
              <NavLink
                path={playgroundPagePathOf(playground.id)}
                label={playground.framework}
                isCurrent={playground.id === currentId}
                testId="playground-link"
                playgroundId={playground.id}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
)

export default PlaygroundNav
