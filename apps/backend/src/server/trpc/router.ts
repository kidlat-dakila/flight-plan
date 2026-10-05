import { addCommentRoute } from "./routes/add-comment"
import { addRepositoryRoute } from "./routes/add-repository"
import { addSetupRepositoryRoute } from "./routes/add-setup-repository"
import { answerQuestionsRoute } from "./routes/answer-questions"
import { browseFoldersRoute } from "./routes/browse-folders"
import { buildCodeReferenceRoute } from "./routes/build-code-reference"
import { completeSetupRoute } from "./routes/complete-setup"
import { configureRepositoryRoute } from "./routes/configure-repository"
import { dismissNewTargetRoute } from "./routes/dismiss-new-target"
import { getAuthorFormRoute } from "./routes/get-author-form"
import { getChatRoute } from "./routes/get-chat"
import { getConversationRoute } from "./routes/get-conversation"
import { getRepositoryConfigurationRoute } from "./routes/get-repository-configuration"
import { getReviewRoute } from "./routes/get-review"
import { getSetupRoute } from "./routes/get-setup"
import { getSetupGateRoute } from "./routes/get-setup-gate"
import { healthRoute } from "./routes/health"
import { listRepositoriesRoute } from "./routes/list-repositories"
import { publishArtifactRoute } from "./routes/publish-artifact"
import { removeRepositoryRoute } from "./routes/remove-repository"
import { removeSetupRepositoryRoute } from "./routes/remove-setup-repository"
import { saveSetupStepRoute } from "./routes/save-setup-step"
import { searchAdditionAuthorsRoute } from "./routes/search-addition-authors"
import { searchRepositoryAuthorsRoute } from "./routes/search-repository-authors"
import { searchRepositoryFoldersRoute } from "./routes/search-repository-folders"
import { sendChatMessageRoute } from "./routes/send-chat-message"
import { sendReviewerMessageRoute } from "./routes/send-reviewer-message"
import { setAuthorTrackingRoute } from "./routes/set-author-tracking"
import { setReviewedRoute } from "./routes/set-reviewed"
import { setSelfAuthorRoute } from "./routes/set-self-author"
import { submitReviewRoute } from "./routes/submit-review"
import { watchConversationRoute } from "./routes/watch-conversation"
import { createRouter } from "./trpc"

export const appRouter = createRouter({
  health: healthRoute,
  repository: createRouter({
    list: listRepositoriesRoute,
    dismissNewTarget: dismissNewTargetRoute,
    add: addRepositoryRoute,
    authorForm: getAuthorFormRoute,
    searchAuthors: searchAdditionAuthorsRoute,
    configuration: getRepositoryConfigurationRoute,
    configure: configureRepositoryRoute,
    remove: removeRepositoryRoute,
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
  conversation: createRouter({
    get: getConversationRoute,
    watch: watchConversationRoute,
    sendMessage: sendReviewerMessageRoute,
    answerQuestions: answerQuestionsRoute,
  }),
})

export type AppRouter = typeof appRouter
