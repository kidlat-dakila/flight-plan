Mark the few waypoints that carry the change: the cards a reviewer should spend
their time on. Write one or two sentences saying why this is where the pull
request does its work, and leave the field off every other waypoint.

A pull request mixes the change with what the change drags along: a value
threaded through three signatures, an import moved, a class renamed, a style
adjusted, a type widened so the new code compiles, a fixture updated. A reviewer
with forty cards and an hour has to know which three are the change. That is
all this flag says. It points at importance. It is not a warning.

**Flag the waypoint where the behaviour changes**: the new rule, the decision
the code now makes differently, the data that now goes somewhere it did not,
the contract a caller will now depend on. **Leave it off the plumbing**: wiring
that passes the new value along, a constant, a comment, formatting and styling,
a type-only edit, a rename, a test that restates the code.

**It is not a bug report.** Something you believe is wrong, or could go wrong,
is a finding — a `bug` or a `risk` — on the same card. A card can carry both,
and a finding is never the reason for the flag. If the only sentence you can
write is about what might break, you are writing a finding, so write one and
leave this off.

**Say why the card is central, against what the pull request is for.** "This is
the rule the pull request exists for: an order now holds its stock before the
card is charged, and the other cards in this file wire it in." Not "check this
carefully", "core logic" or "this is complex": they name no reason, and a
reviewer can see complexity without being told.

**It works by contrast, so keep it rare.** One to three in a pull request is
usual, and seldom more than one in a file. If every card would carry it, none
should: the flag has nothing left to point at.

It is not a second reading. The reading says what the code does; this says why
it is the part to read.

Name code the way every other field does, with `code:` links.
