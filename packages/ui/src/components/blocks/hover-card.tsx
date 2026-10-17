import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card"
import { cn } from "cn"

function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  collisionAvoidance,
  collisionPadding = 8,
  ...props
}: PreviewCardPrimitive.Popup.Props
  & Pick<
    PreviewCardPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionAvoidance" | "collisionPadding"
  >) {
  return (
    <PreviewCardPrimitive.Portal data-slot="hover-card-portal">
      <PreviewCardPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        collisionAvoidance={collisionAvoidance}
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "z-50 origin-(--transform-origin) rounded-lg border border-foreground bg-popover text-sm text-popover-foreground outline-hidden duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  )
}

function HoverCardArrow({ className, ...props }: PreviewCardPrimitive.Arrow.Props) {
  return (
    <PreviewCardPrimitive.Arrow
      data-slot="hover-card-arrow"
      className={cn(
        "size-2.5 rotate-45 border-foreground bg-popover data-[side=bottom]:-top-[5px] data-[side=bottom]:border-t data-[side=bottom]:border-l data-[side=top]:-bottom-[5px] data-[side=top]:border-r data-[side=top]:border-b",
        className,
      )}
      {...props}
    />
  )
}

export { HoverCardTrigger, HoverCardContent, HoverCardArrow }

export default HoverCard
