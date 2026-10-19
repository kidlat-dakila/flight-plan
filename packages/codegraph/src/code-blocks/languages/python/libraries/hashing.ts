import type { Library } from "@/code-blocks/libraries/types"

const SECURITY = "security"

const PYTHON_DOCUMENTED_VERSION = "3.15"

export const hashlibLibrary: Library = {
  name: "hashlib",
  specifiers: ["hashlib"],
  documentedVersion: PYTHON_DOCUMENTED_VERSION,
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "sha1", slots: [], classifies: SECURITY },
    { kind: "call", name: "sha256", slots: [], classifies: SECURITY },
    { kind: "call", name: "sha384", slots: [], classifies: SECURITY },
    { kind: "call", name: "sha512", slots: [], classifies: SECURITY },
    { kind: "call", name: "sha3_256", slots: [], classifies: SECURITY },
    { kind: "call", name: "md5", slots: [], classifies: SECURITY },
    { kind: "call", name: "blake2b", slots: [], classifies: SECURITY },
    { kind: "call", name: "blake2s", slots: [], classifies: SECURITY },
    { kind: "call", name: "new", slots: [], classifies: SECURITY },
    { kind: "call", name: "pbkdf2_hmac", slots: [], classifies: SECURITY },
    { kind: "call", name: "scrypt", slots: [], classifies: SECURITY },
    { kind: "call", name: "file_digest", slots: [], classifies: SECURITY },
  ],
}

export const hmacLibrary: Library = {
  name: "hmac",
  specifiers: ["hmac"],
  documentedVersion: PYTHON_DOCUMENTED_VERSION,
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "new", slots: [], classifies: SECURITY },
    { kind: "call", name: "digest", slots: [], classifies: SECURITY },
    { kind: "call", name: "compare_digest", slots: [], classifies: SECURITY },
  ],
}

export const secretsLibrary: Library = {
  name: "secrets",
  specifiers: ["secrets"],
  documentedVersion: PYTHON_DOCUMENTED_VERSION,
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "token_bytes", slots: [], classifies: SECURITY },
    { kind: "call", name: "token_hex", slots: [], classifies: SECURITY },
    { kind: "call", name: "token_urlsafe", slots: [], classifies: SECURITY },
    { kind: "call", name: "compare_digest", slots: [], classifies: SECURITY },
    { kind: "call", name: "choice", slots: [], classifies: SECURITY },
    { kind: "call", name: "randbelow", slots: [], classifies: SECURITY },
  ],
}
