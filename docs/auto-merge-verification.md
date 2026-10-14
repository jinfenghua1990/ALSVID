# Unattended merge verification

This documentation-only PR exercises the automatic merge controller without manually enabling auto-merge. The expected sequence is PR CI (`verify` and `containers`), controller merge of the exact tested commit, dispatched main CI, and the existing exact-commit Production release gate.

No application code or cloud configuration is changed by this verification PR.
