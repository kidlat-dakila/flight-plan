import { fireEvent, screen } from "@testing-library/react"
import Prose from "@/components/Prose"
import { findNavigatorButton, renderInNavigator, SECTION_ANCHOR_ID } from "@/lib/__tests__/navigator-harness"
import { paragraph } from "@/lib/__tests__/review-samples"
import { accordionLabelsOf, AccordionOpeningContext, useAccordionNavigation } from "@/lib/accordion-opening"
import type { ProseBlocks } from "@/lib/review-content"

const CONTEXT: ProseBlocks = [
  ...paragraph("This segment adds the order requests."),
  {
    kind: "accordion",
    sections: [
      { label: "What's added", blocks: paragraph("fetchOrders() requests every order.") },
      { label: "What's modified", blocks: paragraph("The router adds the order routes.") },
    ],
  },
]

const Context = () => {
  const opening = useAccordionNavigation(SECTION_ANCHOR_ID, CONTEXT)
  return (
    <AccordionOpeningContext value={opening}>
      <Prose blocks={CONTEXT} codeLinks={{}} onOpenCodeLink={vi.fn()} />
    </AccordionOpeningContext>
  )
}

describe("accordionLabelsOf", () => {
  it("lists the label of every accordion section", () => {
    expect(accordionLabelsOf(CONTEXT)).toStrictEqual(["What's added", "What's modified"])
    expect(accordionLabelsOf(paragraph("Nothing to open."))).toStrictEqual([])
  })
})

describe("useAccordionNavigation", () => {
  it("expands every accordion section with Q, and collapses them all again", async () => {
    renderInNavigator(<Context />)
    await findNavigatorButton("Expand all")

    fireEvent.keyDown(document.body, { key: "q" })

    expect(await screen.findByText("fetchOrders() requests every order.")).toBeTruthy()
    expect(screen.getByText("The router adds the order routes.")).toBeTruthy()

    fireEvent.click(await findNavigatorButton("Collapse all"))

    expect(screen.queryByText("fetchOrders() requests every order.")).toBeNull()
  })

  it("names Collapse all once every section was opened by hand", async () => {
    renderInNavigator(<Context />)
    await findNavigatorButton("Expand all")

    screen.getAllByRole("button", { name: "See change details" }).forEach((button) => {
      fireEvent.click(button)
    })

    expect(await findNavigatorButton("Collapse all")).toBeTruthy()
  })
})
