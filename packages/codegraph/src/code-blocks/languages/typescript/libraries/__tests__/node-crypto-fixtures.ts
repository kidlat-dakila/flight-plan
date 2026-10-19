import type { PatternFixture } from "@/catalogue/types"

const NODE_CRYPTO = "Node.js crypto"

export const nodeCryptoFixtures: readonly PatternFixture[] = [
  {
    library: NODE_CRYPTO,
    patternKey: "call:createHash:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst digest = crypto.createHash(\"sha256\").update(data).digest(\"hex\")",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst digest = crypto.createHash(\"sha256\").update(data).digest(\"hex\")",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:createHmac:*",
    matches: [
      "import { createHmac } from \"crypto\"\nconst signature = createHmac(\"sha256\", secret).update(payload).digest(\"hex\")",
    ],
    rejects: [
      "const createHmac = (...parts) => parts\nconst signature = createHmac(\"sha256\", secret).update(payload).digest(\"hex\")",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:createCipheriv:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst cipher = crypto.createCipheriv(\"aes-256-gcm\", key, iv)",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst cipher = crypto.createCipheriv(\"aes-256-gcm\", key, iv)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:createDecipheriv:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst decipher = crypto.createDecipheriv(\"aes-256-gcm\", key, iv)",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst decipher = crypto.createDecipheriv(\"aes-256-gcm\", key, iv)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:createSign:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst signer = crypto.createSign(\"SHA256\")",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst signer = crypto.createSign(\"SHA256\")",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:createVerify:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst verifier = crypto.createVerify(\"SHA256\")",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst verifier = crypto.createVerify(\"SHA256\")",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:hash:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst digest = crypto.hash(\"sha1\", data)",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst digest = crypto.hash(\"sha1\", data)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:randomBytes:*",
    matches: [
      "import crypto from \"node:crypto\"\ncrypto.randomBytes(256, (err, buf) => { report(buf.toString(\"hex\")) })",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\ncrypto.randomBytes(256, (err, buf) => { report(buf.toString(\"hex\")) })",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:scrypt:*",
    matches: [
      "import crypto from \"node:crypto\"\ncrypto.scrypt(\"password\", \"salt\", 64, (err, derivedKey) => { report(derivedKey.toString(\"hex\")) })",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\ncrypto.scrypt(\"password\", \"salt\", 64, (err, derivedKey) => { report(derivedKey.toString(\"hex\")) })",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:scryptSync:*",
    matches: [
      "import { scryptSync } from \"crypto\"\nconst key = scryptSync(\"password\", \"salt\", 64)",
    ],
    rejects: [
      "const scryptSync = (...parts) => parts\nconst key = scryptSync(\"password\", \"salt\", 64)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:pbkdf2:*",
    matches: [
      "import crypto from \"node:crypto\"\ncrypto.pbkdf2(\"secret\", \"salt\", 100000, 64, \"sha512\", (err, derivedKey) => { report(derivedKey.toString(\"hex\")) })",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\ncrypto.pbkdf2(\"secret\", \"salt\", 100000, 64, \"sha512\", (err, derivedKey) => { report(derivedKey.toString(\"hex\")) })",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:pbkdf2Sync:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst key = crypto.pbkdf2Sync(\"secret\", \"salt\", 100000, 64, \"sha512\")",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst key = crypto.pbkdf2Sync(\"secret\", \"salt\", 100000, 64, \"sha512\")",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:sign:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst signature = crypto.sign(null, data, privateKey)",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst signature = crypto.sign(null, data, privateKey)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:verify:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst isValid = crypto.verify(null, data, publicKey, signature)",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst isValid = crypto.verify(null, data, publicKey, signature)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:timingSafeEqual:*",
    matches: [
      "import { timingSafeEqual } from \"crypto\"\nconst isSame = timingSafeEqual(expected, received)",
    ],
    rejects: [
      "const timingSafeEqual = (...parts) => parts\nconst isSame = timingSafeEqual(expected, received)",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:generateKeyPair:*",
    matches: [
      "import crypto from \"node:crypto\"\ncrypto.generateKeyPair(\"ed25519\", {}, (err, publicKey, privateKey) => { store(publicKey, privateKey) })",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\ncrypto.generateKeyPair(\"ed25519\", {}, (err, publicKey, privateKey) => { store(publicKey, privateKey) })",
    ],
  },
  {
    library: NODE_CRYPTO,
    patternKey: "call:generateKeyPairSync:*",
    matches: [
      "import crypto from \"node:crypto\"\nconst { publicKey, privateKey } = crypto.generateKeyPairSync(\"ed25519\")",
    ],
    rejects: [
      "const crypto = makeLocalRegistry()\nconst { publicKey, privateKey } = crypto.generateKeyPairSync(\"ed25519\")",
    ],
  },
]
