import type { PatternFixture } from "@/catalogue/types"

const SUPABASE = "Supabase"

export const supabaseFixtures: readonly PatternFixture[] = [
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)",
    ],
    rejects: [
      "const createClient = (...parts) => parts\nconst supabase = createClient(supabaseUrl, supabaseKey)",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:from:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nconst { data, error } = await supabase.from(\"countries\").select()",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nconst { data, error } = await supabase.from(\"countries\").select()",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:rpc:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nconst { data, error } = await supabase.rpc(\"hello_world\")",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nconst { data, error } = await supabase.rpc(\"hello_world\")",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:signInWithPassword:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nawait supabase.auth.signInWithPassword({ email, password })",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nawait supabase.auth.signInWithPassword({ email, password })",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:getUser:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nconst { data: { user } } = await supabase.auth.getUser()",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nconst { data: { user } } = await supabase.auth.getUser()",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:signOut:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nawait supabase.auth.signOut()",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nawait supabase.auth.signOut()",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:onAuthStateChange:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nsupabase.auth.onAuthStateChange((event, session) => { report(event) })",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nsupabase.auth.onAuthStateChange((event, session) => { report(event) })",
    ],
  },
  {
    library: SUPABASE,
    patternKey: "factory:createClient:*>call:invoke:*",
    matches: [
      "import { createClient } from \"@supabase/supabase-js\"\nconst supabase = createClient(supabaseUrl, supabaseKey)\nawait supabase.functions.invoke(\"hello\", { body: { name: \"Ada\" } })",
    ],
    rejects: [
      "const supabase = makeLocalRegistry()\nawait supabase.functions.invoke(\"hello\", { body: { name: \"Ada\" } })",
    ],
  },
]

const NHOST = "Nhost"

export const nhostFixtures: readonly PatternFixture[] = [
  {
    library: NHOST,
    patternKey: "factory:createClient:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })",
    ],
    rejects: [
      "const createClient = (...parts) => parts\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })",
    ],
  },
  {
    library: NHOST,
    patternKey: "factory:createClient:*>call:signInEmailPassword:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })\nawait nhost.auth.signInEmailPassword({ email, password })",
    ],
    rejects: [
      "const nhost = makeLocalRegistry()\nawait nhost.auth.signInEmailPassword({ email, password })",
    ],
  },
  {
    library: NHOST,
    patternKey: "factory:createClient:*>call:request:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })\nconst users = await nhost.graphql.request({ query: \"query { users { id } }\" })",
    ],
    rejects: [
      "const nhost = makeLocalRegistry()\nconst users = await nhost.graphql.request({ query: \"query { users { id } }\" })",
    ],
  },
  {
    library: NHOST,
    patternKey: "factory:createClient:*>call:uploadFiles:*",
    matches: [
      "import { createClient } from \"@nhost/nhost-js\"\nconst nhost = createClient({ subdomain: \"local\", region: \"local\" })\nawait nhost.storage.uploadFiles({ \"file[]\": [new File([\"hi\"], \"hi.txt\")] })",
    ],
    rejects: [
      "const nhost = makeLocalRegistry()\nawait nhost.storage.uploadFiles({ \"file[]\": [new File([\"hi\"], \"hi.txt\")] })",
    ],
  },
]

const AWS_SDK_FOR_JAVASCRIPT = "AWS SDK for JavaScript"

export const awsSdkS3Fixtures: readonly PatternFixture[] = [
  {
    library: AWS_SDK_FOR_JAVASCRIPT,
    patternKey: "factory:S3Client:*",
    matches: [
      "import { S3Client } from \"@aws-sdk/client-s3\"\nconst client = new S3Client({ region: \"eu-west-1\" })",
    ],
    rejects: [
      "class S3Client {}\nconst client = new S3Client({ region: \"eu-west-1\" })",
    ],
  },
  {
    library: AWS_SDK_FOR_JAVASCRIPT,
    patternKey: "factory:S3Client:*>call:send:*",
    matches: [
      "import { S3Client, PutObjectCommand } from \"@aws-sdk/client-s3\"\nconst client = new S3Client({})\nawait client.send(new PutObjectCommand({ Bucket: bucket, Key: hash, Body: body }))",
    ],
    rejects: [
      "const client = makeLocalRegistry()\nawait client.send(new PutObjectCommand({ Bucket: bucket, Key: hash, Body: body }))",
    ],
  },
  {
    library: AWS_SDK_FOR_JAVASCRIPT,
    patternKey: "factory:Upload:*",
    matches: [
      "import { Upload } from \"@aws-sdk/lib-storage\"\nconst upload = new Upload({ client, params: { Bucket: bucket, Key: key, Body: body } })",
    ],
    rejects: [
      "class Upload {}\nconst upload = new Upload({ client, params: { Bucket: bucket, Key: key, Body: body } })",
    ],
  },
  {
    library: AWS_SDK_FOR_JAVASCRIPT,
    patternKey: "factory:Upload:*>call:done:*",
    matches: [
      "import { Upload } from \"@aws-sdk/lib-storage\"\nconst upload = new Upload({ client, params })\nconst completed = await upload.done()",
    ],
    rejects: [
      "const upload = makeLocalRegistry()\nconst completed = await upload.done()",
    ],
  },
  {
    library: AWS_SDK_FOR_JAVASCRIPT,
    patternKey: "factory:Upload:*>call:on:*",
    matches: [
      "import { Upload } from \"@aws-sdk/lib-storage\"\nconst upload = new Upload({ client, params })\nupload.on(\"httpUploadProgress\", (progress) => { report(progress.loaded) })",
    ],
    rejects: [
      "const upload = makeLocalRegistry()\nupload.on(\"httpUploadProgress\", (progress) => { report(progress.loaded) })",
    ],
  },
  {
    library: AWS_SDK_FOR_JAVASCRIPT,
    patternKey: "call:getSignedUrl:*",
    matches: [
      "import { getSignedUrl } from \"@aws-sdk/s3-request-presigner\"\nconst url = await getSignedUrl(client, command, { expiresIn: 3600 })",
    ],
    rejects: [
      "const getSignedUrl = (...parts) => parts\nconst url = await getSignedUrl(client, command, { expiresIn: 3600 })",
    ],
  },
]

