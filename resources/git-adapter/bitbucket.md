A Bitbucket Cloud API token, alongside your Atlassian account email.

The token is stored in your operating system's keychain. The email is an
ordinary setting, since it is not a secret.

Bitbucket no longer accepts app passwords, so a previously saved one has stopped
working. Create an API token instead.

**Getting one**

1. On Bitbucket, open **Account settings → Security** and choose **Create and
   manage API tokens**.
2. **Create API token with scopes**, name it and set an expiry date.
3. Choose **Bitbucket** as the app.
4. Tick these scopes, and no others:
   - `read:repository:bitbucket`
   - `read:pullrequest:bitbucket`
5. Create it, copy it once — Bitbucket shows it only that one time — and paste it
   below.
6. Put your Atlassian account email, not your Bitbucket username, in the field
   beside it. It is listed under **Email aliases** in your Bitbucket personal
   settings.

**Read-only**

Flight Plan reads Bitbucket and does not write to it. Nothing is published to a
pull request from here.

**Bitbucket Data Center and Server**

Not supported yet. Those use a different API from Bitbucket Cloud, and Flight
Plan says so rather than half-working against it.
