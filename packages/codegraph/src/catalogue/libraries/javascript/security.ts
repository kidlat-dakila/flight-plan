import type { CatalogueLibrary } from "@/catalogue/types"

const SECURITY = "security"

export const helmetLibrary: CatalogueLibrary = {
  name: "Helmet",
  specifiers: ["helmet"],
  documentedVersion: "8.3",
  category: "security",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default", slots: [], classifies: SECURITY },
    { kind: "call", name: "contentSecurityPolicy", slots: [], classifies: SECURITY },
    { kind: "call", name: "strictTransportSecurity", slots: [], classifies: SECURITY },
    { kind: "call", name: "referrerPolicy", slots: [], classifies: SECURITY },
  ],
}

export const forgeLibrary: CatalogueLibrary = {
  name: "Forge",
  specifiers: ["node-forge"],
  documentedVersion: "1.4",
  category: "security",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "cipher.createCipher", slots: [], classifies: SECURITY },
    { kind: "call", name: "cipher.createDecipher", slots: [], classifies: SECURITY },
    { kind: "call", name: "md.sha1.create", slots: [], classifies: SECURITY },
    { kind: "call", name: "md.sha256.create", slots: [], classifies: SECURITY },
    { kind: "call", name: "md.sha512.create", slots: [], classifies: SECURITY },
    { kind: "call", name: "md.md5.create", slots: [], classifies: SECURITY },
    { kind: "call", name: "hmac.create", slots: [], classifies: SECURITY },
    { kind: "call", name: "pkcs5.pbkdf2", slots: [], classifies: SECURITY },
    { kind: "call", name: "pki.rsa.generateKeyPair", slots: [], classifies: SECURITY },
    { kind: "call", name: "random.getBytesSync", slots: [], classifies: SECURITY },
  ],
}

export const cryptoJsLibrary: CatalogueLibrary = {
  name: "crypto-js",
  specifiers: ["crypto-js", "crypto-js/aes", "crypto-js/sha256", "crypto-js/hmac-sha256"],
  documentedVersion: "4.2",
  category: "security",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "AES.encrypt", slots: [], classifies: SECURITY },
    { kind: "call", name: "AES.decrypt", slots: [], classifies: SECURITY },
    { kind: "call", name: "SHA256", slots: [], classifies: SECURITY },
    { kind: "call", name: "HmacSHA256", slots: [], classifies: SECURITY },
    { kind: "call", name: "PBKDF2", slots: [], classifies: SECURITY },
    { kind: "call", name: "default.encrypt", from: "crypto-js/aes", slots: [], classifies: SECURITY },
    { kind: "call", name: "default.decrypt", from: "crypto-js/aes", slots: [], classifies: SECURITY },
    { kind: "call", name: "default", from: "crypto-js/sha256", slots: [], classifies: SECURITY },
    { kind: "call", name: "default", from: "crypto-js/hmac-sha256", slots: [], classifies: SECURITY },
  ],
}

export const expressRateLimitLibrary: CatalogueLibrary = {
  name: "express-rate-limit",
  specifiers: ["express-rate-limit"],
  documentedVersion: "8.7",
  category: "security",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "rateLimit", slots: [], classifies: SECURITY },
    { kind: "call", name: "default", slots: [], classifies: SECURITY },
  ],
}

export const bcryptJsLibrary: CatalogueLibrary = {
  name: "bcrypt.js",
  specifiers: ["bcryptjs", "bcrypt"],
  documentedVersion: "3.0",
  category: "security",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "hash", slots: [], classifies: SECURITY },
    { kind: "call", name: "hashSync", slots: [], classifies: SECURITY },
    { kind: "call", name: "compare", slots: [], classifies: SECURITY },
    { kind: "call", name: "compareSync", slots: [], classifies: SECURITY },
    { kind: "call", name: "genSalt", slots: [], classifies: SECURITY },
    { kind: "call", name: "genSaltSync", slots: [], classifies: SECURITY },
  ],
}
