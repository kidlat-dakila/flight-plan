import { render, screen, within } from "@testing-library/react"
import type { ReactElement } from "react"
import ReviewNavigator, { ReviewNavigatorBar } from "@/components/ReviewNavigator"
import type { NavigatorRail } from "@/lib/navigator-controls"

export const SECTION_ANCHOR_ID = "section-in-view"

const VISIBLE_SECTION = { x: 0, y: 100, width: 800, height: 600 }

export const SINGLE_SECTION_RAIL: NavigatorRail = {
  groups: [{ anchorId: "segment", label: "A segment", sections: [{ anchorId: SECTION_ANCHOR_ID, label: "A section" }] }],
  sections: [],
}

export const showSectionInView = (anchorId: string = SECTION_ANCHOR_ID): void => {
  Reflect.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: HTMLElement) {
      return DOMRect.fromRect(this.id === anchorId ? VISIBLE_SECTION : {})
    },
  })
}

interface NavigatorView {
  readonly container: HTMLElement
  readonly rerender: (next: ReactElement) => void
}

export const renderInNavigator = (ui: ReactElement, rail: NavigatorRail = SINGLE_SECTION_RAIL): NavigatorView => {
  showSectionInView()
  const page = (content: ReactElement) => (
    <ReviewNavigator rail={rail}>
      <section id={SECTION_ANCHOR_ID}>{content}</section>
      <ReviewNavigatorBar />
    </ReviewNavigator>
  )
  const view = render(page(ui))
  return {
    container: view.container,
    rerender: (next: ReactElement) => {
      view.rerender(page(next))
    },
  }
}

export const findNavigator = async (): Promise<HTMLElement> => await screen.findByRole("toolbar", { name: "Review navigator" })

export const findNavigatorButton = async (name: string): Promise<HTMLElement> =>
  await within(await findNavigator()).findByRole("button", { name })

export const navigatorLabels = async (awaitedLabel: string): Promise<string[]> => {
  await findNavigatorButton(awaitedLabel)
  return [...(await findNavigator()).querySelectorAll("button")].map((button) => button.querySelector("span")?.textContent ?? "")
}
