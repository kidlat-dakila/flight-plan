Write the surface this code has after the change, including what stays
compatible. State it so a dependent can be judged without opening the file:
"takes `{ productId, quantity, held? }[]`; the stock check counts held units as
taken; callers that omit `held` see no change". State the surface, not the
insides.
