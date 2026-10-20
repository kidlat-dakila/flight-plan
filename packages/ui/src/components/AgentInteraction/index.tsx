import { ChevronDownIcon } from "lucide-react"
import Collapsible, { CollapsibleContent, CollapsibleTrigger } from "@/components/blocks/collapsible"
import InfoCallout from "@/components/InfoCallout"

const TITLE = "How does Flight Plan interact with the agent?"
const SUMMARY = "What Flight Plan builds and what your agent writes"
const INTRO = "Flight Plan builds the review artifact from the code. Your agent reads the same change and writes the explanations into it, through the Flight Plan plugin and its MCP server."
const FLIGHT_PLAN_HEADING = "What Flight Plan does"
const FLIGHT_PLAN_PART = "Flight Plan draws the Trace Diagram and the Blast Diagram, and arranges the Code Walkthrough based on your preferences. You can read a review before your agent writes anything."
const AGENT_HEADING = "What the agent does"
const LAUNCH_TITLE = "Your agent runs on your subscription"
const INLINE_CODE_CLASSES = "rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.875em]"
const AGENT_PART = "Your agent explains why the change exists and how the code works, and points out potential issues as findings. It writes into the review Flight Plan built and cannot change its structure. While you read, you can ask it about the change and it can ask you questions back."

interface InteractionPartProps {
  readonly heading: string
  readonly text: string
}

const InteractionPart = ({ heading, text }: InteractionPartProps) => (
  <section>
    <h3 className="font-bold">{heading}</h3>
    <p className="mt-1 text-muted-foreground">{text}</p>
  </section>
)

const LaunchNote = () => (
  <InfoCallout title={LAUNCH_TITLE}>
    Flight Plan launches your agent as an interactive session in a terminal that runs in the background. It avoids
    headless commands such as
    {" "}
    <code className={INLINE_CODE_CLASSES}>claude -p</code>
    , which can be billed separately from your subscription.
  </InfoCallout>
)

const AgentInteraction = () => (
  <Collapsible>
    <CollapsibleTrigger className="group -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-sm px-2 py-4 text-left transition-colors duration-180 ease-out outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <span className="min-w-0 flex-1">
        <span className="block text-lg leading-7 font-bold">{TITLE}</span>
        <span className="block text-sm text-muted-foreground">{SUMMARY}</span>
      </span>
      <ChevronDownIcon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform duration-180 ease-out group-data-panel-open:rotate-180" />
    </CollapsibleTrigger>
    <CollapsibleContent className="grid max-w-[62ch] gap-5 pb-2">
      <p>{INTRO}</p>
      <InteractionPart heading={FLIGHT_PLAN_HEADING} text={FLIGHT_PLAN_PART} />
      <InteractionPart heading={AGENT_HEADING} text={AGENT_PART} />
      <LaunchNote />
    </CollapsibleContent>
  </Collapsible>
)

export default AgentInteraction
