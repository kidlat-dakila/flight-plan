import type { PatternFixture } from "@/catalogue/types"

const AUTHKIT = "AuthKit"

export const authkitFixtures: readonly PatternFixture[] = [
  {
    library: AUTHKIT,
    patternKey: "call:withAuth:*",
    matches: [
      "import { withAuth } from \"@workos-inc/authkit-nextjs\"\nconst { user } = await withAuth({ ensureSignedIn: true })",
    ],
    rejects: [
      "const withAuth = (...parts) => parts\nconst { user } = await withAuth({ ensureSignedIn: true })",
    ],
  },
  {
    library: AUTHKIT,
    patternKey: "call:getSignInUrl:*",
    matches: [
      "import { getSignInUrl } from \"@workos-inc/authkit-nextjs\"\nconst signInUrl = await getSignInUrl()",
    ],
    rejects: [
      "const getSignInUrl = (...parts) => parts\nconst signInUrl = await getSignInUrl()",
    ],
  },
  {
    library: AUTHKIT,
    patternKey: "call:signOut:*",
    matches: [
      "import { signOut } from \"@workos-inc/authkit-nextjs\"\nawait signOut()",
    ],
    rejects: [
      "const signOut = (...parts) => parts\nawait signOut()",
    ],
  },
  {
    library: AUTHKIT,
    patternKey: "call:authkitMiddleware:*",
    matches: [
      "import { authkitMiddleware } from \"@workos-inc/authkit-nextjs\"\nexport default authkitMiddleware()",
    ],
    rejects: [
      "const authkitMiddleware = (...parts) => parts\nexport default authkitMiddleware()",
    ],
  },
  {
    library: AUTHKIT,
    patternKey: "call:handleAuth:*",
    matches: [
      "import { handleAuth } from \"@workos-inc/authkit-nextjs\"\nexport const GET = handleAuth({ returnPathname: \"/dashboard\" })",
    ],
    rejects: [
      "const handleAuth = (...parts) => parts\nexport const GET = handleAuth({ returnPathname: \"/dashboard\" })",
    ],
  },
  {
    library: AUTHKIT,
    patternKey: "call:useAuth:*",
    matches: [
      "import { useAuth } from \"@workos-inc/authkit-nextjs/components\"\nconst { user, loading } = useAuth()",
    ],
    rejects: [
      "const useAuth = (...parts) => parts\nconst { user, loading } = useAuth()",
    ],
  },
]

const BETTER_AUTH = "Better Auth"

export const betterAuthFixtures: readonly PatternFixture[] = [
  {
    library: BETTER_AUTH,
    patternKey: "factory:betterAuth:*",
    matches: [
      "import { betterAuth } from \"better-auth\"\nexport const auth = betterAuth({ emailAndPassword: { enabled: true } })",
    ],
    rejects: [
      "const betterAuth = (...parts) => parts\nexport const auth = betterAuth({ emailAndPassword: { enabled: true } })",
    ],
  },
  {
    library: BETTER_AUTH,
    patternKey: "factory:betterAuth:*>call:getSession:*",
    matches: [
      "import { betterAuth } from \"better-auth\"\nexport const auth = betterAuth({ emailAndPassword: { enabled: true } })\nconst session = await auth.api.getSession({ headers: await headers() })",
    ],
    rejects: [
      "const auth = makeLocalRegistry()\nconst session = await auth.api.getSession({ headers: await headers() })",
    ],
  },
  {
    library: BETTER_AUTH,
    patternKey: "factory:createAuthClient:*",
    matches: [
      "import { createAuthClient } from \"better-auth/react\"\nexport const authClient = createAuthClient()",
    ],
    rejects: [
      "const createAuthClient = (...parts) => parts\nexport const authClient = createAuthClient()",
    ],
  },
  {
    library: BETTER_AUTH,
    patternKey: "factory:createAuthClient:*>call:email:*",
    matches: [
      "import { createAuthClient } from \"better-auth/react\"\nexport const authClient = createAuthClient()\nawait authClient.signIn.email({ email, password })",
    ],
    rejects: [
      "const authClient = makeLocalRegistry()\nawait authClient.signIn.email({ email, password })",
    ],
  },
  {
    library: BETTER_AUTH,
    patternKey: "factory:createAuthClient:*>call:signOut:*",
    matches: [
      "import { createAuthClient } from \"better-auth/react\"\nexport const authClient = createAuthClient()\nawait authClient.signOut()",
    ],
    rejects: [
      "const authClient = makeLocalRegistry()\nawait authClient.signOut()",
    ],
  },
]

