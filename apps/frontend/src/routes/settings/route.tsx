import { createFileRoute, Outlet } from "@tanstack/react-router"
import { use } from "react"
import { createPortal } from "react-dom"
import { BandSlotContext } from "@/band-slot"
import BandLine from "@flightplan/ui/BandLine"
import SettingsNavigation from "./-components/SettingsNavigation"

const SETTINGS_LINE_CLASSES = "[--line:var(--primary)]"
const PAGE_HEADING_CLASSES = "text-4xl leading-10 font-bold tracking-[-0.02em]"
const HEADING = "Settings"

const SettingsLayout = () => {
  const bandSlot = use(BandSlotContext)
  return (
    <>
      {bandSlot === null
        ? null
        : createPortal(
            <>
              <BandLine lineColor="primary" />
              <p className="font-bold">{HEADING}</p>
            </>,
            bandSlot,
          )}
      <header className="pb-8">
        <h1 className={PAGE_HEADING_CLASSES}>{HEADING}</h1>
      </header>
      <div className={`grid gap-x-10 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)] ${SETTINGS_LINE_CLASSES}`}>
        <div className="self-start lg:sticky lg:top-22">
          <SettingsNavigation />
        </div>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </>
  )
}

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
})
