import { createContext, use, useEffect, useLayoutEffect, useRef } from "react"
import { navigatorSignatureOf, type NavigatorGroup, type NavigatorRail } from "@/lib/navigator-controls"

export type GroupsReader = () => readonly NavigatorGroup[]

export interface FullScreenOwner {
  readonly anchorId: string
  readonly onLeave: () => void
}

export interface NavigatorSections {
  readonly register: (anchorId: string, readGroups: GroupsReader) => () => void
  readonly notify: () => void
  readonly onFullScreenOwnerChange: (owner: FullScreenOwner | null) => void
}

export interface NavigatorState {
  readonly rail: NavigatorRail
  readonly dominantAnchorId: string | null
  readonly groups: readonly NavigatorGroup[]
  readonly fullScreenOwner: FullScreenOwner | null
  readonly openMenuKey: string | null
  readonly flashedKey: string | null
  readonly onOpenMenuKeyChange: (key: string | null) => void
  readonly onJump: (anchorId: string) => void
}

export const NavigatorSectionsContext = createContext<NavigatorSections | null>(null)

export const NavigatorContext = createContext<NavigatorState | null>(null)

export const useNavigatorSection = (anchorId: string | null, groups: readonly NavigatorGroup[]): void => {
  const sections = use(NavigatorSectionsContext)
  const groupsRef = useRef(groups)
  const signature = navigatorSignatureOf(groups)

  useLayoutEffect(() => {
    groupsRef.current = groups
  })

  useEffect(() => {
    if (sections === null || anchorId === null) return undefined
    return sections.register(anchorId, () => groupsRef.current)
  }, [sections, anchorId])

  useEffect(() => {
    sections?.notify()
  }, [sections, signature])
}

export const useNavigatorFullScreen = (anchorId: string | null, isFullScreen: boolean, onLeave: () => void): void => {
  const changeOwner = use(NavigatorSectionsContext)?.onFullScreenOwnerChange ?? null
  const leaveRef = useRef(onLeave)

  useLayoutEffect(() => {
    leaveRef.current = onLeave
  })

  useEffect(() => {
    if (changeOwner === null || anchorId === null || !isFullScreen) return undefined
    changeOwner({
      anchorId,
      onLeave: () => {
        leaveRef.current()
      },
    })
    return () => {
      changeOwner(null)
    }
  }, [changeOwner, anchorId, isFullScreen])
}
