import { addCommentRoute } from "./routes/add-comment"
import { addRepositoryRoute } from "./routes/add-repository"
import { addReviewTargetRoute } from "./routes/add-review-target"
import { addSetupRepositoryRoute } from "./routes/add-setup-repository"
import { answerQuestionsRoute } from "./routes/answer-questions"
import { browseFoldersRoute } from "./routes/browse-folders"
import { buildCodeReferenceRoute } from "./routes/build-code-reference"
import { chooseModelRoute } from "./routes/choose-model"
import { completeSetupRoute } from "./routes/complete-setup"
import { configureRepositoryRoute } from "./routes/configure-repository"
import { createConfigurationRoute } from "./routes/create-configuration"
import { declineWriteUpRoute } from "./routes/decline-write-up"
import { deleteConfigurationRoute } from "./routes/delete-configuration"
import { deleteReviewRoute } from "./routes/delete-review"
import { discardCommentRoute } from "./routes/discard-comment"
import { dismissNewTargetRoute } from "./routes/dismiss-new-target"
import { editBlastRoute } from "./routes/edit-blast"
import { editContextRoute } from "./routes/edit-context"
import { editSegmentsRoute } from "./routes/edit-segments"
import { editTraceRoute } from "./routes/edit-trace"
import { editWalkthroughRoute } from "./routes/edit-walkthrough"
import { getAuthorFormRoute } from "./routes/get-author-form"
import { getCardFormRoute } from "./routes/get-card-form"
import { getConfigurationRoute } from "./routes/get-configuration"
import { getConfigurationCreationFormRoute } from "./routes/get-configuration-creation-form"
import { getConversationRoute } from "./routes/get-conversation"
import { getCreationFormRoute } from "./routes/get-creation-form"
import { getFileCodeRoute } from "./routes/get-file-code"
import { getImportFormRoute } from "./routes/get-import-form"
import { getModelChoiceRoute } from "./routes/get-model-choice"
import { getPublishedReviewRoute } from "./routes/get-published-review"
import { getRepositoryConfigurationRoute } from "./routes/get-repository-configuration"
import { getReviewRoute } from "./routes/get-review"
import { getReviewPreferencesRoute } from "./routes/get-review-preferences"
import { getSettingsRoute } from "./routes/get-settings"
import { getSetupRoute } from "./routes/get-setup"
import { getSetupGateRoute } from "./routes/get-setup-gate"
import { getTargetSwitcherRoute } from "./routes/get-target-switcher"
import { getWriteUpPlanRoute } from "./routes/get-write-up-plan"
import { healthRoute } from "./routes/health"
import { importReviewRoute } from "./routes/import-review"
import { listCardBlocksRoute } from "./routes/list-card-blocks"
import { listConfigurationsRoute } from "./routes/list-configurations"
import { listRecentRepositoriesRoute } from "./routes/list-recent-repositories"
import { listRepositoriesRoute } from "./routes/list-repositories"
import { markCompleteRoute } from "./routes/mark-complete"
import { publishArtifactRoute } from "./routes/publish-artifact"
import { removeRepositoryRoute } from "./routes/remove-repository"
import { removeReviewRequestRoute } from "./routes/remove-review-request"
import { removeSetupRepositoryRoute } from "./routes/remove-setup-repository"
import { replyToThreadRoute } from "./routes/reply-to-thread"
import { requestReviewerRoute } from "./routes/request-reviewer"
import { requestWriteUpRoute } from "./routes/request-write-up"
import { resolveThreadRoute } from "./routes/resolve-thread"
import { saveConfigurationRoute } from "./routes/save-configuration"
import { saveReviewPreferencesRoute } from "./routes/save-review-preferences"
import { saveSettingsRoute } from "./routes/save-settings"
import { saveSetupStepRoute } from "./routes/save-setup-step"
import { searchAddableTargetsRoute } from "./routes/search-addable-targets"
import { searchAdditionAuthorsRoute } from "./routes/search-addition-authors"
import { searchCreationTargetsRoute } from "./routes/search-creation-targets"
import { searchFilesRoute } from "./routes/search-files"
import { searchRepositoryAuthorsRoute } from "./routes/search-repository-authors"
import { searchRepositoryFoldersRoute } from "./routes/search-repository-folders"
import { searchReviewersRoute } from "./routes/search-reviewers"
import { sendReviewerMessageRoute } from "./routes/send-reviewer-message"
import { setAuthorTrackingRoute } from "./routes/set-author-tracking"
import { setReviewedRoute } from "./routes/set-reviewed"
import { submitReviewRoute } from "./routes/submit-review"
import { watchConversationRoute } from "./routes/watch-conversation"
import { writeUpReviewRoute } from "./routes/write-up-review"
import { createRouter } from "./trpc"

