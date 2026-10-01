import { addCommentRoute } from "./routes/add-comment"
import { addRepositoryRoute } from "./routes/add-repository"
import { addSetupRepositoryRoute } from "./routes/add-setup-repository"
import { browseFoldersRoute } from "./routes/browse-folders"
import { buildCodeReferenceRoute } from "./routes/build-code-reference"
import { completeSetupRoute } from "./routes/complete-setup"
import { dismissNewTargetRoute } from "./routes/dismiss-new-target"
import { getChatRoute } from "./routes/get-chat"
import { getReviewRoute } from "./routes/get-review"
import { getSetupRoute } from "./routes/get-setup"
import { getSetupGateRoute } from "./routes/get-setup-gate"
import { healthRoute } from "./routes/health"
import { listRepositoriesRoute } from "./routes/list-repositories"
import { publishArtifactRoute } from "./routes/publish-artifact"
import { removeSetupRepositoryRoute } from "./routes/remove-setup-repository"
import { saveSetupStepRoute } from "./routes/save-setup-step"
import { searchRepositoryAuthorsRoute } from "./routes/search-repository-authors"
import { searchRepositoryFoldersRoute } from "./routes/search-repository-folders"
import { sendChatMessageRoute } from "./routes/send-chat-message"
import { setAuthorTrackingRoute } from "./routes/set-author-tracking"
import { setReviewedRoute } from "./routes/set-reviewed"
import { setSelfAuthorRoute } from "./routes/set-self-author"
import { submitReviewRoute } from "./routes/submit-review"
import { createRouter } from "./trpc"

export const appRouter = createRouter({
  health: healthRoute,
  repository: createRouter({
    list: listRepositoriesRoute,
    dismissNewTarget: dismissNewTargetRoute,
    add: addRepositoryRoute,
  }),
  setup: createRouter({
    gate: getSetupGateRoute,
    get: getSetupRoute,
    saveStep: saveSetupStepRoute,
    searchFolders: searchRepositoryFoldersRoute,
    browseFolders: browseFoldersRoute,
    addRepository: addSetupRepositoryRoute,
    removeRepository: removeSetupRepositoryRoute,
    searchAuthors: searchRepositoryAuthorsRoute,
    setAuthorTracking: setAuthorTrackingRoute,
    setSelfAuthor: setSelfAuthorRoute,
    complete: completeSetupRoute,
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
