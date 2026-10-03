import {
  authorSearchHint,
  authorSearchPlaceholder,
  SELF_AUTHOR_HINT,
} from "@/procedures/get-setup/utils/build-repositories-step"
import { needsSelfAuthor, type SetupForge } from "@/procedures/get-setup/utils/setup"
import type { AuthorForm } from "./schemas"

export const buildAuthorForm = (forge: SetupForge): AuthorForm => ({
  selfAuthorHint: needsSelfAuthor(forge) ? SELF_AUTHOR_HINT : null,
  searchHint: authorSearchHint(forge),
  searchPlaceholder: authorSearchPlaceholder(forge),
})
