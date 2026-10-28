Say what this step does, and to what — "Throws when a line is out of stock", not "The stock check" and not the identifier. A bare noun tells a reader which code this is and nothing about why they are being shown it. The identifier is never the label: the node already carries the name of its code. Keep the same shape and tense on every node of one diagram.

A component drawn inside another is read inside its frame, so do not repeat the outer component in its label.

A node of an event, an effect, a memo or a callback inside a component, of a procedure of a router and of an action of a store is read beside the node around it, so say what this unit does on its own: "Applies the code when the form is submitted", "Stores the promo when the request succeeds". An event has a trigger label too, which says what the user does, so the node says what the handler does.
