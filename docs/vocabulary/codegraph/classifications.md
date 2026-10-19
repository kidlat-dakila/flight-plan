# Classifications

What a [code block](code-blocks.md) is for, read from the code it holds, and what a change to it does.

## Definition

A classification names the role a block plays: a page, a database operation, a webhook, a test. Its [type](block-types.md) says what shape the code has; its classification says what that code is for. A function that saves an order through an ORM is a `function` block classified `database-operation`. A function that returns markup is a `component` block classified `component`.

Every block carries two lists:

```ts
interface CodeBlock {
  classifications: CodeBlockClassification[]
  diffClassifications: CodeBlockClassification[]
}
```

| Field | What it holds |
|---|---|
| `classifications` | Every classification the block earns, with those of every block nested in it, in the order of the hierarchy. Never empty. |
| `diffClassifications` | The classifications the changed blocks among the block and its nested blocks earn, in the same order. Empty when nothing in the block changed. |

A component in which only an ORM write changed:

```tsx
export const OrderForm = ({ order }) => {
  const save = async () => {
    await prisma.order.create({ data: order })   // the only change
  }
  return <button onClick={save}>Save</button>
}
```

| Block | `classifications` | `diffClassifications` |
|---|---|---|
| `OrderForm` | `component`, `database-operation` | `database-operation` |
| The `prisma.order.create` call | `database-operation` | `database-operation` |
| `save` | `database-operation` | `database-operation` |

The primary classification of either list is its first entry. It is never stored: `primaryClassificationOf` in `@flightplan/configurations` reads it, so a Flight Plan saved before the hierarchy changed reads its primary in the order of today.

## The hierarchy

When a block earns several classifications, the one higher in this list is its primary. `CODE_BLOCK_CLASSIFICATIONS` in `packages/configurations/src/code-graph/code-blocks.ts` holds the list in this order, and reordering the hierarchy is reordering that array.

| Rank | Classification | What the block is |
|---|---|---|
| 1 | `test` | A test or a story |
| 2 | `build-and-infrastructure` | Code that builds, deploys or runs the app rather than being the app |
| 3 | `migration` | A change to the shape of the database |
| 4 | `page` | Code that renders on a visit to a path |
| 5 | `component` | Markup, or a function that returns it |
| 6 | `webhook` | A route a third party calls, which checks the sender's signature |
| 7 | `server-action` | A function the client calls as if it were local, which runs on the server |
| 8 | `api-route` | A route, a resolver or a middleware |
| 9 | `realtime` | A socket or a stream that stays connected and answers messages as they come |
| 10 | `queue-consumer` | The code that takes messages off a queue |
| 11 | `job` | Code that runs on a schedule |
| 12 | `command` | Code that runs when someone calls it from a command line |
| 13 | `database-operation` | A read or a write of a database or a cache |
| 14 | `data-model` | The definition of what is stored |
| 15 | `third-party-integration` | A call into an outside service's SDK: payments, email, messages, cloud storage, an LLM |
| 16 | `request` | A call to a server over the network |
| 17 | `form` | The state, validation and submission of a form |
| 18 | `validation` | A schema, or a check of a value against one |
| 19 | `store` | A state container shared across components |
| 20 | `state` | State, or a value derived from it |
| 21 | `auth` | A check of who the caller is, or what they may do |
| 22 | `security` | Hashing, signing, encryption and rate limiting |
| 23 | `file-io` | A read or a write of files or object storage on the server |
| 24 | `process-execution` | Code that starts another program or a worker thread |
| 25 | `publish` | Code that emits an event or puts a job on a queue |
| 26 | `navigation` | Code that sends the user to a page |
| 27 | `error-handling` | Code whose job is to turn a failure into a response or a fallback |
| 28 | `effect` | Code that runs after something else has run |
| 29 | `event` | Code that runs when something happens later |
| 30 | `context-and-wiring` | Code that makes something available to the code below it, or starts the app |
| 31 | `feature-flag` | A read of a value switched from outside the code |
| 32 | `config` | A read of an environment variable or a configuration value, or a configuration file |
| 33 | `storage` | A read or a write of what the browser keeps for the user |
| 34 | `telemetry` | Logging, analytics or error reporting |
| 35 | `i18n` | Text looked up by key for the user's language, or a translation file |
| 36 | `styling` | How something looks: a stylesheet, CSS-in-JS, a theme |
| 37 | `type` | A type declaration |
| 38 | `file` | A file no language reads and no location names |
| 39 | `logic` | What a block is when nothing else applies |

