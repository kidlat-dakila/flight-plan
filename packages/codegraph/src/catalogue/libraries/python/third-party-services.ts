import type { CatalogueLibrary } from "@/catalogue/types"

export const djangoWordpressLibrary: CatalogueLibrary = {
  name: "django-wordpress",
  specifiers: ["wordpress", "wordpress.models"],
  documentedVersion: "1.1",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "Post.objects.published", slots: [], makes: "data-fetch" },
    { kind: "call", name: "Post.objects.term", slots: [], makes: "data-fetch" },
  ],
}

export const facebookSdkLibrary: CatalogueLibrary = {
  name: "facebook-sdk",
  specifiers: ["facebook"],
  documentedVersion: "3.1",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "GraphAPI",
      methods: [
        { kind: "call", name: "get_object", slots: [], makes: "data-fetch" },
        { kind: "call", name: "get_objects", slots: [], makes: "data-fetch" },
        { kind: "call", name: "get_connections", slots: [], makes: "data-fetch" },
        { kind: "call", name: "put_object", slots: [], makes: "request" },
        { kind: "call", name: "put_photo", slots: [], makes: "request" },
      ],
    },
  ],
}

export const gspreadLibrary: CatalogueLibrary = {
  name: "gspread",
  specifiers: ["gspread"],
  documentedVersion: "6.2",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "service_account",
      methods: [
        { kind: "call", name: "open", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "oauth",
      makes: "auth",
      methods: [
        { kind: "call", name: "open", slots: [], makes: "request" },
      ],
    },
  ],
}

export const twythonLibrary: CatalogueLibrary = {
  name: "Twython",
  specifiers: ["twython"],
  documentedVersion: "3.9",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Twython",
      methods: [
        { kind: "call", name: "get_home_timeline", slots: [], makes: "data-fetch" },
        { kind: "call", name: "update_status", slots: [], makes: "request" },
        { kind: "call", name: "search", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}
