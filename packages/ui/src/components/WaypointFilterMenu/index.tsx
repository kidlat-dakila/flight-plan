import { CheckIcon, ChevronDownIcon } from "lucide-react"
import Menubar, { MenubarContent, MenubarMenu, MenubarTrigger } from "@/components/blocks/menubar"
import FindingMark from "@/components/FindingMark"
import { NavigatorMenuBody } from "@/components/ReviewNavigator"
import { waypointFilterMenuOf, type WaypointFilterRequest } from "@/lib/walkthrough-navigation"

export type WaypointFilterNavigation = Omit<WaypointFilterRequest, "markerOf">

const ReviewedMark = () => (
  <span aria-hidden="true" className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-waypoint text-line-foreground">
    <CheckIcon className="size-2.5" strokeWidth={3.5} />
  </span>
)

export const filterMarkerOf: WaypointFilterRequest["markerOf"] = (key) => (key === "reviewed" ? <ReviewedMark /> : <FindingMark kind={key} />)

const TRIGGER_CLASSES = "group inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-[0.3rem] border border-input bg-card px-2 text-[0.8rem] outline-none transition-colors duration-[180ms] ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-popup-open:border-foreground data-popup-open:bg-foreground data-popup-open:font-bold data-popup-open:text-background"
const BADGE_CLASSES = "inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[0.625rem] leading-none font-bold text-background tabular-nums group-data-popup-open:bg-background group-data-popup-open:text-foreground"

const WaypointFilterMenu = ({ navigation }: { readonly navigation: WaypointFilterNavigation }) => {
  const menu = waypointFilterMenuOf({ ...navigation, markerOf: filterMarkerOf })
  if (menu === null) return null
  return (
    <Menubar modal={false}>
      <MenubarMenu>
        <MenubarTrigger data-user-action-id="explorer-filter-action" className={TRIGGER_CLASSES}>
          {menu.label}
          {menu.badge === null
            ? null
            : (
                <>
                  <span aria-hidden="true" className={BADGE_CLASSES}>{menu.badge.count}</span>
                  <span className="sr-only">{menu.badge.label}</span>
                </>
              )}
          <ChevronDownIcon aria-hidden="true" className="size-3.5 text-muted-foreground group-data-popup-open:text-background" />
        </MenubarTrigger>
        <MenubarContent align="start" className="min-w-[17rem]">
          <NavigatorMenuBody menu={menu} />
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}

export default WaypointFilterMenu
