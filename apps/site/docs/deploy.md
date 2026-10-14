# Deploying the site

The site is deployed to Vercel from GitHub Actions. Vercel never builds the source: the workflow builds the site with the repository's own toolchain and uploads the finished files.

## The workflow

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`.

| Job | When | What it does |
|---|---|---|
| `checks` | Pull requests and pushes to `main` | `nx affected -t eslint:lint typecheck test`, against the merge base of a pull request or the previous commit of a push. A change that reaches the site builds it, because `site:typecheck` depends on `site:build`. |
| `deploy-site` | Pushes to `main`, after `checks` passes | Runs `nx run site:vercel-output` and deploys the result to production with `vercel deploy --prebuilt --prod`. |

Both jobs use pnpm 12.9.1 and Node 24, like the release workflow. Vercel's own builds support pnpm up to version 10, which is why the site is built in GitHub Actions.

## The Vercel output

`site:vercel-output` builds the site and lays it out in Vercel's Build Output API format:

```text
dist/apps/site-vercel/.vercel/output/
  config.json   copied from apps/site/vercel/config.json
  static/       the whole of dist/apps/site
```

`apps/site/vercel/config.json` serves every file as it is, and answers any other address with `404.html` and a 404 status. To look at the output before a deploy, run the target and open `dist/apps/site-vercel/.vercel/output/static/`.

## Setting up the Vercel project

The workflow needs a Vercel project and three repository secrets.

1. Create the project from the command line, so it is not connected to the Git repository. A connected project would also build every push on Vercel.

   ```bash
   npx vercel@64.1.0 login
   ```

   ```bash
   npx vercel@64.1.0 project add flight-plan-site
   ```

2. Find its ids. Linking an empty folder writes them to `.vercel/project.json` as `orgId` and `projectId`:

   ```bash
   mkdir -p /tmp/flight-plan-site-link && cd /tmp/flight-plan-site-link && npx vercel@64.1.0 link --yes --project flight-plan-site && cat .vercel/project.json
   ```

3. Create a token under Vercel's Account Settings → Tokens, scoped to the team that owns the project.

4. Add the three secrets to the GitHub repository:

   ```bash
   gh secret set VERCEL_TOKEN
   ```

   ```bash
   gh secret set VERCEL_ORG_ID
   ```

   ```bash
   gh secret set VERCEL_PROJECT_ID
   ```

The deploy job runs in the GitHub environment `production`, which GitHub creates on the first run. A custom domain is set on the Vercel project, under Settings → Domains.
