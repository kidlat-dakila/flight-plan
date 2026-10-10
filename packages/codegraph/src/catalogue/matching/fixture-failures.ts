import type { CatalogueLibrary, PatternFixture } from "@/catalogue/types"
import type { PatternMatch } from "./match-sites"
import { matchFilePath, matchSource } from "./match-source"

const FILE_KEY_PREFIX = "file:"
const LINE_BREAK = "\n"
const LINE_BREAK_SHOWN = " ⏎ "

const isOfFilePattern = (fixture: PatternFixture): boolean => fixture.patternKey.startsWith(FILE_KEY_PREFIX)

const matchesOf = (sample: string, fixture: PatternFixture, library: CatalogueLibrary): PatternMatch[] =>
  isOfFilePattern(fixture) ? matchFilePath(sample, [library]) : matchSource({ filePath: null, language: library.language, text: sample }, [library])

const isMatched = (sample: string, fixture: PatternFixture, library: CatalogueLibrary): boolean =>
  matchesOf(sample, fixture, library).some((match) => match.patternKey === fixture.patternKey)

const shown = (sample: string): string => sample.split(LINE_BREAK).join(LINE_BREAK_SHOWN)

const failuresOf = (fixture: PatternFixture, library: CatalogueLibrary): string[] => [
  ...fixture.matches
    .filter((sample) => !isMatched(sample, fixture, library))
    .map((sample) => `${library.name}: ${fixture.patternKey} does not match ${shown(sample)}`),
  ...fixture.rejects
    .filter((sample) => isMatched(sample, fixture, library))
    .map((sample) => `${library.name}: ${fixture.patternKey} matches what it must not: ${shown(sample)}`),
]

const unfilledIn = (sample: string, fixture: PatternFixture, library: CatalogueLibrary): string[][] =>
  matchesOf(sample, fixture, library)
    .filter((match) => match.patternKey === fixture.patternKey)
    .map((match) => [...match.unfilledPlaces])

const placesNoCodeShows = (fixture: PatternFixture, library: CatalogueLibrary): string[] => {
  const unfilled = fixture.matches.flatMap((sample) => unfilledIn(sample, fixture, library))
  return unfilled.length === 0 ? [] : unfilled[0].filter((place) => unfilled.every((places) => places.includes(place)))
}

export const listUnshownPlaces = (libraries: readonly CatalogueLibrary[], fixtures: readonly PatternFixture[]): string[] =>
  fixtures.flatMap((fixture) => {
    const library = libraries.find((candidate) => candidate.name === fixture.library)
    if (library === undefined || isOfFilePattern(fixture)) return []
    return placesNoCodeShows(fixture, library).map((place) => `${library.name}: ${fixture.patternKey} names the ${place}, which none of its code has`)
  })

export const listFixtureFailures = (libraries: readonly CatalogueLibrary[], fixtures: readonly PatternFixture[]): string[] =>
  fixtures.flatMap((fixture) => {
    const library = libraries.find((candidate) => candidate.name === fixture.library)
    return library === undefined ? [] : failuresOf(fixture, library)
  })