const CASL = "CASL"

export const caslFixtures: readonly PatternFixture[] = [
  {
    library: CASL,
    patternKey: "factory:defineAbility:*",
    matches: [
      "import { defineAbility } from \"@casl/ability\"\nconst ability = defineAbility((can, cannot) => { can(\"read\", \"Post\"); cannot(\"delete\", \"Post\") })",
    ],
    rejects: [
      "const defineAbility = (...parts) => parts\nconst ability = defineAbility((can, cannot) => { can(\"read\", \"Post\"); cannot(\"delete\", \"Post\") })",
    ],
  },
  {
    library: CASL,
    patternKey: "factory:defineAbility:*>call:can:*",
    matches: [
      "import { defineAbility } from \"@casl/ability\"\nconst ability = defineAbility((can, cannot) => { can(\"read\", \"Post\"); cannot(\"delete\", \"Post\") })\nconst allowed = ability.can(\"read\", \"Post\")",
    ],
    rejects: [
      "const ability = makeLocalRegistry()\nconst allowed = ability.can(\"read\", \"Post\")",
    ],
  },
  {
    library: CASL,
    patternKey: "factory:AbilityBuilder:*",
    matches: [
      "import { AbilityBuilder } from \"@casl/ability\"\nconst builder = new AbilityBuilder(createMongoAbility)",
    ],
    rejects: [
      "const AbilityBuilder = (...parts) => parts\nconst builder = new AbilityBuilder(createMongoAbility)",
    ],
  },
  {
    library: CASL,
    patternKey: "factory:AbilityBuilder:*>call:build:*",
    matches: [
      "import { AbilityBuilder } from \"@casl/ability\"\nconst builder = new AbilityBuilder(createMongoAbility)\nconst ability = builder.build()",
    ],
    rejects: [
      "const builder = makeLocalRegistry()\nconst ability = builder.build()",
    ],
  },
]

const JOSE = "jose"

