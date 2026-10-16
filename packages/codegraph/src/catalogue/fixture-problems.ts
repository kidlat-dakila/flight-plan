import { listPatternKeys, listTypeOnlyKeys } from "./pattern-keys"
import type { CatalogueLibrary, PatternFixture } from "./types"

const fixturesOf = (library: CatalogueLibrary, fixtures: readonly PatternFixture[]): PatternFixture[] =>
  fixtures.filter((fixture) => fixture.library === library.name)

const missingFixtures = (library: CatalogueLibrary, fixtures: readonly PatternFixture[]): string[] => {
  const covered = new Set([...fixturesOf(library, fixtures).map((fixture) => fixture.patternKey), ...listTypeOnlyKeys(library)])
  return listPatternKeys(library)
    .filter((key) => !covered.has(key))
    .map((key) => `${library.name}: ${key} has no fixture`)
}

const strayFixtures = (library: CatalogueLibrary, fixtures: readonly PatternFixture[]): string[] => {
  const known = new Set(listPatternKeys(library))
  return fixturesOf(library, fixtures)
    .filter((fixture) => !known.has(fixture.patternKey))
    .map((fixture) => `${library.name}: the fixture of ${fixture.patternKey} has no pattern`)
}

const emptyFixtures = (library: CatalogueLibrary, fixtures: readonly PatternFixture[]): string[] =>
  fixturesOf(library, fixtures).flatMap((fixture) => [
    ...(fixture.matches.length === 0 ? [`${library.name}: the fixture of ${fixture.patternKey} has no code it must match`] : []),
    ...(fixture.rejects.length === 0 ? [`${library.name}: the fixture of ${fixture.patternKey} has no code it must not match`] : []),
  ])

const orphanFixtures = (libraries: readonly CatalogueLibrary[], fixtures: readonly PatternFixture[]): string[] => {
  const names = new Set(libraries.map((library) => library.name))
  return fixtures
    .filter((fixture) => !names.has(fixture.library))
    .map((fixture) => `${fixture.library}: the fixture of ${fixture.patternKey} is of a library that is not in the catalogue`)
}

export const listFixtureProblems = (libraries: readonly CatalogueLibrary[], fixtures: readonly PatternFixture[]): string[] => [
  ...libraries.flatMap((library) => [
    ...missingFixtures(library, fixtures),
    ...strayFixtures(library, fixtures),
    ...emptyFixtures(library, fixtures),
  ]),
  ...orphanFixtures(libraries, fixtures),
]