export const appRouter = createRouter({
  health: healthRoute,
  repository: createRouter({
    list: listRepositoriesRoute,
    dismissNewTarget: dismissNewTargetRoute,
    searchTargets: searchAddableTargetsRoute,
    addTarget: addReviewTargetRoute,
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
    recentRepositories: listRecentRepositoriesRoute,
    searchFolders: searchRepositoryFoldersRoute,
    browseFolders: browseFoldersRoute,
    addRepository: addSetupRepositoryRoute,
    removeRepository: removeSetupRepositoryRoute,
    searchAuthors: searchRepositoryAuthorsRoute,
    setAuthorTracking: setAuthorTrackingRoute,
    complete: completeSetupRoute,
  }),
  settings: createRouter({
    get: getSettingsRoute,
    save: saveSettingsRoute,
  }),
  reviewPreferences: createRouter({
    get: getReviewPreferencesRoute,
    save: saveReviewPreferencesRoute,
  }),
  configuration: createRouter({
    list: listConfigurationsRoute,
    get: getConfigurationRoute,
    creationForm: getConfigurationCreationFormRoute,
    create: createConfigurationRoute,
    save: saveConfigurationRoute,
    delete: deleteConfigurationRoute,
  }),
  review: createRouter({
    get: getReviewRoute,
    creationForm: getCreationFormRoute,
    searchTargets: searchCreationTargetsRoute,
    targetSwitcher: getTargetSwitcherRoute,
    writeUpPlan: getWriteUpPlanRoute,
    writeUp: writeUpReviewRoute,
    declineWriteUp: declineWriteUpRoute,
    requestWriteUp: requestWriteUpRoute,
    delete: deleteReviewRoute,
    setReviewed: setReviewedRoute,
    editContext: editContextRoute,
    editSegments: editSegmentsRoute,
    editTrace: editTraceRoute,
    editBlast: editBlastRoute,
    editWalkthrough: editWalkthroughRoute,
    cardBlocks: listCardBlocksRoute,
    cardForm: getCardFormRoute,
    searchFiles: searchFilesRoute,
    fileCode: getFileCodeRoute,
    codeReference: buildCodeReferenceRoute,
    addComment: addCommentRoute,
    discardComment: discardCommentRoute,
    replyToThread: replyToThreadRoute,
    resolveThread: resolveThreadRoute,
    submit: submitReviewRoute,
    searchReviewers: searchReviewersRoute,
    requestReviewer: requestReviewerRoute,
    removeReviewRequest: removeReviewRequestRoute,
    publish: publishArtifactRoute,
    published: getPublishedReviewRoute,
    importForm: getImportFormRoute,
    import: importReviewRoute,
    markComplete: markCompleteRoute,
  }),
  conversation: createRouter({
    get: getConversationRoute,
    watch: watchConversationRoute,
    sendMessage: sendReviewerMessageRoute,
    answerQuestions: answerQuestionsRoute,
    modelChoice: getModelChoiceRoute,
    chooseModel: chooseModelRoute,
  }),
})

export type AppRouter = typeof appRouter
