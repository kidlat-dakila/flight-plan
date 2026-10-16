import type { PatternFixture } from "@/catalogue/types"

const declaringLocally = (name: string, code: string): string => `const ${name} = (...parts) => parts\n${code}`

const NEXT = "Next.js"

const NEXT_ROUTER_KEY = "factory:useRouter:*"

const NEXT_COOKIES_KEY = "factory:cookies:*"

const nextImporting = (specifier: string, name: string, code: string): string => `import { ${name} } from "${specifier}"\n${code}`

const nextFileFixture = (glob: string, versions: string, matches: readonly string[], rejects: readonly string[]): PatternFixture => ({
  library: NEXT,
  patternKey: `file:${glob}:${versions}`,
  matches,
  rejects,
})

const nextCallFixture = (specifier: string, name: string, call: string): PatternFixture => ({
  library: NEXT,
  patternKey: `call:${name}:*`,
  matches: [nextImporting(specifier, name, call)],
  rejects: [declaringLocally(name, call)],
})

const nextMethodFixture = (factoryKey: string, made: string, local: string, name: string, call: string): PatternFixture => ({
  library: NEXT,
  patternKey: `${factoryKey}>call:${name}:*`,
  matches: [`${made}\n${call}`],
  rejects: [`${local}\n${call}`],
})

const NEXT_ROUTER = nextImporting("next/navigation", "useRouter", "const router = useRouter()")

const NEXT_LOCAL_ROUTER = "const router = makeLocalHistory()"

const NEXT_COOKIE_STORE = nextImporting("next/headers", "cookies", "const cookieStore = await cookies()")

const NEXT_LOCAL_COOKIE_STORE = "const cookieStore = new Map()"

export const nextFixtures: readonly PatternFixture[] = [
  nextFileFixture(
    "{app,src/app}/**/page.{js,jsx,ts,tsx}",
    "*",
    ["app/page.tsx", "app/users/[id]/page.tsx", "src/app/(shop)/cart/page.jsx"],
    ["app/users/layout.tsx", "app/users/route.ts", "components/page.tsx"],
  ),
  nextFileFixture(
    "{app,src/app}/**/{layout,template,loading,error,not-found,global-error}.{js,jsx,ts,tsx}",
    "*",
    ["app/layout.tsx", "app/dashboard/loading.tsx", "src/app/not-found.jsx", "app/global-error.tsx"],
    ["app/dashboard/page.tsx", "components/layout.tsx"],
  ),
  nextFileFixture(
    "{app,src/app}/**/route.{js,ts}",
    "*",
    ["app/api/users/route.ts", "src/app/api/users/[id]/route.js"],
    ["app/api/users/page.tsx", "lib/route.ts"],
  ),
  nextFileFixture(
    "{pages,src/pages}/api/**/*.{js,ts}",
    "*",
    ["pages/api/users.ts", "src/pages/api/users/[id].js"],
    ["pages/users.tsx", "app/api/users/route.ts"],
  ),
  nextFileFixture(
    "{pages,src/pages}/**/[!_]*.{js,jsx,ts,tsx}",
    "*",
    ["pages/index.tsx", "src/pages/users/[id].jsx", "pages/404.js"],
    ["pages/_app.tsx", "pages/_document.tsx", "app/users/page.tsx", "components/users.tsx"],
  ),
  nextFileFixture("{middleware,src/middleware}.{js,ts}", "*", ["middleware.ts", "src/middleware.js"], ["lib/middleware.ts", "proxy.ts"]),
  nextFileFixture("{proxy,src/proxy}.{js,ts}", ">=16", ["proxy.ts", "src/proxy.js"], ["lib/proxy.ts", "middleware.ts"]),
  {
    library: NEXT,
    patternKey: "directive:use server:*",
    matches: [
      "\"use server\"\n\nexport async function createUser(formData) {\n  await saveUser(formData)\n}",
      "export default async function PostPage() {\n  async function createPost(formData) {\n    \"use server\"\n    await savePost(formData)\n  }\n  return <form action={createPost} />\n}",
    ],
    rejects: [
      "\"use client\"\n\nexport async function createUser(formData) {\n  await saveUser(formData)\n}",
      "export async function createUser(formData) {\n  await saveUser(formData, \"use server\")\n}",
    ],
  },
  {
    library: NEXT,
    patternKey: "element:default@next/link:*",
    matches: [
      "import Link from \"next/link\"\nconst link = <Link href=\"/about\">About</Link>",
      "import NextLink from \"next/link\"\nconst link = <NextLink href={\"/blog/\" + slug} />",
    ],
    rejects: [
      "import Link from \"next/image\"\nconst link = <Link href=\"/about\" />",
      "const Link = (props) => <a {...props} />\nconst link = <Link href=\"/about\">About</Link>",
    ],
  },
  nextCallFixture("next/navigation", "redirect", "redirect(\"/posts\")"),
  nextCallFixture("next/navigation", "permanentRedirect", "permanentRedirect(\"/profile/\" + username)"),
  { library: NEXT, patternKey: NEXT_ROUTER_KEY, matches: [NEXT_ROUTER, nextImporting("next/router", "useRouter", "const router = useRouter()")], rejects: [declaringLocally("useRouter", "const router = useRouter()")] },
  nextMethodFixture(NEXT_ROUTER_KEY, NEXT_ROUTER, NEXT_LOCAL_ROUTER, "push", "router.push(\"/dashboard\")"),
  nextMethodFixture(NEXT_ROUTER_KEY, NEXT_ROUTER, NEXT_LOCAL_ROUTER, "replace", "router.replace(\"/login\")"),
  nextCallFixture("next/server", "after", "after(async () => { await logVisit(path) })"),
  nextCallFixture("next/cache", "revalidatePath", "revalidatePath(\"/posts\")"),
  nextCallFixture("next/cache", "revalidateTag", "revalidateTag(\"username\", \"max\")"),
  nextCallFixture("next/cache", "unstable_cache", "const getCachedUser = unstable_cache(async () => getUser(userId), [userId], { tags: [\"users\"] })"),
  { library: NEXT, patternKey: NEXT_COOKIES_KEY, matches: [NEXT_COOKIE_STORE], rejects: [declaringLocally("cookies", "const cookieStore = await cookies()")] },
  nextMethodFixture(NEXT_COOKIES_KEY, NEXT_COOKIE_STORE, NEXT_LOCAL_COOKIE_STORE, "get", "cookieStore.get(\"name\")"),
  nextMethodFixture(NEXT_COOKIES_KEY, NEXT_COOKIE_STORE, NEXT_LOCAL_COOKIE_STORE, "set", "cookieStore.set(\"name\", \"Delba\")"),
  nextMethodFixture(NEXT_COOKIES_KEY, NEXT_COOKIE_STORE, NEXT_LOCAL_COOKIE_STORE, "delete", "cookieStore.delete(\"name\")"),
]