export const joseFixtures: readonly PatternFixture[] = [
  {
    library: JOSE,
    patternKey: "call:jwtVerify:*",
    matches: [
      "import { jwtVerify } from \"jose\"\nconst { payload } = await jwtVerify(jwt, secret, { issuer: \"urn:example:issuer\" })",
    ],
    rejects: [
      "const jwtVerify = (...parts) => parts\nconst { payload } = await jwtVerify(jwt, secret, { issuer: \"urn:example:issuer\" })",
    ],
  },
  {
    library: JOSE,
    patternKey: "factory:SignJWT:*",
    matches: [
      "import { SignJWT } from \"jose\"\nconst signer = new SignJWT({ \"urn:example:claim\": true })",
    ],
    rejects: [
      "const SignJWT = (...parts) => parts\nconst signer = new SignJWT({ \"urn:example:claim\": true })",
    ],
  },
  {
    library: JOSE,
    patternKey: "call:createRemoteJWKSet:*",
    matches: [
      "import { createRemoteJWKSet } from \"jose\"\nconst JWKS = createRemoteJWKSet(new URL(\"https://example.com/.well-known/jwks.json\"))",
    ],
    rejects: [
      "const createRemoteJWKSet = (...parts) => parts\nconst JWKS = createRemoteJWKSet(new URL(\"https://example.com/.well-known/jwks.json\"))",
    ],
  },
  {
    library: JOSE,
    patternKey: "factory:CompactSign:*",
    matches: [
      "import { CompactSign } from \"jose\"\nconst jws = await new CompactSign(new TextEncoder().encode(\"payload\")).setProtectedHeader({ alg: \"ES256\" }).sign(privateKey)",
    ],
    rejects: [
      "const CompactSign = (...parts) => parts\nconst jws = await new CompactSign(new TextEncoder().encode(\"payload\")).setProtectedHeader({ alg: \"ES256\" }).sign(privateKey)",
    ],
  },
  {
    library: JOSE,
    patternKey: "call:compactVerify:*",
    matches: [
      "import { compactVerify } from \"jose\"\nconst { payload, protectedHeader } = await compactVerify(jws, publicKey)",
    ],
    rejects: [
      "const compactVerify = (...parts) => parts\nconst { payload, protectedHeader } = await compactVerify(jws, publicKey)",
    ],
  },
  {
    library: JOSE,
    patternKey: "factory:CompactEncrypt:*",
    matches: [
      "import { CompactEncrypt } from \"jose\"\nconst jwe = await new CompactEncrypt(new TextEncoder().encode(\"payload\")).setProtectedHeader({ alg: \"RSA-OAEP-256\", enc: \"A256GCM\" }).encrypt(publicKey)",
    ],
    rejects: [
      "const CompactEncrypt = (...parts) => parts\nconst jwe = await new CompactEncrypt(new TextEncoder().encode(\"payload\")).setProtectedHeader({ alg: \"RSA-OAEP-256\", enc: \"A256GCM\" }).encrypt(publicKey)",
    ],
  },
  {
    library: JOSE,
    patternKey: "call:compactDecrypt:*",
    matches: [
      "import { compactDecrypt } from \"jose\"\nconst { plaintext, protectedHeader } = await compactDecrypt(jwe, privateKey)",
    ],
    rejects: [
      "const compactDecrypt = (...parts) => parts\nconst { plaintext, protectedHeader } = await compactDecrypt(jwe, privateKey)",
    ],
  },
]

const JSONWEBTOKEN = "jsonwebtoken"

export const jsonwebtokenFixtures: readonly PatternFixture[] = [
  {
    library: JSONWEBTOKEN,
    patternKey: "call:default.sign:*",
    matches: [
      "import jwt from \"jsonwebtoken\"\nconst token = jwt.sign({ foo: \"bar\" }, privateKey, { algorithm: \"RS256\" })",
    ],
    rejects: [
      "const jwt = makeLocalRegistry()\nconst token = jwt.sign({ foo: \"bar\" }, privateKey, { algorithm: \"RS256\" })",
    ],
  },
  {
    library: JSONWEBTOKEN,
    patternKey: "call:default.verify:*",
    matches: [
      "import jwt from \"jsonwebtoken\"\nconst decoded = jwt.verify(token, secret)",
    ],
    rejects: [
      "const jwt = makeLocalRegistry()\nconst decoded = jwt.verify(token, secret)",
    ],
  },
  {
    library: JSONWEBTOKEN,
    patternKey: "call:default.decode:*",
    matches: [
      "import jwt from \"jsonwebtoken\"\nconst decoded = jwt.decode(token)",
    ],
    rejects: [
      "const jwt = makeLocalRegistry()\nconst decoded = jwt.decode(token)",
    ],
  },
]

const LUCIA = "Lucia"

