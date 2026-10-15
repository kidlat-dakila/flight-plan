Write a caption for the diagram: what the reader is looking at, before they follow its lines. Two sentences at most.

- **The first sentence says what the diagram starts from.** Open with "This diagram shows how", name the page, the component, the job or the route the paths start at, and say what it does when it opens, loads or runs: `This diagram shows how the edit page loads an order and renders it in the form.` Use the verb of the code for what it does, such as renders, loads or requests, so that "shows" is not written twice.
- **The second sentence follows the user's actions.** The actions are the events on the diagram: a submit, a click, a pick, a typed value. Open with "It also shows what happens when the user", name the action as the user would, then say where its data ends up: the request it sends, the store it writes, the page it opens. `It also shows what happens when the user saves the order, and how the changed order reaches the API through updateOrder().`
- **Several actions.** Name them together, in the order the diagram draws them: `It also shows what happens when the user picks a customer, picks a product, types a quantity or submits the form.`
- **A path nobody clicks.** A request, a schedule or another system starts it: name that in place of the user. `It also shows what happens when a request reaches POST /orders, and how the order reaches the database.`
- **No action on the diagram.** Leave the second sentence out, and never write "It also shows" with nothing after it.
- **Shared code that other segments call.** Say what the diagram holds and what reaches it: `This diagram shows how the route table opens the order pages, and how each hook loads or sends orders through its request.`

Name where the data ends up, not the steps on the way: the labels and the descriptions of the nodes carry the steps, and the reader follows them on the board. Do not explain the change: the Context Section and the waypoints do.

| The diagram | Its caption |
|---|---|
| A page that loads a record and saves it | This diagram shows how the edit page loads an order and renders it in the form. It also shows what happens when the user saves the order, and how the changed order reaches the API through `updateOrder()`. |
| A page that creates a record | This diagram shows how the create page opens with an empty draft in the form. It also shows what happens when the user submits the form, and how the new order reaches the API through `createOrder()`. |
| A page with no action on its paths | This diagram shows how the orders list loads the orders and renders them in a table. |
