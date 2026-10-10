# Security Baseline

## Principles

- least privilege
- explicit tenant/company/workspace scope where applicable
- deny by default for privileged operations
- auditable changes for money, vehicle identity, ownership, consent and permissions
- no secrets in source control
- external webhook verification and replay protection
- idempotent integration ingestion

## Identity

ALSVID uses server-revocable authenticated sessions. The initial implementation issues a high-entropy bearer token, stores only its SHA-256 hash in PostgreSQL, expires sessions after 12 hours, and allows server-side revocation. The Next.js Internal Admin proxy keeps the bearer token in an HttpOnly, SameSite=Lax cookie rather than exposing it to browser JavaScript.

Passwords are stored as salted scrypt hashes. The bootstrap administrator password is accepted only through environment configuration/command input and is never committed to Git.

Authorization is permission/capability based rather than hard-coded UI role checks. Role templates are convenience bundles; permissions are the enforcement unit. Privileged Partner mutations and role changes are enforced in application services even if a client bypasses the UI.

Future production hardening includes invitation/reset flows, MFA, optional SSO/OIDC and deployment-level rate limiting.

## Sensitive data

Personal data access must be purpose-limited and logged where appropriate. Avoid unnecessary duplication of customer/contact details across domains.

Payment credentials and provider secrets must live in deployment secret stores/environment configuration, never database fields intended for general application reads.

## High-risk mutations

The following require audit evidence and stronger authorization:

- changing permissions/roles
- frame-number or vehicle-identity correction
- ownership correction/transfer override
- inventory adjustment
- payment allocation reversal
- finance document cancellation
- marketing consent/suppression override
- destructive data administration

The `audit.events` table is append-only and database triggers reject UPDATE and DELETE operations.

## AI

AI may summarize, classify, suggest and draft. It must not silently become the authority for money movement, legal consent, vehicle identity, entitlement, warranty approval or irreversible external communication. Human approval gates should be explicit where required.