const GOOGLE_CLOUD_STORAGE = "Google Cloud Storage"

export const googleCloudStorageFixtures: readonly PatternFixture[] = [
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Storage:*",
    matches: [
      "const { Storage } = require(\"@google-cloud/storage\")\nconst storage = new Storage()",
    ],
    rejects: [
      "class Storage {}\nconst storage = new Storage()",
    ],
  },
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Storage:*>call:save:*",
    matches: [
      "import { Storage } from \"@google-cloud/storage\"\nconst storage = new Storage()\nawait storage.bucket(bucketName).file(destFileName).save(contents)",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nawait storage.bucket(bucketName).file(destFileName).save(contents)",
    ],
  },
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Storage:*>call:download:*",
    matches: [
      "import { Storage } from \"@google-cloud/storage\"\nconst storage = new Storage()\nconst contents = await storage.bucket(bucketName).file(fileName).download()",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nconst contents = await storage.bucket(bucketName).file(fileName).download()",
    ],
  },
  {
    library: GOOGLE_CLOUD_STORAGE,
    patternKey: "factory:Storage:*>call:getSignedUrl:*",
    matches: [
      "import { Storage } from \"@google-cloud/storage\"\nconst storage = new Storage()\nconst [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl({ version: \"v4\", action: \"read\", expires })",
    ],
    rejects: [
      "const storage = makeLocalRegistry()\nconst [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl({ version: \"v4\", action: \"read\", expires })",
    ],
  },
]

const FIREBASE = "Firebase"

