import { addCommentRoute } from "./routes/add-comment"
import { addRepositoryRoute } from "./routes/add-repository"
import { buildCodeReferenceRoute } from "./routes/build-code-reference"
import { dismissNewTargetRoute } from "./routes/dismiss-new-target"
import { getChatRoute } from "./routes/get-chat"
import { getReviewRoute } from "./routes/get-review"
import { healthRoute } from "./routes/health"
import { listRepositoriesRoute } from "./routes/list-repositories"
import { publishArtifactRoute } from "./routes/publish-artifact"
import { sendChatMessageRoute } from "./routes/send-chat-message"
import { setReviewedRoute } from "./routes/set-reviewed"
import { submitReviewRoute } from "./routes/submit-review"
import { createRouter } from "./trpc"

export const appRouter = createRouter({
  health: healthRoute,
  repository: createRouter({
    list: listRepositoriesRoute,
    dismissNewTarget: dismissNewTargetRoute,
    add: addRepositoryRoute,
  }),
  review: createRouter({
    get: getReviewRoute,
    setReviewed: setReviewedRoute,
    codeReference: buildCodeReferenceRoute,
    addComment: addCommentRoute,
    submit: submitReviewRoute,
    publish: publishArtifactRoute,
    chat: getChatRoute,
    sendChatMessage: sendChatMessageRoute,
  }),
})

export type AppRouter = typeof appRouter
