import type { PatternFixture } from "@/catalogue/types"

const HASHLIB = "hashlib"

export const hashlibFixtures: readonly PatternFixture[] = [
  {
    library: HASHLIB,
    patternKey: "call:sha1:*",
    matches: [
      "import hashlib\n\ndigest = hashlib.sha1(content).hexdigest()",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\ndigest = hashlib.sha1(content).hexdigest()",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:sha256:*",
    matches: [
      "import hashlib\n\ndigest = hashlib.sha256(b\"Nobody inspects the spammish repetition\").hexdigest()",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\ndigest = hashlib.sha256(b\"Nobody inspects the spammish repetition\").hexdigest()",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:sha384:*",
    matches: [
      "from hashlib import sha384\n\ndigest = sha384(content).digest()",
    ],
    rejects: [
      "def sha384(*parts):\n    return parts\n\ndigest = sha384(content).digest()",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:sha512:*",
    matches: [
      "import hashlib\n\ndigest = hashlib.sha512(content).hexdigest()",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\ndigest = hashlib.sha512(content).hexdigest()",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:sha3_256:*",
    matches: [
      "import hashlib\n\ndigest = hashlib.sha3_256(content).hexdigest()",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\ndigest = hashlib.sha3_256(content).hexdigest()",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:md5:*",
    matches: [
      "from hashlib import md5\n\nchecksum = md5(content).hexdigest()",
    ],
    rejects: [
      "def md5(*parts):\n    return parts\n\nchecksum = md5(content).hexdigest()",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:blake2b:*",
    matches: [
      "import hashlib\n\nh = hashlib.blake2b(digest_size=20)",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\nh = hashlib.blake2b(digest_size=20)",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:blake2s:*",
    matches: [
      "import hashlib\n\nh = hashlib.blake2s(key=b\"pseudorandom key\", digest_size=16)",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\nh = hashlib.blake2s(key=b\"pseudorandom key\", digest_size=16)",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:new:*",
    matches: [
      "import hashlib\n\nh = hashlib.new(\"sha256\")",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\nh = hashlib.new(\"sha256\")",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:pbkdf2_hmac:*",
    matches: [
      "import hashlib\n\ndk = hashlib.pbkdf2_hmac(\"sha256\", b\"password\", b\"bad salt\" * 2, 500_000)",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\ndk = hashlib.pbkdf2_hmac(\"sha256\", b\"password\", b\"bad salt\" * 2, 500_000)",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:scrypt:*",
    matches: [
      "import hashlib\n\nkey = hashlib.scrypt(password, salt=salt, n=16384, r=8, p=1)",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\nkey = hashlib.scrypt(password, salt=salt, n=16384, r=8, p=1)",
    ],
  },
  {
    library: HASHLIB,
    patternKey: "call:file_digest:*",
    matches: [
      "import hashlib\n\ndigest = hashlib.file_digest(f, \"sha256\")",
    ],
    rejects: [
      "hashlib = LocalRegistry()\n\ndigest = hashlib.file_digest(f, \"sha256\")",
    ],
  },
]

const HMAC = "hmac"

export const hmacFixtures: readonly PatternFixture[] = [
  {
    library: HMAC,
    patternKey: "call:new:*",
    matches: [
      "import hmac\n\nsignature = hmac.new(secret, payload, hashlib.sha256).hexdigest()",
    ],
    rejects: [
      "hmac = LocalRegistry()\n\nsignature = hmac.new(secret, payload, hashlib.sha256).hexdigest()",
    ],
  },
  {
    library: HMAC,
    patternKey: "call:digest:*",
    matches: [
      "import hmac\n\nsignature = hmac.digest(secret, payload, \"sha256\")",
    ],
    rejects: [
      "hmac = LocalRegistry()\n\nsignature = hmac.digest(secret, payload, \"sha256\")",
    ],
  },
  {
    library: HMAC,
    patternKey: "call:compare_digest:*",
    matches: [
      "import hmac\n\nis_valid = hmac.compare_digest(expected, received)",
    ],
    rejects: [
      "hmac = LocalRegistry()\n\nis_valid = hmac.compare_digest(expected, received)",
    ],
  },
]

const SECRETS = "secrets"

export const secretsFixtures: readonly PatternFixture[] = [
  {
    library: SECRETS,
    patternKey: "call:token_bytes:*",
    matches: [
      "import secrets\n\nkey = secrets.token_bytes(32)",
    ],
    rejects: [
      "secrets = LocalRegistry()\n\nkey = secrets.token_bytes(32)",
    ],
  },
  {
    library: SECRETS,
    patternKey: "call:token_hex:*",
    matches: [
      "import secrets\n\nnonce = secrets.token_hex(16)",
    ],
    rejects: [
      "secrets = LocalRegistry()\n\nnonce = secrets.token_hex(16)",
    ],
  },
  {
    library: SECRETS,
    patternKey: "call:token_urlsafe:*",
    matches: [
      "from secrets import token_urlsafe\n\nurl = \"https://example.com/reset=\" + token_urlsafe()",
    ],
    rejects: [
      "def token_urlsafe(*parts):\n    return parts\n\nurl = \"https://example.com/reset=\" + token_urlsafe()",
    ],
  },
  {
    library: SECRETS,
    patternKey: "call:compare_digest:*",
    matches: [
      "import secrets\n\nis_valid = secrets.compare_digest(expected, received)",
    ],
    rejects: [
      "secrets = LocalRegistry()\n\nis_valid = secrets.compare_digest(expected, received)",
    ],
  },
  {
    library: SECRETS,
    patternKey: "call:choice:*",
    matches: [
      "import secrets\n\npassword = \"\".join(secrets.choice(alphabet) for i in range(8))",
    ],
    rejects: [
      "secrets = LocalRegistry()\n\npassword = \"\".join(secrets.choice(alphabet) for i in range(8))",
    ],
  },
  {
    library: SECRETS,
    patternKey: "call:randbelow:*",
    matches: [
      "import secrets\n\nindex = secrets.randbelow(10)",
    ],
    rejects: [
      "secrets = LocalRegistry()\n\nindex = secrets.randbelow(10)",
    ],
  },
]
