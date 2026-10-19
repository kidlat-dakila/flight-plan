import type { PatternFixture } from "@/catalogue/types"

const HELMET = "Helmet"

export const helmetFixtures: readonly PatternFixture[] = [
  {
    library: HELMET,
    patternKey: "call:default:*",
    matches: [
      "import helmet from \"helmet\"\napp.use(helmet())",
    ],
    rejects: [
      "const helmet = (...parts) => parts\napp.use(helmet())",
    ],
  },
  {
    library: HELMET,
    patternKey: "call:contentSecurityPolicy:*",
    matches: [
      "import helmet from \"helmet\"\napp.use(helmet.contentSecurityPolicy({ directives: { \"script-src\": [\"'self'\", \"example.com\"] } }))",
    ],
    rejects: [
      "const helmet = makeLocalRegistry()\napp.use(helmet.contentSecurityPolicy({ directives: { \"script-src\": [\"'self'\", \"example.com\"] } }))",
    ],
  },
  {
    library: HELMET,
    patternKey: "call:strictTransportSecurity:*",
    matches: [
      "import helmet from \"helmet\"\napp.use(helmet.strictTransportSecurity())",
    ],
    rejects: [
      "const helmet = makeLocalRegistry()\napp.use(helmet.strictTransportSecurity())",
    ],
  },
  {
    library: HELMET,
    patternKey: "call:referrerPolicy:*",
    matches: [
      "import helmet from \"helmet\"\napp.use(helmet.referrerPolicy())",
    ],
    rejects: [
      "const helmet = makeLocalRegistry()\napp.use(helmet.referrerPolicy())",
    ],
  },
]

const FORGE = "Forge"

