import type { PatternFixture } from "@/catalogue/types"

const APACHE_LIBCLOUD = "Apache Libcloud"

export const apacheLibcloudFixtures: readonly PatternFixture[] = [
  {
    library: APACHE_LIBCLOUD,
    patternKey: "factory:get_driver:*",
    matches: [
      "from libcloud.compute.providers import get_driver\n\ncls = get_driver(Provider.RACKSPACE)\ndriver = cls(\"username\", \"api key\", region=\"iad\")",
    ],
    rejects: [
      "def get_driver(*parts, **options):\n    return parts\n\ncls = get_driver(Provider.RACKSPACE)\ndriver = cls(\"username\", \"api key\", region=\"iad\")",
    ],
  },
]

const BOTO3 = "boto3"

export const boto3Fixtures: readonly PatternFixture[] = [
  {
    library: BOTO3,
    patternKey: "factory:client:*",
    matches: [
      "from boto3 import client\n\nsqs = client(\"sqs\")",
    ],
    rejects: [
      "def client(*parts, **options):\n    return parts\n\nsqs = client(\"sqs\")",
    ],
  },
  {
    library: BOTO3,
    patternKey: "factory:client:*>call:send_message:*",
    matches: [
      "from boto3 import client\n\nsqs = client(\"sqs\")\n\nsqs.send_message(QueueUrl=queue_url, MessageBody=\"hello\")",
    ],
    rejects: [
      "sqs = LocalRegistry()\n\nsqs.send_message(QueueUrl=queue_url, MessageBody=\"hello\")",
    ],
  },
  {
    library: BOTO3,
    patternKey: "factory:resource:*",
    matches: [
      "from boto3 import resource\n\ns3 = resource(\"s3\")",
    ],
    rejects: [
      "def resource(*parts, **options):\n    return parts\n\ns3 = resource(\"s3\")",
    ],
  },
]

const GOOGLE_API_PYTHON_CLIENT = "google-api-python-client"

export const googleApiPythonClientFixtures: readonly PatternFixture[] = [
  {
    library: GOOGLE_API_PYTHON_CLIENT,
    patternKey: "factory:build:*",
    matches: [
      "from googleapiclient.discovery import build\n\nservice = build(\"drive\", \"v3\", credentials=creds)",
    ],
    rejects: [
      "def build(*parts, **options):\n    return parts\n\nservice = build(\"drive\", \"v3\", credentials=creds)",
    ],
  },
  {
    library: GOOGLE_API_PYTHON_CLIENT,
    patternKey: "factory:build:*>call:execute:*",
    matches: [
      "from googleapiclient.discovery import build\n\nservice = build(\"drive\", \"v3\", credentials=creds)\n\nresults = service.files().list(pageSize=10).execute()",
    ],
    rejects: [
      "service = LocalRegistry()\n\nresults = service.files().list(pageSize=10).execute()",
    ],
  },
]

const GOOGLE_CLOUD_STORAGE = "google-cloud-storage"

export const googleCloudStoragePythonFixtures: readonly PatternFixture[] = [
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Client:*",
    matches: [
      "from google.cloud import storage\n\nstorage_client = storage.Client()",
      "from google.cloud.storage import Client\n\nstorage_client = Client()",
    ],
    rejects: [
      "def Client(*parts, **options):\n    return parts\n\nstorage_client = Client()",
    ],
  },
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Client:*>call:upload_from_filename:*",
    matches: [
      "from google.cloud import storage\n\nstorage_client = storage.Client()\nbucket = storage_client.bucket(bucket_name)\nbucket.blob(destination_blob_name).upload_from_filename(source_file_name)",
    ],
    rejects: [
      "storage_client = LocalRegistry()\nbucket = storage_client.bucket(bucket_name)\nbucket.blob(destination_blob_name).upload_from_filename(source_file_name)",
    ],
  },
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Client:*>call:download_to_filename:*",
    matches: [
      "from google.cloud import storage\n\nstorage_client = storage.Client()\nstorage_client.bucket(bucket_name).blob(source_blob_name).download_to_filename(destination_file_name)",
    ],
    rejects: [
      "storage_client = LocalRegistry()\nstorage_client.bucket(bucket_name).blob(source_blob_name).download_to_filename(destination_file_name)",
    ],
  },
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Client:*>call:get_blob:*",
    matches: [
      "from google.cloud import storage\n\nstorage_client = storage.Client()\nblob = storage_client.bucket(bucket_name).get_blob(blob_name)",
    ],
    rejects: [
      "storage_client = LocalRegistry()\nblob = storage_client.bucket(bucket_name).get_blob(blob_name)",
    ],
  },
]

