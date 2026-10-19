import type { PatternFixture } from "@/catalogue/types"

const CRYPTOGRAPHY = "cryptography"

export const cryptographyFixtures: readonly PatternFixture[] = [
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:Fernet:*",
    matches: [
      "from cryptography.fernet import Fernet\n\nf = Fernet(key)",
    ],
    rejects: [
      "def Fernet(*parts):\n    return parts\n\nf = Fernet(key)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:Fernet:*>call:encrypt:*",
    matches: [
      "from cryptography.fernet import Fernet\n\nf = Fernet(key)\ntoken = f.encrypt(b\"my deep dark secret\")",
    ],
    rejects: [
      "f = LocalRegistry()\ntoken = f.encrypt(b\"my deep dark secret\")",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:Fernet:*>call:decrypt:*",
    matches: [
      "from cryptography.fernet import Fernet\n\nf = Fernet(key)\nplaintext = f.decrypt(token)",
    ],
    rejects: [
      "f = LocalRegistry()\nplaintext = f.decrypt(token)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "call:Fernet.generate_key:*",
    matches: [
      "from cryptography.fernet import Fernet\n\nkey = Fernet.generate_key()",
    ],
    rejects: [
      "Fernet = LocalRegistry()\n\nkey = Fernet.generate_key()",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:MultiFernet:*",
    matches: [
      "from cryptography.fernet import Fernet, MultiFernet\n\nmf = MultiFernet([Fernet(Fernet.generate_key()), Fernet(key)])",
    ],
    rejects: [
      "def MultiFernet(*parts):\n    return parts\n\nmf = MultiFernet([Fernet(Fernet.generate_key()), Fernet(key)])",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:MultiFernet:*>call:encrypt:*",
    matches: [
      "from cryptography.fernet import Fernet, MultiFernet\n\nmf = MultiFernet([Fernet(Fernet.generate_key()), Fernet(key)])\ntoken = mf.encrypt(b\"Secret message!\")",
    ],
    rejects: [
      "mf = LocalRegistry()\ntoken = mf.encrypt(b\"Secret message!\")",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:MultiFernet:*>call:decrypt:*",
    matches: [
      "from cryptography.fernet import Fernet, MultiFernet\n\nmf = MultiFernet([Fernet(Fernet.generate_key()), Fernet(key)])\nplaintext = mf.decrypt(token)",
    ],
    rejects: [
      "mf = LocalRegistry()\nplaintext = mf.decrypt(token)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:MultiFernet:*>call:rotate:*",
    matches: [
      "from cryptography.fernet import Fernet, MultiFernet\n\nmf = MultiFernet([Fernet(Fernet.generate_key()), Fernet(key)])\nrotated = mf.rotate(token)",
    ],
    rejects: [
      "mf = LocalRegistry()\nrotated = mf.rotate(token)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:AESGCM:*",
    matches: [
      "from cryptography.hazmat.primitives.ciphers.aead import AESGCM\n\naesgcm = AESGCM(key)",
    ],
    rejects: [
      "def AESGCM(*parts):\n    return parts\n\naesgcm = AESGCM(key)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:AESGCM:*>call:encrypt:*",
    matches: [
      "from cryptography.hazmat.primitives.ciphers.aead import AESGCM\n\naesgcm = AESGCM(key)\nct = aesgcm.encrypt(nonce, data, aad)",
    ],
    rejects: [
      "aesgcm = LocalRegistry()\nct = aesgcm.encrypt(nonce, data, aad)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:AESGCM:*>call:decrypt:*",
    matches: [
      "from cryptography.hazmat.primitives.ciphers.aead import AESGCM\n\naesgcm = AESGCM(key)\nplaintext = aesgcm.decrypt(nonce, ct, aad)",
    ],
    rejects: [
      "aesgcm = LocalRegistry()\nplaintext = aesgcm.decrypt(nonce, ct, aad)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:ChaCha20Poly1305:*",
    matches: [
      "from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305\n\nchacha = ChaCha20Poly1305(key)",
    ],
    rejects: [
      "def ChaCha20Poly1305(*parts):\n    return parts\n\nchacha = ChaCha20Poly1305(key)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:ChaCha20Poly1305:*>call:encrypt:*",
    matches: [
      "from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305\n\nchacha = ChaCha20Poly1305(key)\nct = chacha.encrypt(nonce, data, aad)",
    ],
    rejects: [
      "chacha = LocalRegistry()\nct = chacha.encrypt(nonce, data, aad)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:ChaCha20Poly1305:*>call:decrypt:*",
    matches: [
      "from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305\n\nchacha = ChaCha20Poly1305(key)\nplaintext = chacha.decrypt(nonce, ct, aad)",
    ],
    rejects: [
      "chacha = LocalRegistry()\nplaintext = chacha.decrypt(nonce, ct, aad)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:Hash:*",
    matches: [
      "from cryptography.hazmat.primitives import hashes\n\ndigest = hashes.Hash(hashes.SHA256())",
    ],
    rejects: [
      "hashes = LocalRegistry()\n\ndigest = hashes.Hash(hashes.SHA256())",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:generate_private_key:*",
    matches: [
      "from cryptography.hazmat.primitives.asymmetric import rsa\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)",
    ],
    rejects: [
      "rsa = LocalRegistry()\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:generate_private_key:*>call:sign:*",
    matches: [
      "from cryptography.hazmat.primitives.asymmetric import rsa\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\nsignature = private_key.sign(message, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())",
    ],
    rejects: [
      "private_key = LocalRegistry()\nsignature = private_key.sign(message, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:generate_private_key:*>call:decrypt:*",
    matches: [
      "from cryptography.hazmat.primitives.asymmetric import rsa\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\nplaintext = private_key.decrypt(ciphertext, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))",
    ],
    rejects: [
      "private_key = LocalRegistry()\nplaintext = private_key.decrypt(ciphertext, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:generate_private_key:*>factory:public_key:*",
    matches: [
      "from cryptography.hazmat.primitives.asymmetric import rsa\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\npublic_key = private_key.public_key()",
    ],
    rejects: [
      "private_key = LocalRegistry()\npublic_key = private_key.public_key()",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:generate_private_key:*>factory:public_key:*>call:verify:*",
    matches: [
      "from cryptography.hazmat.primitives.asymmetric import rsa\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\npublic_key = private_key.public_key()\npublic_key.verify(signature, message, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())",
    ],
    rejects: [
      "private_key = LocalRegistry()\npublic_key = private_key.public_key()\npublic_key.verify(signature, message, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())",
    ],
  },
  {
    library: CRYPTOGRAPHY,
    patternKey: "factory:generate_private_key:*>factory:public_key:*>call:encrypt:*",
    matches: [
      "from cryptography.hazmat.primitives.asymmetric import rsa\n\nprivate_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\npublic_key = private_key.public_key()\nciphertext = public_key.encrypt(message, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))",
    ],
    rejects: [
      "private_key = LocalRegistry()\npublic_key = private_key.public_key()\nciphertext = public_key.encrypt(message, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()), algorithm=hashes.SHA256(), label=None))",
    ],
  },
]

const PASSLIB = "Passlib"

export const passlibFixtures: readonly PatternFixture[] = [
  {
    library: PASSLIB,
    patternKey: "factory:CryptContext:*",
    matches: [
      "from passlib.context import CryptContext\n\npwd_context = CryptContext(schemes=[\"pbkdf2_sha256\", \"des_crypt\"], deprecated=\"auto\")",
    ],
    rejects: [
      "def CryptContext(*parts, **options):\n    return parts\n\npwd_context = CryptContext(schemes=[\"pbkdf2_sha256\", \"des_crypt\"], deprecated=\"auto\")",
    ],
  },
  {
    library: PASSLIB,
    patternKey: "factory:CryptContext:*>call:hash:*",
    matches: [
      "from passlib.context import CryptContext\n\npwd_context = CryptContext(schemes=[\"pbkdf2_sha256\", \"des_crypt\"], deprecated=\"auto\")\nhash = pwd_context.hash(\"somepass\")",
    ],
    rejects: [
      "pwd_context = LocalRegistry()\nhash = pwd_context.hash(\"somepass\")",
    ],
  },
  {
    library: PASSLIB,
    patternKey: "factory:CryptContext:*>call:verify:*",
    matches: [
      "from passlib.context import CryptContext\n\npwd_context = CryptContext(schemes=[\"pbkdf2_sha256\", \"des_crypt\"], deprecated=\"auto\")\npwd_context.verify(\"somepass\", hash)",
    ],
    rejects: [
      "pwd_context = LocalRegistry()\npwd_context.verify(\"somepass\", hash)",
    ],
  },
  {
    library: PASSLIB,
    patternKey: "call:pbkdf2_sha256.hash:*",
    matches: [
      "from passlib.hash import pbkdf2_sha256\n\nhash = pbkdf2_sha256.hash(\"password\")",
    ],
    rejects: [
      "pbkdf2_sha256 = LocalRegistry()\n\nhash = pbkdf2_sha256.hash(\"password\")",
    ],
  },
  {
    library: PASSLIB,
    patternKey: "call:pbkdf2_sha256.verify:*",
    matches: [
      "from passlib.hash import pbkdf2_sha256\n\npbkdf2_sha256.verify(\"password\", hash)",
    ],
    rejects: [
      "pbkdf2_sha256 = LocalRegistry()\n\npbkdf2_sha256.verify(\"password\", hash)",
    ],
  },
  {
    library: PASSLIB,
    patternKey: "call:bcrypt.hash:*",
    matches: [
      "from passlib.hash import bcrypt\n\nh = bcrypt.hash(\"password\")",
    ],
    rejects: [
      "bcrypt = LocalRegistry()\n\nh = bcrypt.hash(\"password\")",
    ],
  },
  {
    library: PASSLIB,
    patternKey: "call:bcrypt.verify:*",
    matches: [
      "from passlib.hash import bcrypt\n\nbcrypt.verify(\"password\", h)",
    ],
    rejects: [
      "bcrypt = LocalRegistry()\n\nbcrypt.verify(\"password\", h)",
    ],
  },
]

const PYNACL = "PyNaCl"

export const pynaclFixtures: readonly PatternFixture[] = [
  {
    library: PYNACL,
    patternKey: "factory:SecretBox:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nbox = nacl.secret.SecretBox(key)",
    ],
    rejects: [
      "nacl = LocalRegistry()\n\nbox = nacl.secret.SecretBox(key)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:SecretBox:*>call:encrypt:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nbox = nacl.secret.SecretBox(key)\nencrypted = box.encrypt(message)",
    ],
    rejects: [
      "box = LocalRegistry()\nencrypted = box.encrypt(message)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:SecretBox:*>call:decrypt:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nbox = nacl.secret.SecretBox(key)\nplaintext = box.decrypt(encrypted)",
    ],
    rejects: [
      "box = LocalRegistry()\nplaintext = box.decrypt(encrypted)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:Aead:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nbox = nacl.secret.Aead(key)",
    ],
    rejects: [
      "nacl = LocalRegistry()\n\nbox = nacl.secret.Aead(key)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:Aead:*>call:encrypt:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nbox = nacl.secret.Aead(key)\nencrypted = box.encrypt(message, aad)",
    ],
    rejects: [
      "box = LocalRegistry()\nencrypted = box.encrypt(message, aad)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:Aead:*>call:decrypt:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nbox = nacl.secret.Aead(key)\nplaintext = box.decrypt(encrypted, aad)",
    ],
    rejects: [
      "box = LocalRegistry()\nplaintext = box.decrypt(encrypted, aad)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:SigningKey:*",
    matches: [
      "from nacl.signing import SigningKey\n\nsigning_key = SigningKey(seed)",
    ],
    rejects: [
      "def SigningKey(*parts):\n    return parts\n\nsigning_key = SigningKey(seed)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:SigningKey:*>call:sign:*",
    matches: [
      "from nacl.signing import SigningKey\n\nsigning_key = SigningKey(seed)\nsigned = signing_key.sign(b\"Attack at Dawn\")",
    ],
    rejects: [
      "signing_key = LocalRegistry()\nsigned = signing_key.sign(b\"Attack at Dawn\")",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:SigningKey.generate:*",
    matches: [
      "from nacl.signing import SigningKey\n\nsigning_key = SigningKey.generate()",
    ],
    rejects: [
      "SigningKey = LocalRegistry()\n\nsigning_key = SigningKey.generate()",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:SigningKey.generate:*>call:sign:*",
    matches: [
      "from nacl.signing import SigningKey\n\nsigning_key = SigningKey.generate()\nsigned = signing_key.sign(b\"Attack at Dawn\")",
    ],
    rejects: [
      "signing_key = LocalRegistry()\nsigned = signing_key.sign(b\"Attack at Dawn\")",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:VerifyKey:*",
    matches: [
      "from nacl.signing import VerifyKey\n\nverify_key = VerifyKey(verify_key_bytes)",
    ],
    rejects: [
      "def VerifyKey(*parts):\n    return parts\n\nverify_key = VerifyKey(verify_key_bytes)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "factory:VerifyKey:*>call:verify:*",
    matches: [
      "from nacl.signing import VerifyKey\n\nverify_key = VerifyKey(verify_key_bytes)\nverify_key.verify(signed)",
    ],
    rejects: [
      "verify_key = LocalRegistry()\nverify_key.verify(signed)",
    ],
  },
  {
    library: PYNACL,
    patternKey: "call:random:*",
    matches: [
      "import nacl.secret\nimport nacl.utils\n\nnonce = nacl.utils.random(nacl.secret.SecretBox.NONCE_SIZE)",
    ],
    rejects: [
      "nacl = LocalRegistry()\n\nnonce = nacl.utils.random(nacl.secret.SecretBox.NONCE_SIZE)",
    ],
  },
]

const ITSDANGEROUS = "ItsDangerous"

export const itsdangerousFixtures: readonly PatternFixture[] = [
  {
    library: ITSDANGEROUS,
    patternKey: "factory:Signer:*",
    matches: [
      "from itsdangerous import Signer\n\ns = Signer(\"secret-key\")",
    ],
    rejects: [
      "def Signer(*parts):\n    return parts\n\ns = Signer(\"secret-key\")",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:Signer:*>call:sign:*",
    matches: [
      "from itsdangerous import Signer\n\ns = Signer(\"secret-key\")\ns.sign(\"my string\")",
    ],
    rejects: [
      "s = LocalRegistry()\ns.sign(\"my string\")",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:Signer:*>call:unsign:*",
    matches: [
      "from itsdangerous import Signer\n\ns = Signer(\"secret-key\")\ns.unsign(b\"my string.wh6tMHxLgJqB6oY1uT73iMlyrOA\")",
    ],
    rejects: [
      "s = LocalRegistry()\ns.unsign(b\"my string.wh6tMHxLgJqB6oY1uT73iMlyrOA\")",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:TimestampSigner:*",
    matches: [
      "from itsdangerous import TimestampSigner\n\ns = TimestampSigner('secret-key')",
    ],
    rejects: [
      "def TimestampSigner(*parts):\n    return parts\n\ns = TimestampSigner('secret-key')",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:TimestampSigner:*>call:sign:*",
    matches: [
      "from itsdangerous import TimestampSigner\n\ns = TimestampSigner('secret-key')\nstring = s.sign('foo')",
    ],
    rejects: [
      "s = LocalRegistry()\nstring = s.sign('foo')",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:TimestampSigner:*>call:unsign:*",
    matches: [
      "from itsdangerous import TimestampSigner\n\ns = TimestampSigner('secret-key')\ns.unsign(string, max_age=5)",
    ],
    rejects: [
      "s = LocalRegistry()\ns.unsign(string, max_age=5)",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:URLSafeSerializer:*",
    matches: [
      "from itsdangerous.url_safe import URLSafeSerializer\n\ns = URLSafeSerializer(\"secret-key\")",
    ],
    rejects: [
      "def URLSafeSerializer(*parts):\n    return parts\n\ns = URLSafeSerializer(\"secret-key\")",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:URLSafeSerializer:*>call:dumps:*",
    matches: [
      "from itsdangerous.url_safe import URLSafeSerializer\n\ns = URLSafeSerializer(\"secret-key\")\ntoken = s.dumps([1, 2, 3, 4])",
    ],
    rejects: [
      "s = LocalRegistry()\ntoken = s.dumps([1, 2, 3, 4])",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:URLSafeSerializer:*>call:loads:*",
    matches: [
      "from itsdangerous.url_safe import URLSafeSerializer\n\ns = URLSafeSerializer(\"secret-key\")\ndata = s.loads(\"WzEsMiwzLDRd.wSPHqC0gR7VUqivlSukJ0IeTDgo\")",
    ],
    rejects: [
      "s = LocalRegistry()\ndata = s.loads(\"WzEsMiwzLDRd.wSPHqC0gR7VUqivlSukJ0IeTDgo\")",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:URLSafeTimedSerializer:*",
    matches: [
      "from itsdangerous import URLSafeTimedSerializer\n\ns = URLSafeTimedSerializer(\"secret-key\")",
    ],
    rejects: [
      "def URLSafeTimedSerializer(*parts):\n    return parts\n\ns = URLSafeTimedSerializer(\"secret-key\")",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:URLSafeTimedSerializer:*>call:dumps:*",
    matches: [
      "from itsdangerous import URLSafeTimedSerializer\n\ns = URLSafeTimedSerializer(\"secret-key\")\ntoken = s.dumps({\"user_id\": 42})",
    ],
    rejects: [
      "s = LocalRegistry()\ntoken = s.dumps({\"user_id\": 42})",
    ],
  },
  {
    library: ITSDANGEROUS,
    patternKey: "factory:URLSafeTimedSerializer:*>call:loads:*",
    matches: [
      "from itsdangerous import URLSafeTimedSerializer\n\ns = URLSafeTimedSerializer(\"secret-key\")\ndata = s.loads(token, max_age=3600)",
    ],
    rejects: [
      "s = LocalRegistry()\ndata = s.loads(token, max_age=3600)",
    ],
  },
]

const BCRYPT = "bcrypt"

export const bcryptFixtures: readonly PatternFixture[] = [
  {
    library: BCRYPT,
    patternKey: "call:hashpw:*",
    matches: [
      "import bcrypt\n\nhashed = bcrypt.hashpw(password, bcrypt.gensalt())",
    ],
    rejects: [
      "bcrypt = LocalRegistry()\n\nhashed = bcrypt.hashpw(password, bcrypt.gensalt())",
    ],
  },
  {
    library: BCRYPT,
    patternKey: "call:checkpw:*",
    matches: [
      "import bcrypt\n\nmatches = bcrypt.checkpw(password, hashed)",
    ],
    rejects: [
      "bcrypt = LocalRegistry()\n\nmatches = bcrypt.checkpw(password, hashed)",
    ],
  },
  {
    library: BCRYPT,
    patternKey: "call:gensalt:*",
    matches: [
      "import bcrypt\n\nsalt = bcrypt.gensalt(14)",
    ],
    rejects: [
      "bcrypt = LocalRegistry()\n\nsalt = bcrypt.gensalt(14)",
    ],
  },
  {
    library: BCRYPT,
    patternKey: "call:kdf:*",
    matches: [
      "import bcrypt\n\nkey = bcrypt.kdf(password=b'password', salt=b'salt', desired_key_bytes=32, rounds=100)",
    ],
    rejects: [
      "bcrypt = LocalRegistry()\n\nkey = bcrypt.kdf(password=b'password', salt=b'salt', desired_key_bytes=32, rounds=100)",
    ],
  },
]
