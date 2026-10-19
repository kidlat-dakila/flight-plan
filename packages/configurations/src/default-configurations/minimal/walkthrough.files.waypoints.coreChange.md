Mark the few waypoints that carry the change. One or two fragments: why this is
where the pull request does its work. Leave the field off every other waypoint.

Points at importance. Not a warning.

**Flag where behaviour changes**: new rule, decision code now makes differently,
data that now goes somewhere new, contract a caller now depends on.

**Leave off the plumbing**: value passed along, constant, comment, formatting,
styling, type-only edit, rename, test that restates code.

**Not a bug report.** Something wrong or fragile: a finding, on the same card.
Finding is never the reason for the flag. Only fragment you can write is about
what might break: write a finding, leave this off.

**Say why the card is central, against what the pull request is for.** "Rule
the pull request exists for: order now holds stock before card is charged. Other
cards in this file wire it in." Not "check this carefully", "core logic", "this
is complex".

**Keep it rare.** One to three in a pull request. Seldom more than one in a
file. Every card would carry it: none should.

Not a second reading. Reading: what code does. This: why it is the part to read.

Name code with `code:` links.
