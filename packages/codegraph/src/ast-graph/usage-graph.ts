const ID_SEPARATOR = "#"

export const usageNodeIdOf = (filePath: string, name: string): string => [filePath, name].join(ID_SEPARATOR)
