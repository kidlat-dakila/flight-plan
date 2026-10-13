# packages/codegraph/src/catalogue

What a call into a library means, as data: the shape of a pattern, one file per language and category of libraries, and a fixture for every pattern. Read [catalogue](../../../../docs/vocabulary/codegraph/catalogue.md) before changing anything here. The rules of [packages/codegraph/AGENTS.md](../../AGENTS.md) hold here too.

## Rules

- **The catalogue is data.** A library is one `CatalogueLibrary` exported from `libraries/<language>/<category>.ts`, the file of its `language` and its `category`, which exports the libraries of that category and nothing else. No function, no condition and no import of anything but the types. Patterns that two factories share are one constant in the file, as `EXPRESS_ROUTER_METHODS` in `libraries/javascript/framework.ts`.
- **A constant of one library starts with the name of the library.** `FLASK_VIEW` and `DJANGO_VIEW` are in one file, and so are `nextCallFixture` and `reactCallFixture`. A position that says nothing of a library, as `FIRST_ARGUMENT` and `EVERY_METHOD`, is written once at the top of the file.
- **A library has a name, its specifiers and the version of its documentation.** `name` is the name the library has in `LIBRARIES` of `src/data/libraries.ts`. `specifiers` holds every specifier its patterns are imported from, and is empty for the conventions of a repository. `documentedVersion` is the version of the documentation the patterns were written from. Adding a library is adding it to the file of its language and category, and one line in `libraries/index.ts`.
- **Every pattern has a fixture.** `fixtures/<language>/<category>.ts` exports the `PatternFixture`s of each library of the category as `<library>Fixtures`, one per pattern and one per method of a factory, each with code the pattern must match and code it must not. A fixture names its library by `library`, the name of the library. The fixture of a file pattern holds paths in place of code. The key of a pattern with `from` holds it after `@`, as `element:default@next/link:*`, and the key of a directive holds its text. What a factory makes when called has the key of the factory, then `>called`. `fixtures/index.ts` lists them in `BUILT_IN_FIXTURES`. A fixture is named by its `patternKey`, which `patternKeyOf` in `pattern-keys.ts` builds: the kind, the name or the glob, and the range of versions, `*` when there is none. A method of a factory has the key of its factory, then `>`, then its own.
- **A pattern is written from the documentation of the library, never from memory.** Use the `find-docs` skill for the library, and for each major version still in wide use. An argument position, an option key and what a version removed are what a pattern holds.
- **`versions` is for a position that means something else.** A slot that only exists in some versions needs no range, and neither do two shapes that cannot be confused. Two patterns with the same kind and name must have different ranges.
- **A route says its method.** A route slot, a decorator that runs a route and a route export of a file each need `method`, or `methodAt` when the call names it. There is one pattern per method, and `"*"` is every method.
- **A method of a factory is a call, a decorator, an element or a factory.** `@app.get` of FastAPI is a decorator in the `methods` of the factory `FastAPI`, `<ThemeContext.Provider>` an element in those of `createContext`, and `router.route(path)` a factory in those of `Router`. A factory named `default` is the default export.
- **A factory is a call or a `new`.** It has `slots` when what it is handed runs later, and `called` for what the value it makes is when the value is called or used as a tag, as the `sql` of `postgres`.
- **A class that extends an export is a `class` pattern.** `members` holds the methods of the class the library runs, and `methods` the calls on the class and on what is made from it. A member has no fixture of its own: the fixture of the class shows it.
- **`isOwnNode` is for a call that is an operation of its own inside one value.** `query` and `mutation` of `initTRPC.create` say it, so each procedure of a router is a node of a Journey Flow Diagram. `named-by.ts` carries it to the `catalogue` of the block of the call, and `journey-flow-diagram/node-blocks.ts` reads it. It is never on a slot.
- **`holdsOwnNodes` is for a slot whose callback returns the operations of a value.** The first argument of `create`, `createStore` and `persist` of Zustand say it, as the one constant `ZUSTAND_STORE_SLOTS`, so each function written under a key of the store is a node. `named-by.ts` carries it to the `catalogue` of the callback.
- **`makes: "data-fetch"` is for a call whose name says it reads.** A `GET` request, a query hook, a read of a database or of a service. A call that sends a read and a write alike keeps `data` or `request`, as `query` and `execute` of a SQL client and a `request` with `methodAt` do. What a factory or a class makes is never a `data-fetch`.
- **A prefix is `prefixAt`.** It is on a factory whose routes all share it, on a call that is handed a value with routes, and on a decorator of a class whose routes share it. A route below a factory with `prefixAt` needs no `pathAt`.
- **A place is a position, a key, `"last"`, `"rest"`, a path such as `"queries[].queryFn"`, `"0[].loader"` or `"resolvers.*.*"`, or a list of places.** A Python argument that is written by position or by name is a list, as `[0, "path"]`.
- **The files that are ignored are file patterns with `isIgnored`.** `libraries/javascript/testing.ts` and `libraries/python/testing.ts` hold the tests and the stories, as libraries with no specifier, and `code-blocks/ignored-files.ts` reads every such pattern.
- **A specifier is in one library of a language.** `jose` is a library in JavaScript and another in Python. `findLibrary` takes the language, and finds a library of any language without one.
- **A name is an export, or a member of one written with a dot**, as `cache.get` of `django.core.cache` and `default.get` of `axios`. A Python library lists each module its patterns are imported from as a specifier, as `django.urls` and `django.shortcuts`.
- **`from` is for a name several specifiers of the library export**, such as a default export. It must be one of the specifiers of the library.
- **A pattern lists only the slots whose name does not say when they run.** A key that starts with `on` and a capital letter is an event by the rule of the code, so `onSuccess` and `onError` are never listed.
- **`listCatalogueProblems` and `listFixtureProblems` say what is wrong, as sentences.** `library-problems.ts` reports a library with no name, no pattern, no category or no version of its documentation, a name or a specifier in two libraries, a pattern listed twice, a pattern that says nothing, a route or a page with no place for its path, a route with no method, an element or a class that says nothing, a route member of a class with no method, a factory with a page slot, a directive with no text, and a `from` that is no specifier of the library. `fixture-problems.ts` reports a pattern with no fixture, a fixture with no pattern, a fixture of a library that is not in the catalogue, and a fixture that lacks code to match or code to reject. `__tests__/built-in-catalogue.spec.ts` runs both over the built-in catalogue, so a library that breaks a rule fails the tests.
- **`matchSource` applies the patterns to a file.** `matching/match-source.ts` takes the text of a file, its language and the libraries, and gives one `PatternMatch` per pattern that matched: the key of the pattern, the range of what matched, what it makes, its slots with when each runs and its path, and the path, the prefix, the method and the event that are written out. `matchFilePath` matches the file patterns by path alone.
- **A match goes through the origin of a name.** `matching/origins.ts` follows a name to an export of a library or to a value a factory or a class made: through a declaration, a name taken apart, a subscript, a member, a call, an import of another file of the group, and the first argument of a callback in a slot that runs in place. A value with no origin matches nothing. `matching/match-sites.ts` tries the patterns at every call, decorator, element and class.
- **A language is a `SyntaxReader`.** `matching/javascript-reader.ts`, `python-reader.ts` and `vue-reader.ts` each say what an expression is, what a name is bound to, where the sites are and what is handed to one. Nothing else in `matching/` names a syntax node type.
- **A place is resolved in `matching/places.ts`.** A slot inside a list or under `*` keeps the records it is in, and `match-sites.ts` reads its path from them: the key named by the last key of `pathAt`, or the key of the property for `@key`. A function is never a path or a prefix.
- **Every fixture is run.** `listFixtureFailures` in `matching/fixture-failures.ts` says which pattern does not match its code and which matches the code it must not, and `matching/__tests__/built-in-fixtures.spec.ts` asserts there is none. `listUnshownPlaces` says which place a pattern names that none of its code has.
- **`makes: "state"` and `"derived"` are read by `code-blocks/languages/typescript/made-by.ts`** from call patterns, and by `named-by.ts` from every other match, such as what a factory makes when it is called. `code-blocks/value-origins.ts` reads the patterns that provide a value, with their `valueAt` and `keyAt`, and the call patterns that read one, with their `reads.keyAt`. Every other match reaches a block through `code-blocks/languages/typescript/named-by.ts`.
- **A proposed pattern is kept only when it matches.** `countPatternMatches` in `matching/count-matches.ts` counts how often each pattern matches over the files of a repository, and `checkProposedLibraries` in `proposed-patterns.ts` gives the patterns kept with their count and a sentence for each one refused because it matched nothing.
- **The entry exports what a caller needs, by name.** `src/index.ts` exports `BUILT_IN_LIBRARIES`, `findLibrary`, `matchSource`, `matchFilePath`, `countPatternMatches`, `checkProposedLibraries`, `listCatalogueProblems`, `patternKeyOf` and the types of a library and of a match. The fixtures and the readers stay inside the package.
- **A decorator that only names a method says something.** `@api_view(["GET"])` of Django REST framework names the methods of a view whose path is where it is registered, so it has `methodAt` and no `runs`.
- **An index page says `pathAt: []`.** It has no path of its own, and the empty list is the place that holds nothing.

