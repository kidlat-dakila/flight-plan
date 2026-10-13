Write for an engineer who has never opened this repository and does not know its language or its
libraries well. They do not know this codebase's words, its product, or where anything is used.
They opened this code by hovering its name, and they see the code under your words.

Each item is handed out with its `kind`:

- `codebase` is code of this repository.
- `library` is one name the code imports from a library, such as `useState` of `react`.
- `language` is a name the file neither imports nor declares, such as `Promise` or `Math`. Flight
  Plan assumes it is part of the language or of where the code runs.

**A function's description is three sentences, in this order:**

> `{name}({arguments})` is a {what it is} that {what it does}. It takes {each argument, with its
> type and what it stands for} and returns {what the caller gets back}. It is used in {where} to
> {what that code needs it for}.

> `validateAge(user)` is a validation function that checks whether a user is old enough to hold an
> account. It takes `user: User`, the person signing up or editing their details, and returns
> `true` when their `birthDate` is 18 years ago or more, and `false` otherwise. It is used in the
> [registration page](code:src/account/RegisterPage.tsx#RegisterPage) and the
> [update profile page](code:src/account/ProfilePage.tsx#ProfilePage) to stop the form before it
> is sent.

- **What it is**: the kind of function, in two or three words: a utility function, a validation
  function, a query function, an event handler, a hook, a server procedure.
- **What it does**: its job, in plain words. One clause. Do not walk the lines.
- **Arguments**: write each as `name: type`, then what the value stands for in the product. Say
  which can be left out.
- **Returns**: the type and what it stands for. Say what comes back when there is nothing to
  return, and what it throws, where it does either.
- **Where it is used**: the pages, routes or functions that call it, by the name a user of the
  product would know them. Take them from the `usedBy` the item is handed out with, not from a
  guess. Where many use it, name three and say how many there are.
- **What for**: the reason that code needs it, in the product's words.

**A component's description is the same three sentences**, with its props for the arguments, what
it shows for what it returns, and the pages that render it for where it is used:

> `<EmptyState />` is a placeholder component that a page shows in place of a list when there is
> nothing to list. It takes `title: string`, the main line, `hint: string`, a smaller line under it
> that can be left out, and `action: { label, href }`, an optional button. It is used in the
> [orders page](code:src/orders/OrdersPage.tsx#OrdersPage), the
> [basket page](code:src/checkout/BasketPage.tsx#BasketPage) and 6 other pages to tell a shopper
> why the page is empty and what to do next.

**Any other code** (a type, a constant, a table, a router) is two sentences: what it is and what
it holds, then where it is used and what for.

> `orderRouter` is a router that holds every operation a browser can ask the server to do with
> orders: `list`, `byId` and `cancel`. It is used in
> [`appRouter`](code:src/server/api/root.ts#appRouter), the one list of every router of the
> server, so that the page can call `api.order.list`.

**A `library` item's description says what the name is and what it does**, in one sentence or
two. Say what kind of thing it is and which library it comes from, then what it does when it is
called, rendered or used. Do not say where this codebase uses it: one description is shown in
every file that imports the name.

> `useState(initialValue)` is a React hook that keeps a value of a component between its renders.
> It returns the value and a function that sets it, and setting it draws the component again.

> `z` is the entry of Zod, a library that checks the shape of a value while the program runs.
> `z.object({ … })` describes an object, and its `parse(value)` returns the value when it has that
> shape and throws when it does not.

**A `language` item's description is the same two sentences**: what the name is, then what it
does. Say whether it belongs to the language, to the browser or to the server it runs on.

> `Promise` is JavaScript's value for a result that arrives later. `Promise.all(list)` waits for
> every promise in the list and returns their results in the same order, and fails when one fails.

> `localStorage` is the browser's store of text that stays after the page is closed.
> `localStorage.getItem(key)` returns the text saved under a key, or `null` when there is none.

- Write a call as it is written in the language of the code, with the arguments a caller passes.
- Say what the name does, not how it is built.
- Where the name holds several functions, describe the ones this code calls. The item is handed
  out with no code, so read the change for how the name is used.
- A name that is not of the language at all, because a tool or a framework puts it there, is
  described as what it is. Say which tool provides it.

**Define a word of this codebase the first time you use it**, in one clause: a hold, a line, a
procedure. The reader has not met it.

**Link every place it is used that the artifact holds.** A link resolves only inside the files the
artifact holds. Name code in any other file in backticks, with its path.

**Describe the code as it is, not the pull request.** The description is shown wherever the name
is hovered, in any file, so do not say _here_, _this caller_ or _the change_. A waypoint's reading
says what the author changed.

**Explain a library or the language in its own item, and nowhere else.** In the description of a
`codebase` item, name a library function the code is built on and say in one clause what this code
gets from it. The reader can hover that name for the rest.

**Do not tell history the code does not show.** Why it was built and what it replaced are not in
the code, unless a comment or a name says so.
