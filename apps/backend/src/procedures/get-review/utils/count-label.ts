export const countLabel = (count: number, singular: string, plural: string): string =>
  `${String(count)} ${count === 1 ? singular : plural}`
