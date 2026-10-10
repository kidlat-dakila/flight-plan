import type { CatalogueLibrary } from "@/catalogue/types"

export const authkitLibrary: CatalogueLibrary = {
  name: "AuthKit",
  specifiers: ["@workos-inc/authkit-nextjs", "@workos-inc/authkit-nextjs/components", "@workos-inc/node"],
  documentedVersion: "4.4",
  category: "authentication",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "withAuth", slots: [], makes: "auth" },
    { kind: "call", name: "getSignInUrl", slots: [], makes: "auth" },
    { kind: "call", name: "signOut", slots: [], makes: "auth" },
    { kind: "call", name: "authkitMiddleware", slots: [], makes: "auth" },
    { kind: "call", name: "handleAuth", slots: [], makes: "auth" },
    { kind: "call", name: "useAuth", slots: [], makes: "auth" },
  ],
}

export const betterAuthLibrary: CatalogueLibrary = {
  name: "Better Auth",
  specifiers: ["better-auth", "better-auth/react", "better-auth/client"],
  documentedVersion: "1.7",
  category: "authentication",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "betterAuth",
      methods: [
        { kind: "call", name: "getSession", slots: [], makes: "auth" },
      ],
    },
    {
      kind: "factory",
      name: "createAuthClient",
      methods: [
        { kind: "call", name: "email", slots: [], makes: "auth" },
        { kind: "call", name: "signOut", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const caslLibrary: CatalogueLibrary = {
  name: "CASL",
  specifiers: ["@casl/ability", "@casl/react", "@casl/vue"],
  documentedVersion: "7.0",
  category: "authentication",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "defineAbility",
      slots: [{ at: 0, runs: "in-place" }],
      methods: [
        { kind: "call", name: "can", slots: [], makes: "auth" },
      ],
    },
    {
      kind: "factory",
      name: "AbilityBuilder",
      methods: [
        { kind: "call", name: "build", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const joseLibrary: CatalogueLibrary = {
  name: "jose",
  specifiers: ["jose"],
  documentedVersion: "6.2",
  category: "authentication",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "jwtVerify", slots: [], makes: "auth" },
    {
      kind: "factory",
      name: "SignJWT",
      makes: "auth",
      methods: [],
    },
    { kind: "call", name: "createRemoteJWKSet", slots: [], makes: "auth" },
  ],
}

export const jsonwebtokenLibrary: CatalogueLibrary = {
  name: "jsonwebtoken",
  specifiers: ["jsonwebtoken"],
  documentedVersion: "9.0",
  category: "authentication",
  type: "backend",
  language: "javascript",
  patterns: [
    { kind: "call", name: "default.sign", slots: [{ at: "last", runs: "event" }], makes: "auth" },
    { kind: "call", name: "default.verify", slots: [{ at: "last", runs: "event" }], makes: "auth" },
    { kind: "call", name: "default.decode", slots: [], makes: "auth" },
  ],
}

export const luciaLibrary: CatalogueLibrary = {
  name: "Lucia",
  specifiers: ["lucia"],
  documentedVersion: "3.2",
  category: "authentication",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Lucia",
      methods: [
        { kind: "call", name: "createSession", slots: [], makes: "auth" },
        { kind: "call", name: "validateSession", slots: [], makes: "auth" },
        { kind: "call", name: "invalidateSession", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const msalJsLibrary: CatalogueLibrary = {
  name: "MSAL.js",
  specifiers: ["@azure/msal-browser", "@azure/msal-node", "@azure/msal-react"],
  documentedVersion: "5.25",
  category: "authentication",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "PublicClientApplication",
      methods: [
        { kind: "call", name: "acquireTokenSilent", slots: [], makes: "auth" },
        { kind: "call", name: "loginPopup", slots: [], makes: "auth" },
      ],
    },
    {
      kind: "factory",
      name: "ConfidentialClientApplication",
      methods: [
        { kind: "call", name: "acquireTokenByClientCredential", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const nextauthJsLibrary: CatalogueLibrary = {
  name: "NextAuth.js",
  specifiers: ["next-auth", "next-auth/react"],
  documentedVersion: "4.24",
  category: "authentication",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      makes: "auth",
      methods: [{ kind: "call", name: "auth", slots: [], makes: "auth" }],
    },
    { kind: "call", name: "useSession", slots: [], makes: "auth" },
  ],
}

export const oidcProviderLibrary: CatalogueLibrary = {
  name: "oidc-provider",
  specifiers: ["oidc-provider"],
  documentedVersion: "9.12",
  category: "authentication",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "default",
      makes: "auth",
      methods: [
        { kind: "call", name: "interactionDetails", slots: [], makes: "auth" },
        { kind: "call", name: "use", slots: [{ at: 0, runs: "middleware" }] },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
  ],
}

export const stackAuthLibrary: CatalogueLibrary = {
  name: "Stack Auth",
  specifiers: ["@stackframe/stack", "@stackframe/react"],
  documentedVersion: "2.8",
  category: "authentication",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "useUser", slots: [], makes: "auth" },
    {
      kind: "factory",
      name: "StackServerApp",
      methods: [
        { kind: "call", name: "getUser", slots: [], makes: "auth" },
      ],
    },
  ],
}
