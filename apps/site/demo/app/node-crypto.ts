const BLOCK_BYTES = 64
const WORD_BYTES = 4
const WORD_BITS = 32
const BYTE_BITS = 8
const LENGTH_BYTES = 8
const PADDING_START = 0x80
const CHOOSE_ROUND_CONSTANT = 0x5a827999
const PARITY_ROUND_CONSTANT = 0x6ed9eba1
const MAJORITY_ROUND_CONSTANT = 0x8f1bbcdc
const LAST_ROUND_CONSTANT = 0xca62c1d6
const ROUND_CONSTANTS = [CHOOSE_ROUND_CONSTANT, PARITY_ROUND_CONSTANT, MAJORITY_ROUND_CONSTANT, LAST_ROUND_CONSTANT]
const INITIAL_A = 0x67452301
const INITIAL_B = 0xefcdab89
const INITIAL_C = 0x98badcfe
const INITIAL_D = 0x10325476
const INITIAL_E = 0xc3d2e1f0
const INITIAL_STATE: readonly number[] = [INITIAL_A, INITIAL_B, INITIAL_C, INITIAL_D, INITIAL_E]
const SCHEDULE_LENGTH = 80
const MESSAGE_WORDS = 16
const ROUND_LENGTH = 20
const CHOOSE_ROUND = 0
const MAJORITY_ROUND = 2
const NEAR_TAP = 3
const SHORT_TAP = 8
const LONG_TAP = 14
const FAR_TAP = 16
const SCHEDULE_TAPS = [NEAR_TAP, SHORT_TAP, LONG_TAP, FAR_TAP]
const SCHEDULE_ROTATION = 1
const STATE_ROTATION = 5
const CHAIN_ROTATION = 30
const HEX_RADIX = 16
const HEX_WORD_LENGTH = 8
const BINARY_BASE = 2
const HIGH_WORD_DIVISOR = BINARY_BASE ** WORD_BITS

const rotateLeft = (word: number, bits: number): number => ((word << bits) | (word >>> (WORD_BITS - bits))) >>> 0

const lengthBytesOf = (messageBits: number): readonly number[] => {
  const view = new DataView(new ArrayBuffer(LENGTH_BYTES))
  view.setUint32(0, Math.floor(messageBits / HIGH_WORD_DIVISOR))
  view.setUint32(WORD_BYTES, messageBits >>> 0)
  return [...new Uint8Array(view.buffer)]
}

const paddedBytesOf = (text: string): Uint8Array => {
  const bytes = [...new TextEncoder().encode(text)]
  const paddedLength = Math.ceil((bytes.length + 1 + LENGTH_BYTES) / BLOCK_BYTES) * BLOCK_BYTES
  const zeroCount = paddedLength - bytes.length - 1 - LENGTH_BYTES
  return Uint8Array.from([...bytes, PADDING_START, ...Array.from({ length: zeroCount }, () => 0), ...lengthBytesOf(bytes.length * BYTE_BITS)])
}

const scheduleOf = (view: DataView, offset: number): readonly number[] =>
  Array.from({ length: SCHEDULE_LENGTH }).reduce<readonly number[]>((words, _unused, index) => [
    ...words,
    index < MESSAGE_WORDS
      ? view.getUint32(offset + index * WORD_BYTES)
      : rotateLeft(SCHEDULE_TAPS.reduce((mixed, tap) => mixed ^ words[index - tap], 0), SCHEDULE_ROTATION),
  ], [])

const mixOf = (round: number, b: number, c: number, d: number): number => {
  if (round === CHOOSE_ROUND) return (b & c) | (~b & d)
  if (round === MAJORITY_ROUND) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

const stepOf = (registers: readonly number[], word: number, index: number): readonly number[] => {
  const [a, b, c, d, e] = registers
  const round = Math.floor(index / ROUND_LENGTH)
  const next = (rotateLeft(a, STATE_ROTATION) + mixOf(round, b, c, d) + e + ROUND_CONSTANTS[round] + word) >>> 0
  return [next, a, rotateLeft(b, CHAIN_ROTATION), c, d]
}

const compress = (state: readonly number[], schedule: readonly number[]): readonly number[] => {
  const registers = schedule.reduce(stepOf, state)
  return state.map((word, index) => (word + registers[index]) >>> 0)
}

const sha1HexOf = (text: string): string => {
  const padded = paddedBytesOf(text)
  const view = new DataView(padded.buffer)
  const blockOffsets = Array.from({ length: padded.length / BLOCK_BYTES }, (_unused, index) => index * BLOCK_BYTES)
  const state = blockOffsets.reduce((current, offset) => compress(current, scheduleOf(view, offset)), INITIAL_STATE)
  return state.map((word) => word.toString(HEX_RADIX).padStart(HEX_WORD_LENGTH, "0")).join("")
}

const SUPPORTED_ALGORITHM = "sha1"
const HEX_ENCODING = "hex"

interface TextHash {
  readonly update: (more: string) => TextHash
  readonly digest: (encoding: string) => string
}

const textHashOf = (text: string): TextHash => ({
  update: (more) => textHashOf(`${text}${more}`),
  digest: (encoding) => {
    if (encoding !== HEX_ENCODING) throw new Error(`${encoding} digests are not available in the demo`)
    return sha1HexOf(text)
  },
})

export const createHash = (algorithm: string): TextHash => {
  if (algorithm !== SUPPORTED_ALGORITHM) throw new Error(`${algorithm} is not available in the demo`)
  return textHashOf("")
}

export const randomUUID = (): string => globalThis.crypto.randomUUID()
