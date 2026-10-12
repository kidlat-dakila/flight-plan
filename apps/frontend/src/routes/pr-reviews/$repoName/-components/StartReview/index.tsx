import TerminusHeading from "@/routes/pr-reviews/$repoName/-components/TerminusHeading"
import StartReviewForm, { type RequestProblem, type ReviewChoice, type StartForm } from "@flightplan/ui/StartReviewForm"

interface StartReviewProps {
  readonly heading: string
  readonly message: string
  readonly form: StartForm
  readonly problem: RequestProblem | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly dataNotice: string | null
  readonly onSubmit: (choice: ReviewChoice) => void
}

const StartReview = ({ heading, message, ...formProps }: StartReviewProps) => (
  <div className="max-w-208">
    <TerminusHeading heading={heading} message={message} />
    <StartReviewForm {...formProps} className="pt-6 pl-10" />
  </div>
)

export default StartReview
