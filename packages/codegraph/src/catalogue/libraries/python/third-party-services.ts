import type { CatalogueLibrary } from "@/catalogue/types"

export const apacheLibcloudLibrary: CatalogueLibrary = {
  name: "Apache Libcloud",
  specifiers: ["libcloud", "libcloud.compute.providers", "libcloud.storage.providers", "libcloud.dns.providers"],
  documentedVersion: "3.9",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "get_driver",
      makes: "request",
      methods: [],
    },
  ],
}

export const boto3Library: CatalogueLibrary = {
  name: "boto3",
  specifiers: ["boto3"],
  documentedVersion: "1.43",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "client",
      makes: "request",
      methods: [
        { kind: "call", name: "send_message", slots: [], makes: "publish" },
      ],
    },
    {
      kind: "factory",
      name: "resource",
      makes: "request",
      methods: [],
    },
  ],
}

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

export const flankerLibrary: CatalogueLibrary = {
  name: "Flanker",
  specifiers: ["flanker", "flanker.addresslib", "flanker.mime"],
  documentedVersion: "0.9",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    { kind: "call", name: "address.parse", slots: [], makes: "validation" },
    { kind: "call", name: "mime.from_string", slots: [], makes: "validation" },
  ],
}

export const googleApiPythonClientLibrary: CatalogueLibrary = {
  name: "google-api-python-client",
  specifiers: ["googleapiclient", "googleapiclient.discovery"],
  documentedVersion: "2.201",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "build",
      methods: [
        { kind: "call", name: "execute", slots: [], makes: "request" },
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

export const imboxLibrary: CatalogueLibrary = {
  name: "Imbox",
  specifiers: ["imbox"],
  documentedVersion: "0.10",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Imbox",
      methods: [
        { kind: "call", name: "messages", slots: [], makes: "request" },
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

export const yagmailLibrary: CatalogueLibrary = {
  name: "yagmail",
  specifiers: ["yagmail"],
  documentedVersion: "0.16",
  category: "third-party-services",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "SMTP",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "request" },
      ],
    },
  ],
}