`test`, `build-and-infrastructure` and `migration` come first because the file they live in decides them, whatever code is inside. A classification that narrows another sits right above it, or it would never win: `page` above `component`, `webhook` and `server-action` above `api-route`, `queue-consumer` above `job`, `third-party-integration` above `request`, `form` above `validation`, `store` above `state`. `logic` is last because it is what a block is when nothing else applies.

## What a block earns by itself

`readOwnClassifications` in `packages/codegraph/src/code-blocks/classifications.ts` reads four signals of a block, and each may give it classifications.

### Its type

A `deleted` block is read by its `deletedType`, so a removed ORM write is still a database operation.

| Type | Classification |
|---|---|
| `component`, `render-root`, `render`, `render-condition`, `render-loop`, `render-event` | `component` |
| `route`, `resolver`, `middleware` | `api-route` |
| `data`, `transaction`, `cache` | `database-operation` |
| `data-fetch` from a library of the `orm`, `raw-sql` or `caching` category | `database-operation` |
| Any other `data-fetch`: a `GET` `fetch`, a GraphQL query, an `EventSource`, a call of an HTTP client | `request` |
| `request` | `request` |
| `validation` | `validation` |
| `state`, `derived` | `state` |
| `auth` | `auth` |
| `publish`, `navigation`, `feature-flag`, `config`, `storage`, `telemetry` | The classification of the same name |
| `effect`, `component-effect`, `effect-callback` | `effect` |
| `code-event` | `event` |
| `type-declaration` | `type` |
| `file` | `file`, when no location names the file |

### Its catalogue entry

What the [catalogue](catalogue.md) left on the block, in `catalogue`: when its callback runs, and the category of the library that says so.

| `catalogue.runs` | Classification |
|---|---|
| `page` | `page` |
| `route`, `resolver`, `middleware` | `api-route` |
| `job`, from a library of the `queues` category | `queue-consumer` |
| `job`, from any other library | `job` |
| `command` | `command` |
| `event` | `event` |
| `effect` | `effect` |

`catalogue.classifies` adds the classification a member of a class pattern or an export of a file pattern says: the `componentDidCatch` method of a class that extends React's `Component`, the default export of a Next.js `error.tsx`, are `error-handling`.

| Category of the library | Classification |
|---|---|
| `webhooks` | `webhook` |
| `realtime` | `realtime` |
| `forms` | `form` |
| `payments`, `email-and-messaging`, `cloud`, `ai`, `third-party-services` | `third-party-integration` |
| `security` | `security` |
| `file-io` | `file-io` |
| `processes` | `process-execution` |
| `error-handling` | `error-handling` |
| `dependency-injection` | `context-and-wiring` |
| `i18n` | `i18n` |
| `styling` | `styling` |

### The library calls inside it

A call into a library does not always become a block of a type of its own. `await stripe.paymentIntents.create(…)` is a `call` block, and `const hash = await bcrypt.hash(…)` is no block at all. So every pattern the catalogue matches in a file is a library use, with its range and the classification it earns: the `classifies` of the pattern when it says one, else the classification of its library's category. The use goes to the innermost block whose range holds it.

```ts
export const sendReceipt = async (user) => {
  const sent = await transporter.sendMail({ to: user.email })   // Nodemailer: third-party-services
  return sent
}
```

`sendReceipt` earns `third-party-integration` from the use inside it, and `request` from the `request` block `sendMail` makes.

A pattern says `classifies` when its role is not that of its whole library: the class an ORM's models extend is a `data-model`, and a call that verifies a webhook's signature is a `webhook` though its library is a payments SDK.

A library with a file of its own can add uses no pattern can say, with `readUses`. Express gives `error-handling` to a handler of four arguments it is handed, written in place or by name: `app.use((error, req, res, next) => …)`.

### Its card

| Card | Classification |
|---|---|
| Kind `store`, any part | `store` |
| Kind `route` or `router`, part `handler`, `middleware` or `controller`: the function a route names, in its file or another | `api-route` |
| Part `server-action` or `procedure` | `server-action` |
| Part `page` | `page` |

### Its file

A file's location can classify it before anything in it is read. The rules are in "Classification by file location". For a file a language reads, every block of the file earns what its location gives, beside what its code earns.

## What a block earns from inside it

