const LIST_SEPARATOR = ", "
const LAST_SEPARATOR = " and "

export const joinedList = (items: readonly string[]): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(LIST_SEPARATOR)}${LAST_SEPARATOR}${items.at(-1) ?? ""}`
