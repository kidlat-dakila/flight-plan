A GitHub personal access token, for a machine with no CLI.

The token is stored in your operating system's keychain, never in a settings
file and never in the folder your agent reads.

**Fine-grained token — preferred**

1. Go to **Settings → Developer settings → Personal access tokens → Fine-grained
   tokens** on GitHub.
2. **Generate new token**, and choose the repositories you review.
3. Under **Repository permissions**, set:
   - **Contents** — Read-only
   - **Pull requests** — Read-only
   - **Metadata** — Read-only (it is required and selects itself)
4. Generate it and paste it below.

**Classic token**

A classic token has no read-only option for code. To read a private repository it
needs the whole **`repo`** scope, which grants write access as well. Use
`public_repo` if you only review public repositories, and prefer a fine-grained
token wherever you can.

**Enterprise**

Set the base URL below to your server, for example `https://ghe.example.com`.
Flight Plan appends `/api/v3` itself.
