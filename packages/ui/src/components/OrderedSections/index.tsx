import { Fragment, type ReactNode } from "react"

interface OrderedSectionsProps<Section extends string> {
  readonly order: readonly NoInfer<Section>[]
  readonly sections: Readonly<Record<Section, ReactNode>>
}

const OrderedSections = <Section extends string>({ order, sections }: OrderedSectionsProps<Section>) => (
  <>
    {order.map((section) => <Fragment key={section}>{sections[section]}</Fragment>)}
  </>
)

export default OrderedSections
