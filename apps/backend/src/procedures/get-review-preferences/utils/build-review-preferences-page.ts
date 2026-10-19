import type { Setup } from "@/procedures/get-setup/utils/setup"
import { CODE_BLOCK_CLASSIFICATION_LABELS, CODE_BLOCK_CLASSIFICATIONS } from "@flightplan/configurations"
import { reviewPreferencesOf } from "./review-preferences"
import { toPreferencesData, type ReviewPreferencesPage, type SpotlightChoice } from "./schemas"

const SPOTLIGHT_CHOICES: readonly SpotlightChoice[] = CODE_BLOCK_CLASSIFICATIONS.map((classification) => ({
  classification,
  ...CODE_BLOCK_CLASSIFICATION_LABELS[classification],
}))

export const buildReviewPreferencesPage = (setup: Setup): ReviewPreferencesPage => ({
  preferences: toPreferencesData(reviewPreferencesOf(setup.reviewPreferences)),
  isSaved: setup.reviewPreferences !== null,
  defaultConfiguration: setup.defaultConfiguration,
  spotlightChoices: [...SPOTLIGHT_CHOICES],
})
