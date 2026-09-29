A GitLab personal access token.

Stored in your operating system's keychain, never in a settings file.

**Getting one**

1. Go to **Preferences → Access tokens** on GitLab, or
   `https://gitlab.com/-/user_settings/personal_access_tokens`.
2. **Add new token**, give it a name and an expiry date.
3. Select the **`read_api`** scope. That is enough to read merge requests, their
   diffs and files at a commit. `api` also works and grants far
   more than Flight Plan needs.
4. Create it and paste it below.

**Self-managed**

Set the base URL below to your instance, for example
`https://gitlab.example.com`. Flight Plan appends `/api/v4` itself.

**Nested groups**

A project inside a group is named by its whole path — `group/subgroup/project` —
and Flight Plan reads that from your git remote. Nothing to configure.
