import type { PatternFixture } from "@/catalogue/types"

const OCTOKIT = "Octokit"

export const octokitFixtures: readonly PatternFixture[] = [
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })",
    ],
    rejects: [
      "const Octokit = (...parts) => parts\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:request:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nawait octokit.request(\"POST /repos/{owner}/{repo}/issues\", { owner, repo, title })",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nawait octokit.request(\"POST /repos/{owner}/{repo}/issues\", { owner, repo, title })",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:paginate:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nconst issues = await octokit.paginate(\"GET /repos/{owner}/{repo}/issues\", { owner, repo })",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nconst issues = await octokit.paginate(\"GET /repos/{owner}/{repo}/issues\", { owner, repo })",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:graphql:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nconst { viewer } = await octokit.graphql(\"query { viewer { login } }\")",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nconst { viewer } = await octokit.graphql(\"query { viewer { login } }\")",
    ],
  },
  {
    library: OCTOKIT,
    patternKey: "factory:Octokit:*>call:create:*",
    matches: [
      "import { Octokit } from \"octokit\"\nconst octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })\nawait octokit.rest.issues.create({ owner, repo, title })",
    ],
    rejects: [
      "const octokit = makeLocalRegistry()\nawait octokit.rest.issues.create({ owner, repo, title })",
    ],
  },
]

const YOUTUBE_JS = "YouTube.js"

export const youtubeJsFixtures: readonly PatternFixture[] = [
  {
    library: YOUTUBE_JS,
    patternKey: "factory:Innertube.create:*",
    matches: [
      "import { Innertube } from \"youtubei.js\"\nconst youtube = await Innertube.create()",
    ],
    rejects: [
      "const Innertube = makeLocalRegistry()\nconst youtube = await Innertube.create()",
    ],
  },
]
