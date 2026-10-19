Set the impact type to what the change does to this file. What each value means
is given with its option.

Judge the logic, not the types. A call that no longer type-checks is the
compiler's to report, and is never the reason for a value here.

Leave it unset when nobody has assessed the file. There is no `unknown`. A file
of the change takes no impact type at all.

`breaks` and `behaviour-changes` never travel alone: write the `impactReason` in the
same call. `unaffected` is written alone, with no reason.