export const luciaFixtures: readonly PatternFixture[] = [
  {
    library: LUCIA,
    patternKey: "factory:Lucia:*",
    matches: [
      "import { Lucia } from \"lucia\"\nconst lucia = new Lucia(adapter)",
    ],
    rejects: [
      "const Lucia = (...parts) => parts\nconst lucia = new Lucia(adapter)",
    ],
  },
  {
    library: LUCIA,
    patternKey: "factory:Lucia:*>call:createSession:*",
    matches: [
      "import { Lucia } from \"lucia\"\nconst lucia = new Lucia(adapter)\nlucia.createSession(sessionId)",
    ],
    rejects: [
      "const lucia = makeLocalRegistry()\nlucia.createSession(sessionId)",
    ],
  },
  {
    library: LUCIA,
    patternKey: "factory:Lucia:*>call:validateSession:*",
    matches: [
      "import { Lucia } from \"lucia\"\nconst lucia = new Lucia(adapter)\nlucia.validateSession(sessionId)",
    ],
    rejects: [
      "const lucia = makeLocalRegistry()\nlucia.validateSession(sessionId)",
    ],
  },
  {
    library: LUCIA,
    patternKey: "factory:Lucia:*>call:invalidateSession:*",
    matches: [
      "import { Lucia } from \"lucia\"\nconst lucia = new Lucia(adapter)\nlucia.invalidateSession(sessionId)",
    ],
    rejects: [
      "const lucia = makeLocalRegistry()\nlucia.invalidateSession(sessionId)",
    ],
  },
]

const MSAL_JS = "MSAL.js"

export const msalJsFixtures: readonly PatternFixture[] = [
  {
    library: MSAL_JS,
    patternKey: "factory:PublicClientApplication:*",
    matches: [
      "import { PublicClientApplication } from \"@azure/msal-browser\"\nconst msalInstance = new PublicClientApplication(msalConfig)",
    ],
    rejects: [
      "const PublicClientApplication = (...parts) => parts\nconst msalInstance = new PublicClientApplication(msalConfig)",
    ],
  },
  {
    library: MSAL_JS,
    patternKey: "factory:PublicClientApplication:*>call:acquireTokenSilent:*",
    matches: [
      "import { PublicClientApplication } from \"@azure/msal-browser\"\nconst msalInstance = new PublicClientApplication(msalConfig)\nmsalInstance.acquireTokenSilent(request)",
    ],
    rejects: [
      "const msalInstance = makeLocalRegistry()\nmsalInstance.acquireTokenSilent(request)",
    ],
  },
  {
    library: MSAL_JS,
    patternKey: "factory:PublicClientApplication:*>call:loginPopup:*",
    matches: [
      "import { PublicClientApplication } from \"@azure/msal-browser\"\nconst msalInstance = new PublicClientApplication(msalConfig)\nmsalInstance.loginPopup(request)",
    ],
    rejects: [
      "const msalInstance = makeLocalRegistry()\nmsalInstance.loginPopup(request)",
    ],
  },
  {
    library: MSAL_JS,
    patternKey: "factory:ConfidentialClientApplication:*",
    matches: [
      "import { ConfidentialClientApplication } from \"@azure/msal-node\"\nconst cca = new ConfidentialClientApplication(config)",
    ],
    rejects: [
      "const ConfidentialClientApplication = (...parts) => parts\nconst cca = new ConfidentialClientApplication(config)",
    ],
  },
  {
    library: MSAL_JS,
    patternKey: "factory:ConfidentialClientApplication:*>call:acquireTokenByClientCredential:*",
    matches: [
      "import { ConfidentialClientApplication } from \"@azure/msal-node\"\nconst cca = new ConfidentialClientApplication(config)\nconst result = await cca.acquireTokenByClientCredential({ scopes })",
    ],
    rejects: [
      "const cca = makeLocalRegistry()\nconst result = await cca.acquireTokenByClientCredential({ scopes })",
    ],
  },
]

const NEXTAUTH_JS = "NextAuth.js"

