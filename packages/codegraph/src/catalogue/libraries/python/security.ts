import type { CallPattern, CatalogueLibrary } from "@/catalogue/types"

const SECURITY = "security"

const ENCRYPTION_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "encrypt", slots: [], classifies: SECURITY },
  { kind: "call", name: "decrypt", slots: [], classifies: SECURITY },
]

const PYNACL_SIGNING_KEY_METHODS: readonly CallPattern[] = [{ kind: "call", name: "sign", slots: [], classifies: SECURITY }]

const ITSDANGEROUS_SIGNER_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "sign", slots: [], classifies: SECURITY },
  { kind: "call", name: "unsign", slots: [], classifies: SECURITY },
]

const ITSDANGEROUS_SERIALIZER_METHODS: readonly CallPattern[] = [
  { kind: "call", name: "dumps", slots: [], classifies: SECURITY },
  { kind: "call", name: "loads", slots: [], classifies: SECURITY },
]

export const cryptographyLibrary: CatalogueLibrary = {
  name: "cryptography",
  specifiers: [
    "cryptography.fernet",
    "cryptography.hazmat.primitives.hashes",
    "cryptography.hazmat.primitives.asymmetric.rsa",
    "cryptography.hazmat.primitives.ciphers.aead",
  ],
  documentedVersion: "50.0",
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "Fernet", classifies: SECURITY, methods: ENCRYPTION_METHODS },
    { kind: "call", name: "Fernet.generate_key", slots: [], classifies: SECURITY },
    { kind: "factory", name: "MultiFernet", classifies: SECURITY, methods: [...ENCRYPTION_METHODS, { kind: "call", name: "rotate", slots: [], classifies: SECURITY }] },
    { kind: "factory", name: "AESGCM", classifies: SECURITY, methods: ENCRYPTION_METHODS },
    { kind: "factory", name: "ChaCha20Poly1305", classifies: SECURITY, methods: ENCRYPTION_METHODS },
    { kind: "factory", name: "Hash", classifies: SECURITY, methods: [] },
    {
      kind: "factory",
      name: "generate_private_key",
      classifies: SECURITY,
      methods: [
        { kind: "call", name: "sign", slots: [], classifies: SECURITY },
        { kind: "call", name: "decrypt", slots: [], classifies: SECURITY },
        {
          kind: "factory",
          name: "public_key",
          methods: [
            { kind: "call", name: "verify", slots: [], classifies: SECURITY },
            { kind: "call", name: "encrypt", slots: [], classifies: SECURITY },
          ],
        },
      ],
    },
  ],
}

export const passlibLibrary: CatalogueLibrary = {
  name: "Passlib",
  specifiers: ["passlib.context", "passlib.hash"],
  documentedVersion: "1.7",
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "CryptContext",
      classifies: SECURITY,
      methods: [
        { kind: "call", name: "hash", slots: [], classifies: SECURITY },
        { kind: "call", name: "verify", slots: [], classifies: SECURITY },
      ],
    },
    { kind: "call", name: "pbkdf2_sha256.hash", slots: [], classifies: SECURITY },
    { kind: "call", name: "pbkdf2_sha256.verify", slots: [], classifies: SECURITY },
    { kind: "call", name: "bcrypt.hash", slots: [], classifies: SECURITY },
    { kind: "call", name: "bcrypt.verify", slots: [], classifies: SECURITY },
  ],
}

export const pynaclLibrary: CatalogueLibrary = {
  name: "PyNaCl",
  specifiers: ["nacl.secret", "nacl.signing", "nacl.utils"],
  documentedVersion: "1.6",
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "SecretBox", classifies: SECURITY, methods: ENCRYPTION_METHODS },
    { kind: "factory", name: "Aead", classifies: SECURITY, methods: ENCRYPTION_METHODS },
    { kind: "factory", name: "SigningKey", classifies: SECURITY, methods: PYNACL_SIGNING_KEY_METHODS },
    { kind: "factory", name: "SigningKey.generate", classifies: SECURITY, methods: PYNACL_SIGNING_KEY_METHODS },
    { kind: "factory", name: "VerifyKey", classifies: SECURITY, methods: [{ kind: "call", name: "verify", slots: [], classifies: SECURITY }] },
    { kind: "call", name: "random", slots: [], classifies: SECURITY },
  ],
}

export const itsdangerousLibrary: CatalogueLibrary = {
  name: "ItsDangerous",
  specifiers: ["itsdangerous", "itsdangerous.url_safe"],
  documentedVersion: "2.2",
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "factory", name: "Signer", classifies: SECURITY, methods: ITSDANGEROUS_SIGNER_METHODS },
    { kind: "factory", name: "TimestampSigner", classifies: SECURITY, methods: ITSDANGEROUS_SIGNER_METHODS },
    { kind: "factory", name: "URLSafeSerializer", classifies: SECURITY, methods: ITSDANGEROUS_SERIALIZER_METHODS },
    { kind: "factory", name: "URLSafeTimedSerializer", classifies: SECURITY, methods: ITSDANGEROUS_SERIALIZER_METHODS },
  ],
}

export const bcryptLibrary: CatalogueLibrary = {
  name: "bcrypt",
  specifiers: ["bcrypt"],
  documentedVersion: "5.0",
  category: "security",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "hashpw", slots: [], classifies: SECURITY },
    { kind: "call", name: "checkpw", slots: [], classifies: SECURITY },
    { kind: "call", name: "gensalt", slots: [], classifies: SECURITY },
    { kind: "call", name: "kdf", slots: [], classifies: SECURITY },
  ],
}
