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
      Pick the repositories Flight Plan follows, and it lists their pull requests and branches on your home page. The
      list starts with the ones you last committed to on main or master; add any other repository by hand. On GitHub,
      GitLab or Bitbucket you see everyone&apos;s pull requests unless you pick team members. With local git you see
      only the branches you add, plus those of the team members you pick.
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