A block earns its own classifications and those of every block nested in it, at any depth. What it calls does not count: `submit` calling `saveOrder` does not make `submit` a database operation. The call chain is [`chainContains`](code-blocks.md#what-the-chains-contain), not a classification.

The two lists are built in one pass over the blocks of a group, from the top blocks down:

| | `classifications` | `diffClassifications` |
|---|---|---|
| Counts | The block and every block nested in it | The block and every nested block that changed |
| A block counts as changed when | | Its `lineOfCodeDiffs` is not `null`: lines added, modified or deleted in it. A block that is only `affected` does not count, since that is the call chain reaching the change. |
| When the blocks counted earn nothing | `logic` | The primary classification of the block, which is `logic` for a block that earns nothing |
| When nothing changed | | Empty |

`diffClassifications` is always a subset of `classifications`. A component in which only a plain line changed has `diffClassifications` `component`: what changed is the component, and `logic` is not among what the component is.

`logic` is never handed up. A plain block inside a component gives its parent nothing, so a component is `component` and not `component`, `logic`.

## The kinds of change

The ten values of `DiffKind` that [`diffContains` and `chainContains`](code-blocks.md#what-the-diff-contains) hold are read from classifications, so the two cannot disagree. Each classification gives one kind:

| `DiffKind` | Classifications |
|---|---|
| `ui` | `page`, `component` |
| `route` | `api-route`, `webhook`, `server-action` |
| `data` | `database-operation` |
| `state` | `state`, `store` |
| `effect`, `event`, `auth`, `type`, `file` | The classification of the same name |
| `logic` | Every other classification |

`diffContains` maps the classifications each changed block earns by itself, and `chainContains` those of each block on a chain. A block inside a function that holds a `render-root` also counts as `ui`, and a block that earns nothing counts as `logic`. `diffKindOf` and `diffKindsOf` in `packages/codegraph/src/code-blocks/diff-contains.ts` give the kind of a classification and the kinds of a list.

## Classification by file location

Two kinds of rule read a file's path. When a file matches rules of several classifications, the hierarchy decides its primary: a compose file inside a test folder is `test` first.

A file no language reads stays one `file` block with nothing inside it, the way the codegraph keeps every such file. Its classification comes from these rules, and is `file` only when none matches.

### Named by the tool

The tool itself decides the name or the extension, and no project changes it. `TOOL_NAMED_LOCATIONS` in `classifications.ts` holds them.

| Classification | Rule |
|---|---|
| `build-and-infrastructure` | `Dockerfile`, `*.dockerfile`, `docker-compose.*`, `compose.yaml`, `compose.yml`, `.github/workflows/**`, `.gitlab-ci.yml`, `*.tf`, `*.tfvars`, `Makefile`, `*.config.*`, `tsconfig*.json`, `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `nx.json`, `project.json`, `pyproject.toml`, `requirements*.txt`, `poetry.lock` |
| `data-model` | `*.prisma` |
| `config` | `.env`, `.env.*` |
| `i18n` | `*.po`, `*.pot` |
| `styling` | `*.css`, `*.scss`, `*.sass`, `*.less` |

### Placed by the project

The project's own configuration says where the files live. A fixed `migrations/**` would miss a Knex project whose knexfile says `db/changes`, and catch a folder that only happens to be named `migrations`, so these locations are read from the configuration of each tool.

| Rule | What it means |
|---|---|
| Read from the tool's configuration | At the head commit the repository's configuration files are listed and read beside its manifests, in the same `blobs` call. `readRepositoryLocations` in `packages/codegraph/src/code-blocks/locations/` turns the manifests and those texts into rules, each a glob or a regular expression with the folder it holds in. |
| Only for a tool that is installed | A tool counts only where a manifest installs it, the way a file pattern of the catalogue is gated. A tool with no package, such as Docker Compose or Helm, always counts. |
| Each package with its own configuration | A tool is read in the folder of every manifest that installs it and of every manifest below one that does, so each package of a monorepo uses its own configuration. A package with no configuration of its own takes the tool's default, and the default of a folder above it leaves out the packages below that have their own. |
| The tool's own default when the configuration is silent | Prisma with no `migrations` setting still writes to `prisma/migrations`. A key the configuration does not set takes the default of the tool, and so does a configuration file that is not there. |
| Literal values only | A configuration written as code is parsed with its language, and only a value written out counts: text, a list of texts, a template whose holes become `*`, and a path built from fixed parts with `path.join`, `path.resolve` or a file URL of `import.meta.url`. A computed value is silent, so the default holds. |
| Declared in the catalogue | Each library says in `locations` which files hold its configuration, which keys hold the locations and how to read them. Test runners and migration tools that have no pattern are libraries for this alone. |

| Classification | Configuration read | The tool's default when silent |
|---|---|---|
| `test` | Vitest `test.include` (`vitest.config.*`, `vite.config.*`); Jest `testMatch`, `testRegex`, `roots` (`jest.config.*`, `"jest"` in `package.json`); Playwright `testDir`, `testMatch`; Cypress `e2e.specPattern`, `component.specPattern`; Storybook `stories` (`.storybook/main.*`); pytest `testpaths`, `python_files` (`pytest.ini`, `[tool.pytest.ini_options]` or `[tool.pytest]` in `pyproject.toml`, `[tool:pytest]` in `setup.cfg`, `[pytest]` in `tox.ini`) | Vitest `**/*.{test,spec}.?(c|m)[jt]s?(x)`; Jest `**/__tests__/**/*.?([mc])[jt]s?(x)` and `**/?(*.)+(spec|test).?([mc])[jt]s?(x)`; Playwright `**/*.@(spec|test).?(c|m)[jt]s?(x)` below its configuration; Cypress `cypress/e2e/**/*.cy.{js,jsx,ts,tsx}`, and `**/*.cy.{js,jsx,ts,tsx}` when component testing is configured; pytest `test_*.py`, `*_test.py` and `conftest.py`; the Django test runner `test*.py` |
| `migration` | Prisma `migrations.path` (`prisma.config.*`) or the folder of `schema` (`prisma.config.*`, `"prisma"` in `package.json`); Drizzle `out` (`drizzle.config.*`); Knex `migrations.directory`, at the top or under an environment (`knexfile.*`); TypeORM `migrations` (`ormconfig.*`, `data-source.*`); Sequelize `migrations-path` (`.sequelizerc`); MikroORM `migrations.path`, `migrations.pathTs` (`mikro-orm.config.*`); Alembic `script_location` (`alembic.ini`, `[tool.alembic]` in `pyproject.toml`); Django `MIGRATION_MODULES` and the apps of `INSTALLED_APPS` (`settings.py`) | Prisma `prisma/migrations`, Drizzle `drizzle`, Knex `migrations`, Sequelize `migrations`, MikroORM `migrations`, Alembic `alembic/versions`, Django `<app>/migrations` |
| `data-model` | The `schema` of Drizzle (`drizzle.config.*`), a file, a folder or a glob | None |
| `config` | dotenv's `config({ path })` in an entry file; node-config `NODE_CONFIG_DIR` (`.env`); Hydra's `@hydra.main(config_path=…)`; python-dotenv's `load_dotenv(dotenv_path)`; Dynaconf's `settings_files`; Django's `settings.py` itself | node-config `config/` |
| `i18n` | i18next `backend.loadPath` of its `init`; the messages next-intl's request config imports; the `include` of `@intlify/unplugin-vue-i18n` in `vite.config.*`; Lingui `catalogs.path`; Babel `babel.cfg` and the folders of `setup.cfg`; Flask-Babel `BABEL_TRANSLATION_DIRECTORIES`; fastapi-babel `BABEL_TRANSLATION_DIRECTORY`; Django `LOCALE_PATHS` and the apps of `INSTALLED_APPS` | i18next `public/locales/*/*.json`, next-intl `messages/` of the package, Lingui `locale/{locale}`, Flask-Babel `translations`, Django `<app>/locale` |
| `build-and-infrastructure` | The `build.dockerfile` of each Compose service, for a Dockerfile under another name; the `build.dockerfile` of a dev container; the folder of a dev container, of a Helm `Chart.yaml` and of a Kustomize `kustomization.yaml` | None |

A value is read the way its tool reads it: a Jest glob from the folder of its configuration with `<rootDir>` dropped, a Storybook glob from the `.storybook` folder, an Alembic folder with `%(here)s` dropped, a Django app as the folder of its module, so `orders.apps.OrdersConfig` is the app `orders`.

## Test files

A test or a story is never read: its code stays out of the graph, the journeys and the walkthroughs. Which files are tests comes from the test runners the repository installs and their configuration, as "Placed by the project" says, and from nothing else.

| A file a test runner names | It follows that |
|---|---|
| It is one unread `file` block classified `test`, when the diff changed it | The change shows in the review as the test that changed, with no code of it read |
| It is in no group of the files it imports, and joins none | A function its page and its test use is used from one place, when segments are found |
| It hands nothing over | A value a story hands to a component is not an origin of that value |
| It is not a top of a chain | No journey starts in a test |

A repository that installs no test runner has no test files: a `cart.test.ts` there is read as any other file.
