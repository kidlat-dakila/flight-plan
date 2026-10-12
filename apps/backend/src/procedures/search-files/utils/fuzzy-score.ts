const PATH_SEPARATOR = "/"
const WORD_START_PATTERN = /[/\\._\-\s]/
const WHITESPACE_PATTERN = /\s+/g
const MATCH_SCORE = 1
const CONSECUTIVE_BONUS = 2
const WORD_START_BONUS = 3
const FILE_NAME_BONUS = 10
const LENGTH_PENALTY = 0.01

interface ScoringState {
  readonly matchedCount: number
  readonly score: number
  readonly isPreviousMatched: boolean
}

const NOTHING_MATCHED: ScoringState = { matchedCount: 0, score: 0, isPreviousMatched: false }

const isWordStart = (text: string, index: number): boolean =>
  index === 0 || WORD_START_PATTERN.test(text.charAt(index - 1)) || isCamelHump(text, index)

function isCamelHump(text: string, index: number): boolean {
  const character = text.charAt(index)
  const previous = text.charAt(index - 1)
  return character !== character.toLowerCase() && previous === previous.toLowerCase()
}

const scoreOfMatch = (text: string, index: number, isPreviousMatched: boolean): number =>
  MATCH_SCORE + (isPreviousMatched ? CONSECUTIVE_BONUS : 0) + (isWordStart(text, index) ? WORD_START_BONUS : 0)

const scoreSubsequence = (needle: string, text: string): number | null => {
  const indexes = Array.from({ length: text.length }, (_character, index) => index)
  const scored = indexes.reduce<ScoringState>((state, index) => {
    const isMatch = state.matchedCount < needle.length && text.charAt(index).toLowerCase() === needle.charAt(state.matchedCount)
    return isMatch
      ? {
          matchedCount: state.matchedCount + 1,
          score: state.score + scoreOfMatch(text, index, state.isPreviousMatched),
          isPreviousMatched: true,
        }
      : { ...state, isPreviousMatched: false }
  }, NOTHING_MATCHED)
  return scored.matchedCount === needle.length ? scored.score : null
}

export const fileNameOf = (path: string): string => path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)

export const fuzzyScoreOf = (query: string, path: string): number | null => {
  const needle = query.replaceAll(WHITESPACE_PATTERN, "").toLowerCase()
  const fileNameScore = scoreSubsequence(needle, fileNameOf(path))
  const score = fileNameScore === null ? scoreSubsequence(needle, path) : fileNameScore + FILE_NAME_BONUS
  return score === null ? null : score - path.length * LENGTH_PENALTY
}
