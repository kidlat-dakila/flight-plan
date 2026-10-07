import { edgeOf, entryPointsOf, frameFromEntry, frameOf, frameTo, journeyOf, pathsOf, type Repository } from "./journey-repository"

const ADD_USER_PAGE = [
  "import { addUser } from \"./addUser\"",
  "import { UserForm } from \"./UserForm\"",
  "",
  "export const Page = () => {",
  "  const { data, status, execute } = addUser()",
  "",
  "  return <UserForm onSubmit={execute} formData={data} status={status} />",
  "}",
]

const DRILLED_SAVE: Repository = {
  "src/review-page.tsx": [
    "import { Editor } from \"./editor\"",
    "import { saveReview } from \"./reviews\"",
    "",
    "export const ReviewPage = () => <Editor onSave={saveReview} />",
  ],
  "src/editor.tsx": [
    "import { SaveButton } from \"./save-button\"",
    "",
    "export const Editor = ({ onSave }) => <SaveButton onSave={onSave} />",
  ],
  "src/save-button.tsx": ["export const SaveButton = (props) => <button onClick={props.onSave}>Save</button>"],
  "src/reviews.ts": ["export const saveReview = () => {", "  return store.save() // diff", "}"],
}

const usersPage = (changedFunction: string): Repository => ({
  "src/users-page.tsx": [
    "import { loadUsers } from \"./loadUsers\"",
    "import { removeUser } from \"./removeUser\"",
    "",
    "export const UsersPage = () => {",
    "  const users = loadUsers()",
    "",
    "  const handleDelete = (id) => {",
    "    removeUser(id)",
    "  }",
    "",
    "  return <button onClick={() => handleDelete(users[0].id)}>Delete</button>",
    "}",
  ],
  "src/loadUsers.ts": ["export const loadUsers = () => {", `  return api.get("/users")${changedFunction === "removeUser" ? "" : " // diff"}`, "}"],
  "src/removeUser.ts": ["export const removeUser = (id) => {", `  return api.delete(id)${changedFunction === "loadUsers" ? "" : " // diff"}`, "}"],
})

const hookPage = (changedFunction: string): Repository => ({
  "src/users-page.tsx": [
    "import { useMutation, useQuery } from \"@tanstack/react-query\"",
    "import { fetchUsers } from \"./fetchUsers\"",
    "import { removeUser } from \"./removeUser\"",
    "",
    "export const UsersPage = () => {",
    "  const query = useQuery({ queryKey: [\"users\"], queryFn: fetchUsers })",
    "  const mutation = useMutation({ mutationFn: removeUser })",
    "",
    "  return (",
    "    <>",
    "      <UserList users={query.data} />",
    "      <button onClick={() => mutation.mutate(1)}>Delete</button>",
    "    </>",
    "  )",
    "}",
  ],
  "src/fetchUsers.ts": ["export const fetchUsers = () => {", `  return api.get("/users")${changedFunction === "fetchUsers" ? " // diff" : ""}`, "}"],
  "src/removeUser.ts": ["export const removeUser = (id) => {", `  return api.delete(id)${changedFunction === "removeUser" ? " // diff" : ""}`, "}"],
})