const AZURE_STORAGE_BLOB = "azure-storage-blob"

export const azureStorageBlobFixtures: readonly PatternFixture[] = [
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient(account_url, credential=credential)",
    ],
    rejects: [
      "class BlobServiceClient:\n    pass\n\nservice = BlobServiceClient(account_url, credential=credential)",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient:*>call:upload_blob:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient(account_url, credential=credential)\nservice.get_blob_client(container=\"photos\", blob=\"cat.jpg\").upload_blob(data)",
    ],
    rejects: [
      "service = LocalRegistry()\nservice.get_blob_client(container=\"photos\", blob=\"cat.jpg\").upload_blob(data)",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient:*>call:download_blob:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient(account_url, credential=credential)\nblob_client = service.get_blob_client(container=\"photos\", blob=\"cat.jpg\")\nstream_downloader = blob_client.download_blob(max_concurrency=2, encoding=\"UTF-8\")",
    ],
    rejects: [
      "blob_client = LocalRegistry()\nstream_downloader = blob_client.download_blob(max_concurrency=2, encoding=\"UTF-8\")",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient:*>call:start_copy_from_url:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient(account_url, credential=credential)\nservice.get_blob_client(container=\"photos\", blob=\"copy.jpg\").start_copy_from_url(source_url)",
    ],
    rejects: [
      "service = LocalRegistry()\nservice.get_blob_client(container=\"photos\", blob=\"copy.jpg\").start_copy_from_url(source_url)",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient.from_connection_string:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient.from_connection_string(conn_str=connection_string)",
    ],
    rejects: [
      "BlobServiceClient = LocalRegistry()\n\nservice = BlobServiceClient.from_connection_string(conn_str=connection_string)",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient.from_connection_string:*>call:upload_blob:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient.from_connection_string(conn_str=connection_string)\nservice.get_blob_client(container=\"photos\", blob=\"cat.jpg\").upload_blob(data)",
    ],
    rejects: [
      "service = LocalRegistry()\nservice.get_blob_client(container=\"photos\", blob=\"cat.jpg\").upload_blob(data)",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient.from_connection_string:*>call:download_blob:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient.from_connection_string(conn_str=connection_string)\nstream_downloader = service.get_blob_client(container=\"photos\", blob=\"cat.jpg\").download_blob()",
    ],
    rejects: [
      "service = LocalRegistry()\nstream_downloader = service.get_blob_client(container=\"photos\", blob=\"cat.jpg\").download_blob()",
    ],
  },
  {
    library: AZURE_STORAGE_BLOB,
    patternKey: "factory:BlobServiceClient.from_connection_string:*>call:start_copy_from_url:*",
    matches: [
      "from azure.storage.blob import BlobServiceClient\n\nservice = BlobServiceClient.from_connection_string(conn_str=connection_string)\nservice.get_blob_client(container=\"photos\", blob=\"copy.jpg\").start_copy_from_url(source_url)",
    ],
    rejects: [
      "service = LocalRegistry()\nservice.get_blob_client(container=\"photos\", blob=\"copy.jpg\").start_copy_from_url(source_url)",
    ],
  },
]
