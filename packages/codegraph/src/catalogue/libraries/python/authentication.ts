import type { CatalogueLibrary } from "@/catalogue/types"

export const authlibLibrary: CatalogueLibrary = {
  name: "Authlib",
  specifiers: ["authlib", "authlib.integrations.flask_client", "authlib.integrations.django_client", "authlib.integrations.starlette_client"],
  documentedVersion: "1.8",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "OAuth",
      methods: [
        { kind: "call", name: "register", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const djangoAllauthLibrary: CatalogueLibrary = {
  name: "django-allauth",
  specifiers: ["allauth", "allauth.urls"],
  documentedVersion: "65.19",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "file", glob: "**/allauth/urls.py", exports: [{ name: "urlpatterns", runs: "in-place" }] },
  ],
}

export const djangoGuardianLibrary: CatalogueLibrary = {
  name: "django-guardian",
  specifiers: ["guardian", "guardian.shortcuts", "guardian.decorators"],
  documentedVersion: "3.5",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "assign_perm", slots: [], makes: "auth" },
    { kind: "decorator", name: "permission_required", makes: "auth" },
  ],
}

export const djangoOauthToolkitLibrary: CatalogueLibrary = {
  name: "django-oauth-toolkit",
  specifiers: ["oauth2_provider", "oauth2_provider.decorators"],
  documentedVersion: "3.4",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "protected_resource", makes: "auth" },
  ],
}

export const oauthlibLibrary: CatalogueLibrary = {
  name: "OAuthLib",
  specifiers: ["oauthlib", "oauthlib.oauth2"],
  documentedVersion: "4.0",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "WebApplicationClient",
      makes: "auth",
      methods: [],
    },
  ],
}

export const pyjwtLibrary: CatalogueLibrary = {
  name: "PyJWT",
  specifiers: ["jwt"],
  documentedVersion: "2.15",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "encode", slots: [], makes: "auth" },
    { kind: "call", name: "decode", slots: [], makes: "auth" },
    {
      kind: "factory",
      name: "PyJWKClient",
      methods: [
        { kind: "call", name: "get_signing_key_from_jwt", slots: [], makes: "auth" },
      ],
    },
  ],
}

export const pythonJoseLibrary: CatalogueLibrary = {
  name: "python-jose",
  specifiers: ["jose"],
  documentedVersion: "3.5",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "jwt.encode", slots: [], makes: "auth" },
    { kind: "call", name: "jwt.decode", slots: [], makes: "auth" },
    { kind: "call", name: "jws.sign", slots: [], makes: "auth" },
    { kind: "call", name: "jws.verify", slots: [], makes: "auth" },
  ],
}

export const pythonJwtLibrary: CatalogueLibrary = {
  name: "python-jwt",
  specifiers: ["python_jwt"],
  documentedVersion: "4.1",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "generate_jwt", slots: [], makes: "auth" },
    { kind: "call", name: "verify_jwt", slots: [], makes: "auth" },
  ],
}

export const pythonOauth2Library: CatalogueLibrary = {
  name: "python-oauth2",
  specifiers: ["oauth2"],
  documentedVersion: "1.9",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Consumer",
      makes: "auth",
      methods: [],
    },
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "request", slots: [], makes: "request", pathAt: 0, methodAt: 1 },
      ],
    },
  ],
}

export const pythonSocialAuthLibrary: CatalogueLibrary = {
  name: "python-social-auth",
  specifiers: ["social_core", "social_core.pipeline.partial"],
  documentedVersion: "6.1",
  category: "authentication",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "decorator", name: "partial", makes: "auth" },
  ],
}
