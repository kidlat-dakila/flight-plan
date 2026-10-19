import type { Slot } from "@/catalogue/types"
import type { Library } from "@/code-blocks/libraries/types"

const SECURITY = "security"

const NODE_CRYPTO_CALLBACK_SLOTS: readonly Slot[] = [{ at: "last", runs: "event" }]

export const nodeCryptoLibrary: Library = {
  name: "Node.js crypto",
  specifiers: ["node:crypto", "crypto"],
  documentedVersion: "26.12",
  category: "security",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "createHash", slots: [], classifies: SECURITY },
    { kind: "call", name: "createHmac", slots: [], classifies: SECURITY },
    { kind: "call", name: "createCipheriv", slots: [], classifies: SECURITY },
    { kind: "call", name: "createDecipheriv", slots: [], classifies: SECURITY },
    { kind: "call", name: "createSign", slots: [], classifies: SECURITY },
    { kind: "call", name: "createVerify", slots: [], classifies: SECURITY },
    { kind: "call", name: "hash", slots: [], classifies: SECURITY },
    { kind: "call", name: "randomBytes", slots: NODE_CRYPTO_CALLBACK_SLOTS, classifies: SECURITY },
    { kind: "call", name: "scrypt", slots: NODE_CRYPTO_CALLBACK_SLOTS, classifies: SECURITY },
    { kind: "call", name: "scryptSync", slots: [], classifies: SECURITY },
    { kind: "call", name: "pbkdf2", slots: NODE_CRYPTO_CALLBACK_SLOTS, classifies: SECURITY },
    { kind: "call", name: "pbkdf2Sync", slots: [], classifies: SECURITY },
    { kind: "call", name: "sign", slots: NODE_CRYPTO_CALLBACK_SLOTS, classifies: SECURITY },
    { kind: "call", name: "verify", slots: NODE_CRYPTO_CALLBACK_SLOTS, classifies: SECURITY },
    { kind: "call", name: "timingSafeEqual", slots: [], classifies: SECURITY },
    { kind: "call", name: "generateKeyPair", slots: NODE_CRYPTO_CALLBACK_SLOTS, classifies: SECURITY },
    { kind: "call", name: "generateKeyPairSync", slots: [], classifies: SECURITY },
  ],
}
