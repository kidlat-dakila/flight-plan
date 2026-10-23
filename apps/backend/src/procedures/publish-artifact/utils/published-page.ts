import type { PublishedReview } from "@/procedures/get-published-review/utils/schemas"
import { formatStoredReview, type ReviewScaffold } from "@/procedures/get-review/utils/stored-review"

export const PAGE_FILE_NAME = "index.html"
export const REVIEW_SCRIPT_FILE_NAME = "review-data.js"
export const FLIGHT_PLAN_FILE_NAME = "flight-plan.json"
export const APP_SCRIPT_FILE_NAME = "app.js"
export const APP_STYLE_FILE_NAME = "app.css"
export const REVIEW_GLOBAL_NAME = "flightPlanReview"

export interface PublishedPageTexts {
  readonly html: string
  readonly reviewScript: string
  readonly flightPlanFile: string | null
}

const HTML_ENTITIES: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }
const HTML_SPECIAL_CHARACTER = /[&<>"]/gu

const escapeHtml = (text: string): string =>
  text.replace(HTML_SPECIAL_CHARACTER, (character) => HTML_ENTITIES[character] ?? character)

const formatHtml = (title: string): string =>
  [
    "<!doctype html>",
    "<html lang=\"en\">",
    "  <head>",
    "    <meta charset=\"utf-8\" />",
    `    <title>${escapeHtml(title)}</title>`,
    "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    `    <link rel="stylesheet" href="${APP_STYLE_FILE_NAME}" />`,
    "  </head>",
    "  <body>",
    "    <div id=\"root\"></div>",
    `    <script src="${REVIEW_SCRIPT_FILE_NAME}"></script>`,
    `    <script src="${APP_SCRIPT_FILE_NAME}"></script>`,
    "  </body>",
    "</html>",
    "",
  ].join("\n")

const formatReviewScript = (review: PublishedReview): string =>
  `globalThis.${REVIEW_GLOBAL_NAME} = ${JSON.stringify(review)}\n`

export const formatPublishedPage = (review: PublishedReview, scaffold: ReviewScaffold | null, version: string | null): PublishedPageTexts => ({
  html: formatHtml(review.documentTitle),
  reviewScript: formatReviewScript(review),
  flightPlanFile: scaffold === null ? null : formatStoredReview(scaffold, version),
})
