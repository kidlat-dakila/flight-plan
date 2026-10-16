import type { PatternFixture } from "@/catalogue/types"

const REDUX = "Redux"

export const reduxFixtures: readonly PatternFixture[] = [
  {
    library: REDUX,
    patternKey: "factory:configureStore:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })",
    ],
    rejects: [
      "const configureStore = (...parts) => parts\nconst store = configureStore({ reducer: { posts: postsReducer } })",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:configureStore:*>call:dispatch:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })\nstore.dispatch(postAdded(post))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.dispatch(postAdded(post))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:configureStore:*>call:getState:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })\nconst state = store.getState()",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nconst state = store.getState()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:configureStore:*>call:subscribe:*",
    matches: [
      "import { configureStore } from \"@reduxjs/toolkit\"\nconst store = configureStore({ reducer: { posts: postsReducer } })\nstore.subscribe(() => render(store.getState()))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.subscribe(() => render(store.getState()))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)",
    ],
    rejects: [
      "const createStore = (...parts) => parts\nconst store = createStore(rootReducer)",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*>call:dispatch:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)\nstore.dispatch(postAdded(post))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.dispatch(postAdded(post))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*>call:getState:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)\nconst state = store.getState()",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nconst state = store.getState()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createStore:*>call:subscribe:*",
    matches: [
      "import { createStore } from \"redux\"\nconst store = createStore(rootReducer)\nstore.subscribe(() => render(store.getState()))",
    ],
    rejects: [
      "const store = makeLocalRegistry()\nstore.subscribe(() => render(store.getState()))",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createSlice:*",
    matches: [
      "import { createSlice } from \"@reduxjs/toolkit\"\nconst postsSlice = createSlice({ name: \"posts\", initialState, reducers: { postAdded(state, action) { state.items.push(action.payload) } } })",
    ],
    rejects: [
      "const createSlice = (...parts) => parts\nconst postsSlice = createSlice({ name: \"posts\", initialState, reducers: { postAdded(state, action) { state.items.push(action.payload) } } })",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createReducer:*",
    matches: [
      "import { createReducer } from \"@reduxjs/toolkit\"\nconst counterReducer = createReducer({ value: 0 }, (builder) => { builder.addCase(increment, (state) => { state.value += 1 }) })",
    ],
    rejects: [
      "const createReducer = (...parts) => parts\nconst counterReducer = createReducer({ value: 0 }, (builder) => { builder.addCase(increment, (state) => { state.value += 1 }) })",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createEntityAdapter:*",
    matches: [
      "import { createEntityAdapter } from \"@reduxjs/toolkit\"\nconst booksAdapter = createEntityAdapter()",
    ],
    rejects: [
      "const createEntityAdapter = () => makeLocalRegistry()\nconst booksAdapter = createEntityAdapter()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createEntityAdapter:*>call:getSelectors:*",
    matches: [
      "import { createEntityAdapter } from \"@reduxjs/toolkit\"\nconst booksAdapter = createEntityAdapter()\nexport const { selectAll } = booksAdapter.getSelectors((state) => state.books)",
    ],
    rejects: [
      "const booksAdapter = makeLocalRegistry()\nexport const { selectAll } = booksAdapter.getSelectors((state) => state.books)",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createAsyncThunk:*",
    matches: [
      "import { createAsyncThunk } from \"@reduxjs/toolkit\"\nconst fetchUserById = createAsyncThunk(\"users/fetchById\", async (userId) => userAPI.fetchById(userId))",
    ],
    rejects: [
      "const createAsyncThunk = (...parts) => parts\nconst fetchUserById = createAsyncThunk(\"users/fetchById\", async (userId) => userAPI.fetchById(userId))",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:createSelector:*",
    matches: [
      "import { createSelector } from \"@reduxjs/toolkit\"\nconst selectVisiblePosts = createSelector([selectPosts, selectFilter], (posts, filter) => posts.filter(filter))",
    ],
    rejects: [
      "const createSelector = (...parts) => parts\nconst selectVisiblePosts = createSelector([selectPosts, selectFilter], (posts, filter) => posts.filter(filter))",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createListenerMiddleware:*",
    matches: [
      "import { createListenerMiddleware } from \"@reduxjs/toolkit\"\nconst listenerMiddleware = createListenerMiddleware()",
    ],
    rejects: [
      "const createListenerMiddleware = (...parts) => parts\nconst listenerMiddleware = createListenerMiddleware()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:createListenerMiddleware:*>call:startListening:*",
    matches: [
      "import { createListenerMiddleware } from \"@reduxjs/toolkit\"\nconst listenerMiddleware = createListenerMiddleware()\nlistenerMiddleware.startListening({ actionCreator: postAdded, effect: async (action, listenerApi) => { await save(action.payload) } })",
    ],
    rejects: [
      "const listenerMiddleware = makeLocalRegistry()\nlistenerMiddleware.startListening({ actionCreator: postAdded, effect: async (action, listenerApi) => { await save(action.payload) } })",
    ],
  },
  {
    library: REDUX,
    patternKey: "call:useSelector:*",
    matches: [
      "import { useSelector } from \"react-redux\"\nconst posts = useSelector((state) => state.posts.items)",
    ],
    rejects: [
      "const useSelector = (...parts) => parts\nconst posts = useSelector((state) => state.posts.items)",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:useDispatch:*",
    matches: [
      "import { useDispatch } from \"react-redux\"\nconst dispatch = useDispatch()",
    ],
    rejects: [
      "const useDispatch = (...parts) => parts\nconst dispatch = useDispatch()",
    ],
  },
  {
    library: REDUX,
    patternKey: "factory:useDispatch:*>called",
    matches: [
      "import { useDispatch } from \"react-redux\"\nconst dispatch = useDispatch()\ndispatch(postAdded(post))",
    ],
    rejects: [
      "const dispatch = makeLocalRegistry()\ndispatch(postAdded(post))",
    ],
  },
]