export const nextauthJsFixtures: readonly PatternFixture[] = [
  {
    library: NEXTAUTH_JS,
    patternKey: "factory:default:*",
    matches: [
      "import NextAuth from \"next-auth\"\nexport const { handlers, signIn, signOut, auth } = NextAuth({ providers: [GitHub] })",
    ],
    rejects: [
      "const NextAuth = (...parts) => parts\nexport const { handlers, signIn, signOut, auth } = NextAuth({ providers: [GitHub] })",
    ],
  },
  {
    library: NEXTAUTH_JS,
    patternKey: "factory:default:*>call:auth:*",
    matches: [
      "import NextAuth from \"next-auth\"\nexport const { handlers, signIn, signOut, auth } = NextAuth({ providers: [GitHub] })\nconst session = await auth()",
    ],
    rejects: [
      "const auth = makeLocalRegistry()\nconst session = await auth()",
    ],
  },
  {
    library: NEXTAUTH_JS,
    patternKey: "call:useSession:*",
    matches: [
      "import { useSession } from \"next-auth/react\"\nconst { data: session } = useSession()",
    ],
    rejects: [
      "const useSession = (...parts) => parts\nconst { data: session } = useSession()",
    ],
  },
]

const OIDC_PROVIDER = "oidc-provider"

export const oidcProviderFixtures: readonly PatternFixture[] = [
  {
    library: OIDC_PROVIDER,
    patternKey: "factory:default:*",
    matches: [
      "import Provider from \"oidc-provider\"\nconst provider = new Provider(\"http://localhost:3000\", configuration)",
    ],
    rejects: [
      "const Provider = (...parts) => parts\nconst provider = new Provider(\"http://localhost:3000\", configuration)",
    ],
  },
  {
    library: OIDC_PROVIDER,
    patternKey: "factory:default:*>call:interactionDetails:*",
    matches: [
      "import Provider from \"oidc-provider\"\nconst provider = new Provider(\"http://localhost:3000\", configuration)\nconst details = await provider.interactionDetails(req, res)",
    ],
    rejects: [
      "const provider = makeLocalRegistry()\nconst details = await provider.interactionDetails(req, res)",
    ],
  },
  {
    library: OIDC_PROVIDER,
    patternKey: "factory:default:*>call:use:*",
    matches: [
      "import Provider from \"oidc-provider\"\nconst provider = new Provider(\"http://localhost:3000\", configuration)\nprovider.use(async (ctx, next) => { await next() })",
    ],
    rejects: [
      "const provider = makeLocalRegistry()\nprovider.use(async (ctx, next) => { await next() })",
    ],
  },
  {
    library: OIDC_PROVIDER,
    patternKey: "factory:default:*>call:on:*",
    matches: [
      "import Provider from \"oidc-provider\"\nconst provider = new Provider(\"http://localhost:3000\", configuration)\nprovider.on(\"grant.success\", (ctx) => { report(ctx) })",
    ],
    rejects: [
      "const provider = makeLocalRegistry()\nprovider.on(\"grant.success\", (ctx) => { report(ctx) })",
    ],
  },
]

const STACK_AUTH = "Stack Auth"

export const stackAuthFixtures: readonly PatternFixture[] = [
  {
    library: STACK_AUTH,
    patternKey: "call:useUser:*",
    matches: [
      "import { useUser } from \"@stackframe/stack\"\nconst user = useUser({ or: \"redirect\" })",
    ],
    rejects: [
      "const useUser = (...parts) => parts\nconst user = useUser({ or: \"redirect\" })",
    ],
  },
  {
    library: STACK_AUTH,
    patternKey: "factory:StackServerApp:*",
    matches: [
      "import { StackServerApp } from \"@stackframe/stack\"\nexport const stackServerApp = new StackServerApp({ tokenStore: \"nextjs-cookie\" })",
    ],
    rejects: [
      "const StackServerApp = (...parts) => parts\nexport const stackServerApp = new StackServerApp({ tokenStore: \"nextjs-cookie\" })",
    ],
  },
  {
    library: STACK_AUTH,
    patternKey: "factory:StackServerApp:*>call:getUser:*",
    matches: [
      "import { StackServerApp } from \"@stackframe/stack\"\nexport const stackServerApp = new StackServerApp({ tokenStore: \"nextjs-cookie\" })\nconst user = await stackServerApp.getUser()",
    ],
    rejects: [
      "const stackServerApp = makeLocalRegistry()\nconst user = await stackServerApp.getUser()",
    ],
  },
]
