import type { CatalogueLibrary } from "@/catalogue/types"

export const supabaseLibrary: CatalogueLibrary = {
  name: "Supabase",
  specifiers: ["@supabase/supabase-js"],
  documentedVersion: "2.117",
  category: "cloud",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createClient",
      methods: [
        { kind: "call", name: "from", slots: [], makes: "data" },
        { kind: "call", name: "rpc", slots: [], makes: "data" },
        { kind: "call", name: "signInWithPassword", slots: [], makes: "auth" },
        { kind: "call", name: "getUser", slots: [], makes: "auth" },
        { kind: "call", name: "signOut", slots: [], makes: "auth" },
        { kind: "call", name: "onAuthStateChange", slots: [{ at: 0, runs: "event" }] },
        { kind: "call", name: "invoke", slots: [], makes: "request", pathAt: 0 },
      ],
    },
  ],
}

export const nhostLibrary: CatalogueLibrary = {
  name: "Nhost",
  specifiers: ["@nhost/nhost-js"],
  documentedVersion: "4.9",
  category: "cloud",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "createClient",
      methods: [
        { kind: "call", name: "signInEmailPassword", slots: [], makes: "auth" },
        { kind: "call", name: "request", slots: [], makes: "request" },
        { kind: "call", name: "uploadFiles", slots: [], makes: "request" },
      ],
    },
  ],
}

export const awsSdkS3Library: CatalogueLibrary = {
  name: "AWS SDK for JavaScript",
  specifiers: ["@aws-sdk/client-s3", "@aws-sdk/lib-storage", "@aws-sdk/s3-request-presigner"],
  documentedVersion: "3.1152",
  category: "cloud",
  type: "fullstack",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "S3Client",
      methods: [
        { kind: "call", name: "send", slots: [], makes: "request" },
      ],
    },
    {
      kind: "factory",
      name: "Upload",
      methods: [
        { kind: "call", name: "done", slots: [], makes: "request" },
        { kind: "call", name: "on", slots: [{ at: 1, runs: "event" }], eventAt: 0 },
      ],
    },
    { kind: "call", name: "getSignedUrl", slots: [], classifies: "third-party-integration" },
  ],
}

export const googleCloudStorageLibrary: CatalogueLibrary = {
  name: "Google Cloud Storage",
  specifiers: ["@google-cloud/storage"],
  documentedVersion: "8.4",
  category: "cloud",
  type: "backend",
  language: "javascript",
  patterns: [
    {
      kind: "factory",
      name: "Storage",
      methods: [
        { kind: "call", name: "save", slots: [], makes: "request" },
        { kind: "call", name: "download", slots: [], makes: "data-fetch" },
        { kind: "call", name: "getSignedUrl", slots: [], classifies: "third-party-integration" },
      ],
    },
  ],
}

export const firebaseLibrary: CatalogueLibrary = {
  name: "Firebase",
  specifiers: [
    "firebase/app",
    "firebase/auth",
    "firebase/firestore",
    "firebase/firestore/lite",
    "firebase/storage",
    "firebase-admin/app",
    "firebase-admin/auth",
    "firebase-admin/firestore",
  ],
  documentedVersion: "13.0",
  category: "cloud",
  type: "fullstack",
  language: "javascript",
  patterns: [
    { kind: "call", name: "initializeApp", slots: [], makes: "config" },
    {
      kind: "factory",
      name: "getFirestore",
      methods: [
        { kind: "call", name: "set", slots: [], makes: "data" },
        { kind: "call", name: "update", slots: [], makes: "data" },
        { kind: "call", name: "get", slots: [], makes: "data-fetch", classifies: "database-read-write" },
      ],
    },
    { kind: "call", name: "addDoc", slots: [], makes: "data" },
    { kind: "call", name: "setDoc", slots: [], makes: "data" },
    { kind: "call", name: "updateDoc", slots: [], makes: "data" },
    { kind: "call", name: "deleteDoc", slots: [], makes: "data" },
    { kind: "call", name: "getDoc", slots: [], makes: "data-fetch", classifies: "database-read-write" },
    { kind: "call", name: "getDocs", slots: [], makes: "data-fetch", classifies: "database-read-write" },
    { kind: "call", name: "onSnapshot", slots: [{ at: 1, runs: "event" }], classifies: "websocket" },
    {
      kind: "factory",
      name: "getAuth",
      methods: [
        { kind: "call", name: "verifyIdToken", slots: [], makes: "auth" },
        { kind: "call", name: "createUser", slots: [], makes: "auth" },
      ],
    },
    { kind: "call", name: "signInWithEmailAndPassword", slots: [], makes: "auth" },
    { kind: "call", name: "createUserWithEmailAndPassword", slots: [], makes: "auth" },
    { kind: "call", name: "signOut", slots: [], makes: "auth" },
    { kind: "call", name: "onAuthStateChanged", slots: [{ at: 1, runs: "event" }] },
    { kind: "call", name: "uploadBytes", slots: [], makes: "request" },
    { kind: "call", name: "getDownloadURL", slots: [], makes: "request" },
    { kind: "call", name: "deleteObject", slots: [], makes: "request" },
  ],
}
