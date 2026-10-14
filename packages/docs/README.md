# Docs

The user documentation of Flight Plan, as Markdown. The site renders it under `/docs/` with Starlight.

- `src/` holds the pages. A file's path is its address: `src/setup/agents.md` is `/docs/setup/agents/`, and an `index.md` is its folder's page.
- `media/` holds the clips and stills the pages show, in a light and a dark version.

Each page starts with Starlight frontmatter: a `title` and a `description`. The sidebar lists every page by its slug in `apps/site/astro.config.mts`, so a new page needs an entry there.

A page shows a clip or a still with an image link to its light file, such as `![Submitting a review](../../../media/submit-review-light.webm)`. `apps/site/docs/captures.md` explains how the site turns it into a light and a dark copy, and how to record the media again.
