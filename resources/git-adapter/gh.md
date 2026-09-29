The GitHub CLI, which is already signed in on most machines.

Nothing to paste and no token to store. Flight Plan runs `gh` in your repository
and sees exactly what you can see.

**Getting it**

1. Install it from [cli.github.com](https://cli.github.com), or with your package
   manager — `brew install gh`, `winget install GitHub.cli`, `apt install gh`.
2. Run `gh auth login` in a terminal and follow the prompts.
3. Come back and press Refresh.

**Checking it**

`gh auth status` says which account you are signed in as. If Flight Plan says the
CLI is not installed while your terminal disagrees, the CLI is probably on a
login shell's `PATH` and not on the one VS Code inherited.

**Enterprise**

`gh auth login --hostname ghe.example.com` signs in to a GitHub Enterprise
server. Set the base URL below to the same host.
