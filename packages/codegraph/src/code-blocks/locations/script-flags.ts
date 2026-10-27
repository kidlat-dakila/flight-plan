import type { ScriptFlag } from "@/catalogue/types"

const WORD_PATTERN = /"[^"]*"|'[^']*'|\S+/g
const QUOTES_PATTERN = /^(["'])(?<text>[\s\S]*)\1$/
const COMMAND_SEPARATORS: ReadonlySet<string> = new Set(["&&", "||", ";", "|", "&"])
const FOLDER_SEPARATOR = "/"
const VALUE_SEPARATOR = "="
const FLAG_START = "-"
const INLINE_CONFIG_START = "{"

const unquoted = (word: string): string => QUOTES_PATTERN.exec(word)?.groups?.text ?? word

const wordsOf = (script: string): string[] => (script.match(WORD_PATTERN) ?? []).map(unquoted)

const commandsOf = (words: readonly string[]): (readonly string[])[] =>
  words.reduce<(readonly string[])[]>(
    (commands, word) => (COMMAND_SEPARATORS.has(word) ? [...commands, []] : [...commands.slice(0, -1), [...commands[commands.length - 1], word]]),
    [[]],
  )

const isCommand = (word: string, command: string): boolean => word === command || word.endsWith(`${FOLDER_SEPARATOR}${command}`)

const argumentsOf = (words: readonly string[], command: string): readonly string[] => {
  const commandIndex = words.findIndex((word) => isCommand(word, command))
  return commandIndex === -1 ? [] : words.slice(commandIndex + 1)
}

const valueAfter = (words: readonly string[], index: number, flags: readonly string[]): string[] => {
  const word = words[index]
  if (flags.includes(word)) return index + 1 < words.length ? [words[index + 1]] : []
  const joined = flags.find((flag) => word.startsWith(`${flag}${VALUE_SEPARATOR}`))
  return joined === undefined ? [] : [word.slice(joined.length + VALUE_SEPARATOR.length)]
}

const isConfigPath = (value: string): boolean => value !== "" && !value.startsWith(FLAG_START) && !value.startsWith(INLINE_CONFIG_START)

export const listFlagValues = (script: string, { command, flags }: ScriptFlag): string[] =>
  commandsOf(wordsOf(script)).flatMap((words) => {
    const commandArguments = argumentsOf(words, command)
    return commandArguments.flatMap((_, index) => valueAfter(commandArguments, index, flags)).filter(isConfigPath)
  })
