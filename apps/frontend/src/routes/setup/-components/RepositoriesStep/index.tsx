import StepActions from "@/routes/setup/-components/StepActions"
import StepIntro from "@/routes/setup/-components/StepIntro"
import RepositoryList, { type FollowedRepository } from "@flightplan/ui/RepositoryList"

export type { AuthorRole, FollowedRepository as SetupRepository } from "@flightplan/ui/RepositoryList"

type RepositoryListProps = React.ComponentProps<typeof RepositoryList<FollowedRepository>>

interface RepositoriesStepProps extends Omit<RepositoryListProps, "followedFooter"> {
  readonly isReadyToContinue: boolean
  readonly continueHint: string | null
  readonly backStep: string | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onContinue: () => void
}

const TITLE = "Select your repositories"

const RepositoriesStep = ({
  isReadyToContinue,
  continueHint,
  backStep,
  errorMessage,
  isPending,
  onContinue,
  ...list
}: RepositoriesStepProps) => (
  <form action={onContinue}>
    <StepIntro title={TITLE}>
      Choose the repositories you review. Flight Plan shows their pull requests and branches on your home page.
    </StepIntro>
    <RepositoryList {...list} />
    <StepActions
      backStep={backStep}
      submitLabel="Save and continue"
      pendingLabel="Saving…"
      isPending={isPending}
      isReady={isReadyToContinue}
      hint={continueHint}
      errorMessage={errorMessage}
    />
  </form>
)

export default RepositoriesStep