export const forgeFixtures: readonly PatternFixture[] = [
  {
    library: FORGE,
    patternKey: "call:cipher.createCipher:*",
    matches: [
      "import forge from \"node-forge\"\nconst cipher = forge.cipher.createCipher(\"AES-CBC\", key)",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst cipher = forge.cipher.createCipher(\"AES-CBC\", key)",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:cipher.createDecipher:*",
    matches: [
      "import forge from \"node-forge\"\nconst decipher = forge.cipher.createDecipher(\"AES-CBC\", key)",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst decipher = forge.cipher.createDecipher(\"AES-CBC\", key)",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:md.sha1.create:*",
    matches: [
      "import forge from \"node-forge\"\nconst md = forge.md.sha1.create()",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst md = forge.md.sha1.create()",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:md.sha256.create:*",
    matches: [
      "import forge from \"node-forge\"\nconst md = forge.md.sha256.create()",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst md = forge.md.sha256.create()",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:md.sha512.create:*",
    matches: [
      "import forge from \"node-forge\"\nconst md = forge.md.sha512.create()",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst md = forge.md.sha512.create()",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:md.md5.create:*",
    matches: [
      "import forge from \"node-forge\"\nconst md = forge.md.md5.create()",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst md = forge.md.md5.create()",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:hmac.create:*",
    matches: [
      "import forge from \"node-forge\"\nconst hmac = forge.hmac.create()",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst hmac = forge.hmac.create()",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:pkcs5.pbkdf2:*",
    matches: [
      "import forge from \"node-forge\"\nconst derivedKey = forge.pkcs5.pbkdf2(\"password\", salt, numIterations, 16)",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst derivedKey = forge.pkcs5.pbkdf2(\"password\", salt, numIterations, 16)",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:pki.rsa.generateKeyPair:*",
    matches: [
      "import forge from \"node-forge\"\nconst keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })",
    ],
  },
  {
    library: FORGE,
    patternKey: "call:random.getBytesSync:*",
    matches: [
      "import forge from \"node-forge\"\nconst iv = forge.random.getBytesSync(16)",
    ],
    rejects: [
      "const forge = makeLocalRegistry()\nconst iv = forge.random.getBytesSync(16)",
    ],
  },
]

const CRYPTO_JS = "crypto-js"

export const cryptoJsFixtures: readonly PatternFixture[] = [
  {
    library: CRYPTO_JS,
    patternKey: "call:AES.encrypt:*",
    matches: [
      "import CryptoJS from \"crypto-js\"\nconst encrypted = CryptoJS.AES.encrypt(\"secret\", \"key\")",
    ],
    rejects: [
      "const CryptoJS = makeLocalRegistry()\nconst encrypted = CryptoJS.AES.encrypt(\"secret\", \"key\")",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:AES.decrypt:*",
    matches: [
      "import CryptoJS from \"crypto-js\"\nconst bytes = CryptoJS.AES.decrypt(ciphertext, \"key\")",
    ],
    rejects: [
      "const CryptoJS = makeLocalRegistry()\nconst bytes = CryptoJS.AES.decrypt(ciphertext, \"key\")",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:SHA256:*",
    matches: [
      "import CryptoJS from \"crypto-js\"\nconst hash = CryptoJS.SHA256(\"message\")",
    ],
    rejects: [
      "const CryptoJS = makeLocalRegistry()\nconst hash = CryptoJS.SHA256(\"message\")",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:HmacSHA256:*",
    matches: [
      "import CryptoJS from \"crypto-js\"\nconst mac = CryptoJS.HmacSHA256(ciphertext, key)",
    ],
    rejects: [
      "const CryptoJS = makeLocalRegistry()\nconst mac = CryptoJS.HmacSHA256(ciphertext, key)",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:PBKDF2:*",
    matches: [
      "import CryptoJS from \"crypto-js\"\nconst key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 250000 })",
    ],
    rejects: [
      "const CryptoJS = makeLocalRegistry()\nconst key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 250000 })",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:default.encrypt@crypto-js/aes:*",
    matches: [
      "import AES from \"crypto-js/aes\"\nconst encrypted = AES.encrypt(\"secret\", \"key\")",
    ],
    rejects: [
      "const AES = makeLocalRegistry()\nconst encrypted = AES.encrypt(\"secret\", \"key\")",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:default.decrypt@crypto-js/aes:*",
    matches: [
      "import AES from \"crypto-js/aes\"\nconst bytes = AES.decrypt(ciphertext, \"key\")",
    ],
    rejects: [
      "const AES = makeLocalRegistry()\nconst bytes = AES.decrypt(ciphertext, \"key\")",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:default@crypto-js/sha256:*",
    matches: [
      "import SHA256 from \"crypto-js/sha256\"\nconst hash = SHA256(\"message\")",
    ],
    rejects: [
      "const SHA256 = (...parts) => parts\nconst hash = SHA256(\"message\")",
    ],
  },
  {
    library: CRYPTO_JS,
    patternKey: "call:default@crypto-js/hmac-sha256:*",
    matches: [
      "import HmacSHA256 from \"crypto-js/hmac-sha256\"\nconst mac = HmacSHA256(\"message\", key)",
    ],
    rejects: [
      "const HmacSHA256 = (...parts) => parts\nconst mac = HmacSHA256(\"message\", key)",
    ],
  },
]

const EXPRESS_RATE_LIMIT = "express-rate-limit"

export const expressRateLimitFixtures: readonly PatternFixture[] = [
  {
    library: EXPRESS_RATE_LIMIT,
    patternKey: "call:rateLimit:*",
    matches: [
      "import { rateLimit } from \"express-rate-limit\"\nconst limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: \"draft-8\", legacyHeaders: false })",
    ],
    rejects: [
      "const rateLimit = (...parts) => parts\nconst limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: \"draft-8\", legacyHeaders: false })",
    ],
  },
  {
    library: EXPRESS_RATE_LIMIT,
    patternKey: "call:default:*",
    matches: [
      "import rateLimit from \"express-rate-limit\"\nconst limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: \"draft-8\", legacyHeaders: false })",
    ],
    rejects: [
      "const rateLimit = (...parts) => parts\nconst limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: \"draft-8\", legacyHeaders: false })",
    ],
  },
]

const BCRYPT_JS = "bcrypt.js"

export const bcryptJsFixtures: readonly PatternFixture[] = [
  {
    library: BCRYPT_JS,
    patternKey: "call:hash:*",
    matches: [
      "import bcrypt from \"bcryptjs\"\nconst hash = await bcrypt.hash(\"B4c0/\\/\", 10)",
    ],
    rejects: [
      "const bcrypt = makeLocalRegistry()\nconst hash = await bcrypt.hash(\"B4c0/\\/\", 10)",
    ],
  },
  {
    library: BCRYPT_JS,
    patternKey: "call:hashSync:*",
    matches: [
      "import bcrypt from \"bcryptjs\"\nconst hash = bcrypt.hashSync(\"bacon\", 10)",
    ],
    rejects: [
      "const bcrypt = makeLocalRegistry()\nconst hash = bcrypt.hashSync(\"bacon\", 10)",
    ],
  },
  {
    library: BCRYPT_JS,
    patternKey: "call:compare:*",
    matches: [
      "const bcrypt = require(\"bcrypt\")\nconst match = await bcrypt.compare(password, user.passwordHash)",
    ],
    rejects: [
      "const bcrypt = makeLocalRegistry()\nconst match = await bcrypt.compare(password, user.passwordHash)",
    ],
  },
  {
    library: BCRYPT_JS,
    patternKey: "call:compareSync:*",
    matches: [
      "import bcrypt from \"bcryptjs\"\nconst matches = bcrypt.compareSync(\"B4c0/\\/\", hash)",
    ],
    rejects: [
      "const bcrypt = makeLocalRegistry()\nconst matches = bcrypt.compareSync(\"B4c0/\\/\", hash)",
    ],
  },
  {
    library: BCRYPT_JS,
    patternKey: "call:genSalt:*",
    matches: [
      "import bcrypt from \"bcryptjs\"\nconst salt = await bcrypt.genSalt(10)",
    ],
    rejects: [
      "const bcrypt = makeLocalRegistry()\nconst salt = await bcrypt.genSalt(10)",
    ],
  },
  {
    library: BCRYPT_JS,
    patternKey: "call:genSaltSync:*",
    matches: [
      "import bcrypt from \"bcryptjs\"\nconst salt = bcrypt.genSaltSync(10)",
    ],
    rejects: [
      "const bcrypt = makeLocalRegistry()\nconst salt = bcrypt.genSaltSync(10)",
    ],
  },
]
