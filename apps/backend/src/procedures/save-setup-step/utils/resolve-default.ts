export const resolveDefault = <Name>(pickedNames: readonly Name[], requestedDefault: Name | null): Name | null => {
  const [onlyName] = pickedNames
  if (pickedNames.length === 1 && onlyName !== undefined) return onlyName
  return requestedDefault !== null && pickedNames.includes(requestedDefault) ? requestedDefault : null
}