## Add a library

1. Read the documentation of the library with the `find-docs` skill.
2. Write the library in `libraries/<language>/<category>.ts`, as one exported `CatalogueLibrary` named `<library>Library`. A new category is a new file.
3. Add it to `BUILT_IN_LIBRARIES` in `libraries/index.ts`.
4. Write its fixtures in `fixtures/<language>/<category>.ts`, exported as `<library>Fixtures`, and add them to `BUILT_IN_FIXTURES` in `fixtures/index.ts`.
5. Run `nx test codegraph`. `built-in-catalogue.spec.ts` names every pattern that has a problem or no fixture.

## Layout

```
types.ts             the shape of a library, a pattern, a slot and a fixture
pattern-keys.ts      the key that names a pattern, and the keys of a library
find-library.ts      a library by one of its specifiers, and the conventions of a repository
library-problems.ts  what is wrong with a library file
fixture-problems.ts  which patterns lack a fixture, and which fixtures lack code
proposed-patterns.ts which proposed patterns are kept, with how often each matched, and which are refused
matching/            the patterns applied to a file: readers per language, origins, places, sites, file globs, fixtures run, matches counted
libraries/           the libraries, one file per category in a folder per language, listed in index.ts
fixtures/            the fixtures of each library, in the same folders and files, listed in index.ts
```

## Verify

- `nx run-many -t eslint:lint typecheck test -p codegraph`
