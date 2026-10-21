export interface FaqEntry {
  readonly question: string
  readonly answer: string
}

export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    question: "Does my code leave my machine?",
    answer:
      "Flight Plan keeps every review in `~/.flightplan` and writes nothing into your repositories. It sends data in two cases only: to your forge when you comment or submit a review, and to a Claude artifact when you publish one. The coding agent you connect keeps working the way it always does.",
  },
  {
    question: "Do I need a coding agent?",
    answer:
      "Not to read a review. Flight Plan builds it from the code with no model, including the segments, the diagrams, the Change Overview and the files and lines of the walkthrough. What it can't do alone is explain each part of the change and find potential bugs. That's what your agent adds. Setup asks you to pick one, and Flight Plan calls on it only when you ask it to explain.",
  },
  {
    question: "Which coding agents does it work with?",
    answer:
      "Claude Code, Codex and Cursor. Flight Plan installs its review skill and MCP server for each one you pick. It can start Claude Code for you, and with any other agent you paste the prompt it gives you.",
  },
  {
    question: "Is it token-expensive?",
    answer:
      "Flight Plan builds the whole review before your agent starts, including the segments, the diagrams with their nodes and edges, the Change Overview and the files and lines of the walkthrough. It does that by parsing your code into abstract syntax trees (ASTs) with tree-sitter, on your machine, and calls no model itself. Your agent only writes the text and the findings, and only for the parts you pick. Ask it about one line or one code block and it writes just that. It spends no tokens on the structure or on tracing who calls what, because the ASTs already show which functions call which. When Flight Plan starts Claude Code, it runs as an interactive session on your subscription.",
  },
  {
    question: "Where do my pull requests need to live?",
    answer:
      "Anywhere git can reach them. By default Flight Plan reads the branches in your checkout with plain git, with no token and no network. Connect GitHub, GitLab or Bitbucket, including GitHub Enterprise, self-managed GitLab and Bitbucket Data Center, to review their pull requests, comment and submit reviews.",
  },
  {
    question: "Which languages does it understand?",
    answer: "TypeScript, JavaScript and JSX, Python and Vue.",
  },
  {
    question: "Can my agent leave part of the change out?",
    answer:
      "No. Flight Plan works out which files, lines and callers a review covers from the code itself, and the agent only writes the prose. The Code Walkthrough also says how many changed files it covers.",
  },
  {
    question: "Do I need a pull request to use it?",
    answer:
      "No. You can review any branch, including your own work before you open a pull request. When the branch gets a pull request, its Flight Plan moves there.",
  },
  {
    question: "Can I share a review?",
    answer:
      "Yes. Put it in the pull request description, or have your agent publish it as a Claude artifact. That's one page with the whole review and the code it shows, which anyone can read without installing Flight Plan.",
  },
  {
    question: "How is it licensed?",
    answer:
      "Under the Functional Source License (FSL-1.1-ALv2). You can use, change and share it for any purpose except offering a competing commercial product or service. Two years after each release, that version is also available under Apache 2.0.",
  },
]