describe("generateJourneyFlowDiagram", () => {
  describe("the paths of a change", () => {
    it("stops a path at the change and leaves out the code that uses its result", () => {
      const flow = journeyOf({
        "src/page.tsx": ADD_USER_PAGE,
        "src/UserForm.tsx": ["export const UserForm = (props) => <form onSubmit={props.onSubmit}><input name=\"firstName\" /></form>"],
        "src/addUser.ts": ["export const addUser = () => {", "  return useMutation(postUser) // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → Page", "Page → addUser (changed)"])
    })

    it("leaves out what a changed encapsulation calls after its changed line", () => {
      const flow = journeyOf({
        "src/page.tsx": [
          "import { loadUsers } from \"./loadUsers\"",
          "import { UserList } from \"./UserList\"",
          "",
          "export const Page = () => {",
          "  const users = loadUsers({ activeOnly: true }) // diff",
          "",
          "  return <UserList users={users} />",
          "}",
        ],
        "src/loadUsers.ts": ["export const loadUsers = (options) => api.get(options)"],
        "src/UserList.tsx": ["export const UserList = ({ users }) => <ul>{users.length}</ul>"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → Page (changed)"])
    })

    it("draws new code together with the code that wires it in", () => {
      const flow = journeyOf({
        "src/addUser.ts": ["export const addUser = () => {", "  return useMutation(postUser) // diff", "}"],
        "src/page.tsx": ADD_USER_PAGE.map((line) => (line.startsWith("  ") ? `${line} // diff` : line)),
        "src/UserForm.tsx": [
          "export const UserForm = (props) => {",
          "  const handleOnSubmit = () => {",
          "    props.onSubmit() // diff",
          "  }",
          "",
          "  return <form onSubmit={handleOnSubmit}><input name=\"firstName\" /></form> // diff",
          "}",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user submits the form] → UserForm (changed)",
        "[A user visits the page] → Page (changed)",
        "Page (changed) → addUser (changed)",
        "Page (changed) → UserForm (changed)",
      ])
    })

    it("keeps an unchanged node that does work between two changes", () => {
      const flow = journeyOf({
        "src/routes/index.ts": ["import { postOrder } from \"./orders\"", "", "router.post(\"/orders\", postOrder)"],
        "src/routes/orders.ts": [
          "import { placeOrder } from \"../placeOrder\"",
          "",
          "export const postOrder = async (request) => {",
          "  const order = parseOrder(request.body) // diff",
          "  return placeOrder(order)",
          "}",
        ],
        "src/placeOrder.ts": [
          "import { totalOf } from \"./totalOf\"",
          "",
          "export const placeOrder = async (order) => {",
          "  await reserveStock(order)",
          "  return save({ ...order, total: totalOf(order) })",
          "}",
        ],
        "src/totalOf.ts": ["export const totalOf = (order) => roundOnce(sum(order.lines)) // diff"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[POST /orders] → postOrder (changed)",
        "placeOrder → totalOf (changed)",
        "postOrder (changed) → placeOrder",
      ])
    })

    it("draws changes that are not connected as separate paths, each with its own entry point", () => {
      const flow = journeyOf({
        "src/routes/index.ts": [
          "import { getHealth } from \"./health\"",
          "import { postOrder } from \"./orders\"",
          "",
          "router.post(\"/orders\", postOrder)",
          "router.get(\"/health\", getHealth)",
        ],
        "src/routes/orders.ts": ["export const postOrder = async (request) => {", "  return save(request.body) // diff", "}"],
        "src/routes/health.ts": ["export const getHealth = () => ({ status: \"ok\", version }) // diff"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[GET /health] → getHealth (changed)", "[POST /orders] → postOrder (changed)"])
    })

    it("draws every path to shared code and the changed node once", () => {
      const flow = journeyOf({
        "src/cart-page.tsx": ["import { formatPrice } from \"./formatPrice\"", "", "export const CartPage = () => <span>{formatPrice(cart.total)}</span>"],
        "src/product-page.tsx": [
          "import { formatPrice } from \"./formatPrice\"",
          "",
          "export const ProductPage = () => <span>{formatPrice(product.price)}</span>",
        ],
        "src/formatPrice.ts": ["export const formatPrice = (cents) => {", "  return String(cents / 100) // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → CartPage",
        "[A user visits the page] → ProductPage",
        "CartPage → formatPrice (changed)",
        "ProductPage → formatPrice (changed)",
      ])
      expect(flow?.nodes.filter((node) => node.kind === "declaration" && node.isChanged)).toHaveLength(1)
    })

    it("gives no flow to a change that touches only types", () => {
      expect(journeyOf({ "src/user.ts": ["export interface User {", "  id: string", "  nickname?: string // diff", "}"] })).toBeNull()
    })

    it("gives no flow to a change that touches only an import", () => {
      const flow = journeyOf({
        "src/server.ts": ["import { rateLimit } from \"./rate-limit\" // diff", "", "export const start = () => listen()"],
        "src/rate-limit.ts": ["export const rateLimit = () => null"],
      })

      expect(flow).toBeNull()
    })

    it("does not cross from the client to the server", () => {
      const flow = journeyOf({
        "src/users-page.tsx": [
          "export const UsersPage = () => {",
          "  const handleAdd = async (user) => {",
          "    await fetch(\"/api/users\", { method: \"POST\", body: JSON.stringify(user) }) // diff",
          "  }",
          "",
          "  return <form onSubmit={handleAdd}><input name=\"firstName\" /></form>",
          "}",
        ],
        "src/routes/users.ts": ["import { createUser } from \"../createUser\"", "", "router.post(\"/api/users\", createUser)"],
        "src/createUser.ts": ["export const createUser = async (request) => {", "  return save(request.body) // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user submits the form] → UsersPage (changed)", "[POST /api/users] → createUser (changed)"])
    })
  })

  describe("entry points", () => {
    it("names a visit when the change runs in the render body of a page", () => {
      expect(pathsOf(journeyOf(usersPage("loadUsers")))).toStrictEqual(["[A user visits the page] → UsersPage", "UsersPage → loadUsers (changed)"])
    })

    it("names the user action when the change runs in a handler on a built-in element", () => {
      expect(pathsOf(journeyOf(usersPage("removeUser")))).toStrictEqual(["[A user clicks Delete] → UsersPage", "UsersPage → removeUser (changed)"])
    })

    it("draws a visit and an action of one component as two paths through one node", () => {
      const flow = journeyOf(usersPage("both"))

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Delete] → UsersPage",
        "[A user visits the page] → UsersPage",
        "UsersPage → loadUsers (changed)",
        "UsersPage → removeUser (changed)",
      ])
    })

    it("names the route of a page that sits in a route table, with the paths above it", () => {
      const flow = journeyOf({
        "src/main.tsx": ["import { router } from \"./router\"", "", "createRoot(root).render(<RouterProvider router={router} />)"],
        "src/router.tsx": [
          "import { CartPage } from \"./cart\"",
          "import { CatalogPage } from \"./catalog\"",
          "import { Layout } from \"./layout\"",
          "",
          "export const router = createBrowserRouter([",
          "  {",
          "    path: \"/shop\",",
          "    element: <Layout />,",
          "    children: [",
          "      { index: true, element: <CatalogPage /> },",
          "      { path: \"cart\", element: <CartPage /> },",
          "    ],",
          "  },",
          "])",
        ],
        "src/layout.tsx": ["export const Layout = () => <main>Shop</main> // diff"],
        "src/catalog.tsx": ["export const CatalogPage = () => <ul>Products</ul> // diff"],
        "src/cart.tsx": ["export const CartPage = () => <ul>Lines</ul> // diff"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits /shop] → CatalogPage (changed)",
        "[A user visits /shop] → Layout (changed)",
        "[A user visits /shop/cart] → CartPage (changed)",
      ])
    })

    it("names the route of a page handed to a route element and to a file route", () => {
      const flow = journeyOf({
        "src/routes.tsx": ["import { HomePage } from \"./home\"", "", "export const AppRoutes = () => <Route path=\"/home\" element={<HomePage />} />"],
        "src/home.tsx": ["export const HomePage = () => <main>Home</main> // diff"],
        "src/settings.tsx": [
          "const SettingsPage = () => <main>Settings</main> // diff",
          "",
          "export const Route = createFileRoute(\"/settings\")({ component: SettingsPage })",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits /home] → HomePage (changed)", "[A user visits /settings] → SettingsPage (changed)"])
    })

    it("names the click of a handler declared in a component when the change covers the lines around it", () => {
      const flow = journeyOf({
        "src/main.tsx": ["import { CartLine } from \"./CartLine\"", "", "createRoot(root).render(<CartLine />)"],
        "src/CartLine.tsx": [
          "export const CartLine = ({ item }) => {",
          "  const remove = useRemove() // diff",
          " // diff",
          "  function handleRemove() { // diff",
          "    if (window.confirm(\"Remove it?\")) remove(item.id) // diff",
          "  } // diff",
          " // diff",
          "  return <button onClick={handleRemove}>Remove</button>",
          "}",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user clicks Remove] → CartLine (changed)", "[A user visits the page] → CartLine (changed)"])
    })

    it("names an API call with its method and path", () => {
      const flow = journeyOf({
        "src/routes/users.ts": ["import { createUser } from \"../createUser\"", "", "router.post(\"/users\", createUser)"],
        "src/createUser.ts": [
          "export const createUser = async (request) => {",
          "  const user = parseUser(request.body)",
          "  await sendWelcome(user) // diff",
          "  return save(user)",
          "}",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual(["[POST /users] → createUser (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["api-call: POST /users"])
    })

    it("treats a hook as an encapsulation its component calls", () => {
      const flow = journeyOf({
        "src/home.tsx": [
          "import { useUsers } from \"./useUsers\"",
          "",
          "export const Home = () => {",
          "  const users = useUsers()",
          "",
          "  return <ul>{users.length}</ul>",
          "}",
        ],
        "src/useUsers.ts": ["export const useUsers = () => {", "  return useQuery({ queryKey: [\"users\"], queryFn: fetchActiveUsers }) // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → Home", "Home → useUsers (changed)"])
    })

    it("says new code nothing uses is not used yet", () => {
      const flow = journeyOf({ "src/exportUsers.ts": ["export const exportUsers = () => {", "  return toCsv(users) // diff", "}"] })

      expect(pathsOf(flow)).toStrictEqual(["[Not used yet] → exportUsers (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["unused: Not used yet"])
    })

    it("ends the climb at a context and draws the encapsulation that hands the function to it", () => {
      const flow = journeyOf({
        "src/app.tsx": [
          "import { saveReview } from \"./reviews\"",
          "",
          "export const App = () => (",
          "  <SaveContext.Provider value={saveReview}>",
          "    <ReviewPage />",
          "  </SaveContext.Provider>",
          ")",
        ],
        "src/reviews.ts": ["export const saveReview = () => {", "  return store.save() // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[Reached through a context] → App", "App → saveReview (changed)"])
      expect(entryPointsOf(flow)).toStrictEqual(["boundary: Reached through a context"])
    })

    it("names a visit when the result of a hook the function is handed to is read in the render body", () => {
      expect(pathsOf(journeyOf(hookPage("fetchUsers")))).toStrictEqual(["[A user visits the page] → UsersPage", "UsersPage → fetchUsers (changed)"])
    })

    it("names the user action when the result of a hook the function is handed to is called from a handler", () => {
      expect(pathsOf(journeyOf(hookPage("removeUser")))).toStrictEqual(["[A user clicks Delete] → UsersPage", "UsersPage → removeUser (changed)"])
    })

    it("marks a connection through the results of a hook as an assumed value", () => {
      const edge = edgeOf(journeyOf(hookPage("removeUser")), "UsersPage", "removeUser")

      expect([edge?.kind, edge?.certainty]).toStrictEqual(["value", "assumed"])
    })
  })

  describe("changes outside any encapsulation", () => {
    const serverLines = [
      "import { rateLimit } from \"./rate-limit\" // diff",
      "",
      "const app = createApp()",
      "",
      "app.use(rateLimit({ perMinute: 60 })) // diff",
    ]

    it("gives a changed bare statement a node for the top level of its file", () => {
      const flow = journeyOf({ "src/server.ts": serverLines, "src/rate-limit.ts": ["export const rateLimit = (options) => limiterOf(options)"] })

      expect(pathsOf(flow)).toStrictEqual(["[The app starts] → src/server.ts, top level (changed)"])
    })

    it("lists the changed statements as the frame of a top level node", () => {
      const flow = journeyOf({ "src/server.ts": serverLines, "src/rate-limit.ts": ["export const rateLimit = (options) => limiterOf(options)"] })

      expect(frameOf(flow, "top level")).toStrictEqual([

        "5: app.use(rateLimit({ perMinute: 60 })) (changed)",

      ])
    })

    it("climbs from a changed module-level value to the code that reads it", () => {
      const flow = journeyOf({
        "src/limits.ts": ["export const MAX_RETRIES = 5 // diff"],
        "src/retry.ts": ["import { MAX_RETRIES } from \"./limits\"", "", "export const retry = (run) => {", "  return attempt(run, MAX_RETRIES)", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[Not used yet] → retry", "retry → MAX_RETRIES (changed)"])
    })
  })

  describe("folding", () => {
    it("folds an unchanged encapsulation that only wraps a call into the edge", () => {
      const flow = journeyOf({
        "src/UserForm.tsx": [
          "export const UserForm = (props) => {",
          "  const [firstName, setFirstName] = useState(\"\")",
          "",
          "  const handleOnSubmit = () => {",
          "    props.onSubmit({ firstName })",
          "  }",
          "",
          "  return <button onClick={handleOnSubmit} />",
          "}",
        ],
        "src/page.tsx": [
          "import { addUser } from \"./addUser\"",
          "import { UserForm } from \"./UserForm\"",
          "",
          "export const Page = () => {",
          "  const handleSubmit = (newUser) => addUser(newUser)",
          "",
          "  return <UserForm onSubmit={handleSubmit} />",
          "}",
        ],
        "src/addUser.ts": ["export const addUser = (user) => {", "  return api.post(user) // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks the button] → UserForm",
        "UserForm → addUser (changed) through Page.handleSubmit",
      ])
    })

    it("folds every component a prop is drilled through and keeps the one the user acts on", () => {
      expect(pathsOf(journeyOf(DRILLED_SAVE))).toStrictEqual([
        "[A user clicks Save] → SaveButton",
        "SaveButton → saveReview (changed) through Editor.onSave, ReviewPage",
      ])
    })

    it("draws a changed encapsulation even when it only forwards", () => {
      const flow = journeyOf({
        ...DRILLED_SAVE,
        "src/editor.tsx": [
          "import { SaveButton } from \"./save-button\"",
          "",
          "export const Editor = ({ onSave }) => <SaveButton onSave={onSave} variant=\"primary\" /> // diff",
        ],
      })

      expect(pathsOf(flow)).toContain("Editor (changed) → saveReview (changed) through ReviewPage")
      expect(pathsOf(flow)).toContain("SaveButton → Editor (changed)")
      expect(pathsOf(flow)).toContain("[A user clicks Save] → SaveButton")
    })

    it("follows a prop the component takes apart inside its body", () => {
      const flow = journeyOf({
        ...DRILLED_SAVE,
        "src/editor.tsx": [
          "import { SaveButton } from \"./save-button\"",
          "",
          "export const Editor = (props) => {",
          "  const { onSave: save } = props",
          "",
          "  return <SaveButton onSave={save} />",
          "}",
        ],
        "src/save-button.tsx": [
          "export const SaveButton = (props) => {",
          "  const { onSave } = props",
          "",
          "  return <button onClick={onSave}>Save</button>",
          "}",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Save] → SaveButton",
        "SaveButton → saveReview (changed) through Editor.onSave, ReviewPage",
      ])
    })

    it("follows a prop the component keeps in a variable of its own", () => {
      const flow = journeyOf({
        ...DRILLED_SAVE,
        "src/save-button.tsx": [
          "export const SaveButton = (props) => {",
          "  const save = props.onSave",
          "  const handleClick = save",
          "",
          "  return <button onClick={handleClick}>Save</button>",
          "}",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Save] → SaveButton",
        "SaveButton → saveReview (changed) through Editor.onSave, ReviewPage",
      ])
    })

    it("draws a handed-over function with a value edge", () => {
      expect(edgeOf(journeyOf(DRILLED_SAVE), "SaveButton", "saveReview")?.kind).toBe("value")
    })

    it("keeps an encapsulation that does more than forward", () => {
      const flow = journeyOf({
        ...DRILLED_SAVE,
        "src/review-page.tsx": [
          "import { Editor } from \"./editor\"",
          "import { saveReview } from \"./reviews\"",
          "",
          "export const ReviewPage = () => (",
          "  <Editor",
          "    onSave={() => {",
          "      saveReview()",
          "      closeDialog()",
          "    }}",
          "  />",
          ")",
        ],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user clicks Save] → SaveButton",
        "ReviewPage → saveReview (changed)",
        "SaveButton → ReviewPage through Editor.onSave",
      ])
    })

    it("folds a top-level function that only wraps a call", () => {
      const flow = journeyOf({
        "src/routes.ts": ["import { loadUsers } from \"./loadUsers\"", "", "export const getUsers = async (request) => {", "  const users = await loadUsers()", "  return ok(users)", "}"],
        "src/loadUsers.ts": ["import { fetchUsers } from \"./fetchUsers\"", "", "export const loadUsers = () => fetchUsers()"],
        "src/fetchUsers.ts": ["export const fetchUsers = () => {", "  return db.users.all() // diff", "}"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[Not used yet] → getUsers", "getUsers → fetchUsers (changed) through loadUsers"])
    })
  })

  describe("rendering logic", () => {
    const homeLines = [
      "import { EmptyWarning } from \"./EmptyWarning\"",
      "import { UserList } from \"./UserList\"",
      "",
      "export const Home = () => {",
      "  const users = useUsers()",
      "",
      "  if (users.length === 0) return <EmptyWarning />",
      "",
      "  return <UserList users={users} />",
      "}",
    ]

    it("labels the edge to a rendered component with the condition it is rendered under", () => {
      const flow = journeyOf({
        "src/home.tsx": homeLines,
        "src/EmptyWarning.tsx": ["export const EmptyWarning = () => <p>No users yet</p> // diff"],
        "src/UserList.tsx": ["export const UserList = ({ users }) => <ul>{users.length}</ul> // diff"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → Home",
        "Home → EmptyWarning (changed) (if users.length === 0)",
        "Home → UserList (changed)",
      ])
    })

    it("draws only the branch that leads to a change", () => {
      const flow = journeyOf({
        "src/home.tsx": homeLines,
        "src/EmptyWarning.tsx": ["export const EmptyWarning = () => <p>No users yet</p>"],
        "src/UserList.tsx": ["export const UserList = ({ users }) => <ul>{users.length}</ul> // diff"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → Home", "Home → UserList (changed)"])
    })

    it("labels a component rendered once per item of a list", () => {
      const flow = journeyOf({
        "src/list.tsx": [
          "import { Row } from \"./Row\"",
          "",
          "export const List = ({ users }) => (",
          "  <ul>",
          "    {users.map((user) => <Row key={user.id} user={user} />)}",
          "  </ul>",
          ")",
        ],
        "src/Row.tsx": ["export const Row = ({ user }) => <li>{user.name}</li> // diff"],
      })

      expect(pathsOf(flow)).toContain("List → Row (changed) (for each of users)")
    })

    it("labels both arms of a conditional expression", () => {
      const flow = journeyOf({
        "src/gate.tsx": [
          "import { Dashboard } from \"./Dashboard\"",
          "import { SignIn } from \"./SignIn\"",
          "",
          "export const Gate = ({ user }) => (user ? <Dashboard /> : <SignIn />)",
        ],
        "src/Dashboard.tsx": ["export const Dashboard = () => <main>Hello</main> // diff"],
        "src/SignIn.tsx": ["export const SignIn = () => <form>Sign in</form> // diff"],
      })

      expect(pathsOf(flow)).toStrictEqual([
        "[A user visits the page] → Gate",
        "Gate → Dashboard (changed) (if user)",
        "Gate → SignIn (changed) (otherwise)",
      ])
    })

    it("lists a branch that renders only built-in elements among the lines of its component", () => {
      const flow = journeyOf({
        "src/home.tsx": [
          "import { UserList } from \"./UserList\"",
          "",
          "export const Home = () => {",
          "  const users = useUsers()",
          "",
          "  if (users.length === 0) {",
          "    return <p className=\"warning\">No users yet</p> // diff",
          "  }",
          "",
          "  return <UserList users={users} />",
          "}",
        ],
        "src/UserList.tsx": ["export const UserList = ({ users }) => <ul>{users.length}</ul>"],
      })

      expect(pathsOf(flow)).toStrictEqual(["[A user visits the page] → Home (changed)"])
      expect(frameOf(flow, "Home")).toStrictEqual([
        "4: const users = useUsers()",
        "6: if (users.length === 0) {",
        "7: return <p className=\"warning\">No users yet</p> (changed)",
      ])
    })
  })

  describe("the frame of a node", () => {
    const flow = journeyOf({
      "src/routes/index.ts": ["import { postUser } from \"./users\"", "", "router.post(\"/users\", postUser)"],
      "src/routes/users.ts": [
        "import { createUser } from \"../createUser\"",
        "",
        "export const postUser = async (request) => {",
        "  const input = await request.json()",
        "  if (!input.email) {",
        "    return badRequest()",
        "  }",
        "  const user = await createUser(input)",
        "  return created(user)",
        "}",
      ],
      "src/createUser.ts": [
        "export const createUser = async (input) => {",
        "  const user = parseUser(input)",
        "  if (await exists(user.email)) {",
        "    throw new Conflict()",
        "  }",
        "  await sendWelcome(user) // diff",
        "  return save(user)",
        "}",
      ],
    })

    it("lists the lines an unchanged node steps through up to where the path leaves it", () => {
      expect(frameOf(flow, "postUser")).toStrictEqual([
        "4: const input = await request.json()",
        "5: if (!input.email) {",
        "8: const user = await createUser(input)",
      ])
    })

    it("lists the lines a changed node steps through up to its changed lines and marks them", () => {
      expect(frameOf(flow, "createUser")).toStrictEqual([
        "2: const user = parseUser(input)",
        "3: if (await exists(user.email)) {",
        "6: await sendWelcome(user) (changed)",
      ])
    })

    it("lists every line of a statement that spans several lines when all of it is new", () => {
      const added = journeyOf({
        "src/main.tsx": ["import { OrderRow } from \"./OrderRow\"", "", "createRoot(root).render(<OrderRow />)"],
        "src/OrderRow.tsx": [
          "export function OrderRow({ order }) { // diff",
          "  return ( // diff",
          "    <li> // diff",
          "      <span>{order.status}</span> // diff",
          "    </li> // diff",
          "  ) // diff",
          "} // diff",
        ],
      })

      expect(frameOf(added, "OrderRow")).toStrictEqual([
        "2: return ( (changed)",
        "3: <li> (changed)",
        "4: <span>{order.status}</span> (changed)",
        "5: </li> (changed)",
        "6: ) (changed)",
      ])
    })

    it("steps into the elements of a return down to the changed line, and no further", () => {
      const rendered = journeyOf({
        "src/main.tsx": ["import { OrderRow } from \"./OrderRow\"", "", "createRoot(root).render(<OrderRow />)"],
        "src/OrderRow.tsx": [
          "export function OrderRow({ order }) {",
          "  return (",
          "    <li>",
          "      <span>{order.status}</span> // diff",
          "    </li>",
          "  )",
          "}",
        ],
      })

      expect(frameOf(rendered, "OrderRow")).toStrictEqual(["2: return (", "3: <li>", "4: <span>{order.status}</span> (changed)"])
    })

    it("gives an edge the lines its node steps through up to that hand-over, and no further", () => {
      expect(frameTo(flow, "postUser", "createUser")).toStrictEqual([
        "4: const input = await request.json()",
        "5: if (!input.email) {",
        "8: const user = await createUser(input)",
      ])
    })

    it("stops the frame of a changed node at its changed lines, before a later hand-over", () => {
      const both = journeyOf({
        "src/routes.ts": ["import { postOrder } from \"./postOrder\"", "", "router.post(\"/orders\", postOrder)"],
        "src/postOrder.ts": [
          "import { placeOrder } from \"./placeOrder\"",
          "",
          "export const postOrder = async (request) => {",
          "  const order = parseOrder(request.body) // diff",
          "  audit(order)",
          "  return placeOrder(order)",
          "}",
        ],
        "src/placeOrder.ts": ["export const placeOrder = (order) => {", "  return save(order) // diff", "}"],
      })

      expect(frameOf(both, "postOrder")).toStrictEqual(["4: const order = parseOrder(request.body) (changed)"])
      expect(frameTo(both, "postOrder", "placeOrder")).toStrictEqual([
        "4: const order = parseOrder(request.body) (changed)",
        "5: audit(order)",
        "6: return placeOrder(order)",
      ])
    })

    describe("in a component", () => {
      const filter = journeyOf({
        "src/main.tsx": ["import { StatusFilter } from \"./StatusFilter\"", "", "createRoot(root).render(<StatusFilter />)"],
        "src/StatusFilter.tsx": [
          "import { Chip } from \"./Chip\"",
          "import { useFilterStore } from \"./store\"",
          "export function StatusFilter() {",
          "  const setStatus = useFilterStore((state) => state.setStatus)",
          "",
          "  function handleReset() {",
          "    track(\"reset\")",
          "    setStatus(null)",
          "  }",
          "",
          "  return (",
          "    <nav>",
          "      <h2>Status</h2>",
          "      <button onClick={handleReset}>",
          "        All",
          "      </button>",
          "      {STATUSES.map((option) => (",
          "        <button key={option} onClick={() => setStatus(option)}>",
          "          Only",
          "        </button>",
          "      ))}",
          "      <Chip />",
          "      <footer>Done</footer>",
          "    </nav>",
          "  )",
          "}",
        ],
        "src/Chip.tsx": ["export const Chip = () => <span>chip</span> // diff"],
        "src/store.ts": [
          "export const useFilterStore = create((set) => ({",
          "  status: null,",
          "  setStatus: (status) => set({ status }), // diff",
          "}))",
        ],
      })

      it("gives the frame of a click the element the user acts on and the handler it runs, not the whole render", () => {
        expect(frameFromEntry(filter, "A user clicks All")).toStrictEqual([
          "6: function handleReset() {",
          "7: track(\"reset\")",
          "8: setStatus(null)",
          "9: }",
          "14: <button onClick={handleReset}>",
          "15: All",
          "16: </button>",
        ])
      })

      it("gives each click of one component its own element", () => {
        expect(frameFromEntry(filter, "A user clicks Only")).toStrictEqual([
          "18: <button key={option} onClick={() => setStatus(option)}>",
          "19: Only",
          "20: </button>",
        ])
      })

      it("steps through the elements above a rendered component and the ones before it, and stops at it", () => {
        expect(frameTo(filter, "StatusFilter", "Chip")).toStrictEqual([
          "4: const setStatus = useFilterStore((state) => state.setStatus)",
          "6: function handleReset() {",
          "11: return (",
          "12: <nav>",
          "13: <h2>Status</h2>",
          "14: <button onClick={handleReset}>",
          "15: All",
          "16: </button>",
          "17: {STATUSES.map((option) => (",
          "18: <button key={option} onClick={() => setStatus(option)}>",
          "19: Only",
          "20: </button>",
          "22: <Chip />",
        ])
      })
    })

    it("steps into a function declared inside the node when the path goes through it", () => {
      expect(frameOf(journeyOf(usersPage("removeUser")), "UsersPage")).toStrictEqual([
        "5: const users = loadUsers()",
        "7: const handleDelete = (id) => {",
        "8: removeUser(id)",
      ])
    })
  })

  describe("the flow", () => {
    it("names the flow after its changed nodes and shortens a long list", () => {
      const names = ["first", "second", "third", "fourth", "fifth"]
      const flow = journeyOf({ "src/steps.ts": names.map((name) => `export const ${name} = () => run() // diff`) })

      expect(flow?.title).toBe("first, second, third +2 more")
      expect(flow?.id).toBe("journey:src/steps.ts#first")
    })

    it("says a changed code node is added when every line of it is new, and not when only some are", () => {
      const flow = journeyOf({
        "src/steps.ts": [
          "export const first = () => { // diff",
          "  return run() // diff",
          "} // diff",
          "export const second = () => {",
          "  return run() // diff",
          "}",
        ],
      })
      const declarations = flow?.nodes.flatMap((node) => (node.kind === "declaration" ? [[node.declaration, node.isChanged, node.isAdded]] : []))

      expect(declarations).toStrictEqual([["first", true, true], ["second", true, false]])
    })

    it("gives no flow when nothing changed", () => {
      expect(journeyOf({ "src/steps.ts": ["export const first = () => run()"] })).toBeNull()
    })

    it("stores a code node with its file, its name and no written words", () => {
      const flow = journeyOf({ "src/exportUsers.ts": ["export const exportUsers = () => {", "  return toCsv(users) // diff", "}"] })

      expect(flow?.nodes).toStrictEqual([
        { kind: "entry-point", id: "entry:src/exportUsers.ts#exportUsers:Not used yet", trigger: "unused", label: "Not used yet", description: null },
        {
          kind: "declaration",
          id: "src/exportUsers.ts#exportUsers",
          path: "src/exportUsers.ts",
          declaration: "exportUsers",
          isChanged: true,
          isAdded: false,
          category: "logic",
          label: null,
          description: null,
          frameLines: [{ line: 2, text: "  return toCsv(users)", isChanged: true }],
        },
      ])
      expect(flow?.edges).toStrictEqual([
        {
          from: "entry:src/exportUsers.ts#exportUsers:Not used yet",
          to: "src/exportUsers.ts#exportUsers",
          kind: "trigger",
          certainty: "proven",
          through: [],
          condition: null,
          frameLines: [],
        },
      ])
    })
  })
})
