import type { Setup } from "@/procedures/get-setup/utils/setup"
import { reviewPreferencesOf } from "./review-preferences"
import { toPreferencesData, type ReviewPreferencesPage } from "./schemas"
import { SPOTLIGHT_GROUPS } from "./spotlight-groups"

export const buildReviewPreferencesPage = (setup: Setup): ReviewPreferencesPage => ({
  preferences: toPreferencesData(reviewPreferencesOf(setup.reviewPreferences)),
  isSaved: setup.reviewPreferences !== null,
  defaultConfiguration: setup.defaultConfiguration,
  spotlightGroups: SPOTLIGHT_GROUPS.map((group) => ({ ...group, choices: [...group.choices] })),
})
