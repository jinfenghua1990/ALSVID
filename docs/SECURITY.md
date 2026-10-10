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

Use short-lived authenticated sessions/tokens with server-side revocation capability. Authorization is permission/capability based rather than hard-coded UI role checks.

Initial role templates may include Admin, Operations, Engineering, Finance, Dealer User, Service User and Read Only, but permissions remain the enforcement unit.

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

## AI

AI may summarize, classify, suggest and draft. It must not silently become the authority for money movement, legal consent, vehicle identity, entitlement, warranty approval or irreversible external communication. Human approval gates should be explicit where required.
