import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import logoSrc from "./logo-small.png"
import { readPublishedReview } from "./published-review"
import PublishedReviewPage from "./review-page"
import "@/styles.css"

const MISSING_REVIEW_MESSAGE = "This page holds no Flight Plan."

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Missing #root element in the published page")

const review = readPublishedReview()

createRoot(rootElement).render(
  <StrictMode>
    {review === null
      ? <p role="alert" className="p-6 text-foreground">{MISSING_REVIEW_MESSAGE}</p>
      : <PublishedReviewPage review={review} logoSrc={logoSrc} />}
  </StrictMode>,
)
