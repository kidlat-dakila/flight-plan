import type { CatalogueLibrary, MethodPattern } from "@/catalogue/types"

export const apacheLibcloudLibrary: CatalogueLibrary = {
  name: "Apache Libcloud",
  specifiers: ["libcloud", "libcloud.compute.providers", "libcloud.storage.providers", "libcloud.dns.providers"],
  documentedVersion: "3.9",
  category: "cloud",
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
  category: "cloud",
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

export const googleApiPythonClientLibrary: CatalogueLibrary = {
  name: "google-api-python-client",
  specifiers: ["googleapiclient", "googleapiclient.discovery"],
  documentedVersion: "2.201",
  category: "cloud",
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

export const googleCloudStoragePythonLibrary: CatalogueLibrary = {
  name: "google-cloud-storage",
  specifiers: ["google.cloud.storage"],
  documentedVersion: "3.17",
  category: "cloud",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "Client",
      methods: [
        { kind: "call", name: "upload_from_filename", slots: [], makes: "request" },
        { kind: "call", name: "download_to_filename", slots: [], makes: "data-fetch" },
        { kind: "call", name: "get_blob", slots: [], makes: "data-fetch" },
      ],
    },
  ],
}

const AZURE_STORAGE_BLOB_METHODS: readonly MethodPattern[] = [
  { kind: "call", name: "upload_blob", slots: [], makes: "request" },
  { kind: "call", name: "download_blob", slots: [], makes: "data-fetch" },
  { kind: "call", name: "start_copy_from_url", slots: [], makes: "request" },
]

export const azureStorageBlobLibrary: CatalogueLibrary = {
  name: "azure-storage-blob",
  specifiers: ["azure.storage.blob", "azure.storage.blob.aio"],
  documentedVersion: "12.31",
  category: "cloud",
  type: "backend",
  language: "python",
  patterns: [
    {
      kind: "factory",
      name: "BlobServiceClient",
      methods: AZURE_STORAGE_BLOB_METHODS,
    },
    {
      kind: "factory",
      name: "BlobServiceClient.from_connection_string",
      methods: AZURE_STORAGE_BLOB_METHODS,
    },
  ],
}