export const firebaseFixtures: readonly PatternFixture[] = [
  {
    library: FIREBASE,
    patternKey: "call:initializeApp:*",
    matches: [
      "import { initializeApp } from \"firebase/app\"\nconst app = initializeApp(firebaseConfig)",
      "import { initializeApp } from \"firebase-admin/app\"\ninitializeApp()",
    ],
    rejects: [
      "const initializeApp = (...parts) => parts\nconst app = initializeApp(firebaseConfig)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getFirestore:*",
    matches: [
      "import { getFirestore } from \"firebase/firestore\"\nconst db = getFirestore(app)",
    ],
    rejects: [
      "const getFirestore = (...parts) => parts\nconst db = getFirestore(app)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getFirestore:*>call:set:*",
    matches: [
      "import { getFirestore } from \"firebase-admin/firestore\"\nconst db = getFirestore()\nawait db.doc(\"posts/intro-to-firestore\").set({ title: \"Welcome\" })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.doc(\"posts/intro-to-firestore\").set({ title: \"Welcome\" })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getFirestore:*>call:update:*",
    matches: [
      "import { getFirestore } from \"firebase-admin/firestore\"\nconst db = getFirestore()\nawait db.doc(\"posts/intro-to-firestore\").update({ body: \"My first Firestore app\" })",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nawait db.doc(\"posts/intro-to-firestore\").update({ body: \"My first Firestore app\" })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getFirestore:*>call:get:*",
    matches: [
      "import { getFirestore } from \"firebase-admin/firestore\"\nconst db = getFirestore()\nconst post = await db.doc(\"posts/intro-to-firestore\").get()",
    ],
    rejects: [
      "const db = makeLocalRegistry()\nconst post = await db.doc(\"posts/intro-to-firestore\").get()",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:addDoc:*",
    matches: [
      "import { addDoc, collection } from \"firebase/firestore\"\nawait addDoc(collection(db, \"cities\"), { name: \"Tokyo\" })",
    ],
    rejects: [
      "const addDoc = (...parts) => parts\nawait addDoc(collection(db, \"cities\"), { name: \"Tokyo\" })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:setDoc:*",
    matches: [
      "import { doc, setDoc } from \"firebase/firestore\"\nawait setDoc(doc(db, \"cities\", \"LA\"), { name: \"Los Angeles\" })",
    ],
    rejects: [
      "const setDoc = (...parts) => parts\nawait setDoc(doc(db, \"cities\", \"LA\"), { name: \"Los Angeles\" })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:updateDoc:*",
    matches: [
      "import { doc, updateDoc } from \"firebase/firestore\"\nawait updateDoc(doc(db, \"cities\", \"DC\"), { capital: true })",
    ],
    rejects: [
      "const updateDoc = (...parts) => parts\nawait updateDoc(doc(db, \"cities\", \"DC\"), { capital: true })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:deleteDoc:*",
    matches: [
      "import { deleteDoc, doc } from \"firebase/firestore\"\nawait deleteDoc(doc(db, \"cities\", \"DC\"))",
    ],
    rejects: [
      "const deleteDoc = (...parts) => parts\nawait deleteDoc(doc(db, \"cities\", \"DC\"))",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:getDoc:*",
    matches: [
      "import { doc, getDoc } from \"firebase/firestore\"\nconst snapshot = await getDoc(doc(db, \"cities\", \"SF\"))",
    ],
    rejects: [
      "const getDoc = (...parts) => parts\nconst snapshot = await getDoc(doc(db, \"cities\", \"SF\"))",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:getDocs:*",
    matches: [
      "import { collection, getDocs } from \"firebase/firestore/lite\"\nconst citySnapshot = await getDocs(collection(db, \"cities\"))",
    ],
    rejects: [
      "const getDocs = (...parts) => parts\nconst citySnapshot = await getDocs(collection(db, \"cities\"))",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:onSnapshot:*",
    matches: [
      "import { collection, onSnapshot } from \"firebase/firestore\"\nconst unsubscribe = onSnapshot(collection(db, \"cities\"), (snapshot) => { render(snapshot.docs) })",
    ],
    rejects: [
      "const onSnapshot = (...parts) => parts\nconst unsubscribe = onSnapshot(collection(db, \"cities\"), (snapshot) => { render(snapshot.docs) })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getAuth:*",
    matches: [
      "import { getAuth } from \"firebase/auth\"\nconst auth = getAuth(app)",
    ],
    rejects: [
      "const getAuth = (...parts) => parts\nconst auth = getAuth(app)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getAuth:*>call:verifyIdToken:*",
    matches: [
      "import { getAuth } from \"firebase-admin/auth\"\nconst decoded = await getAuth().verifyIdToken(idToken)",
    ],
    rejects: [
      "const auth = makeLocalRegistry()\nconst decoded = await auth.verifyIdToken(idToken)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "factory:getAuth:*>call:createUser:*",
    matches: [
      "import { getAuth } from \"firebase-admin/auth\"\nconst auth = getAuth()\nconst user = await auth.createUser({ email, password })",
    ],
    rejects: [
      "const auth = makeLocalRegistry()\nconst user = await auth.createUser({ email, password })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:signInWithEmailAndPassword:*",
    matches: [
      "import { signInWithEmailAndPassword } from \"firebase/auth\"\nconst credential = await signInWithEmailAndPassword(auth, email, password)",
    ],
    rejects: [
      "const signInWithEmailAndPassword = (...parts) => parts\nconst credential = await signInWithEmailAndPassword(auth, email, password)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:createUserWithEmailAndPassword:*",
    matches: [
      "import { createUserWithEmailAndPassword } from \"firebase/auth\"\nconst credential = await createUserWithEmailAndPassword(auth, email, password)",
    ],
    rejects: [
      "const createUserWithEmailAndPassword = (...parts) => parts\nconst credential = await createUserWithEmailAndPassword(auth, email, password)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:signOut:*",
    matches: [
      "import { signOut } from \"firebase/auth\"\nawait signOut(auth)",
    ],
    rejects: [
      "const signOut = (...parts) => parts\nawait signOut(auth)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:onAuthStateChanged:*",
    matches: [
      "import { onAuthStateChanged } from \"firebase/auth\"\nonAuthStateChanged(auth, (user) => { setUser(user) })",
    ],
    rejects: [
      "const onAuthStateChanged = (...parts) => parts\nonAuthStateChanged(auth, (user) => { setUser(user) })",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:uploadBytes:*",
    matches: [
      "import { ref, uploadBytes } from \"firebase/storage\"\nawait uploadBytes(ref(storage, \"images/photo.jpg\"), file)",
    ],
    rejects: [
      "const uploadBytes = (...parts) => parts\nawait uploadBytes(ref(storage, \"images/photo.jpg\"), file)",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:getDownloadURL:*",
    matches: [
      "import { getDownloadURL, ref } from \"firebase/storage\"\nconst url = await getDownloadURL(ref(storage, \"images/photo.jpg\"))",
    ],
    rejects: [
      "const getDownloadURL = (...parts) => parts\nconst url = await getDownloadURL(ref(storage, \"images/photo.jpg\"))",
    ],
  },
  {
    library: FIREBASE,
    patternKey: "call:deleteObject:*",
    matches: [
      "import { deleteObject, ref } from \"firebase/storage\"\nawait deleteObject(ref(storage, \"images/photo.jpg\"))",
    ],
    rejects: [
      "const deleteObject = (...parts) => parts\nawait deleteObject(ref(storage, \"images/photo.jpg\"))",
    ],
  },
]
