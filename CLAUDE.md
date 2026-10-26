# ALSVID Claude Agent Rules

**MUST READ BEFORE EDITING**: [AGENTS.md](AGENTS.md) and [ALSVID single-system contract](docs/ONE_SYSTEM_DEVELOPMENT_CONTRACT.md). These are required, not optional project descriptions.

One ALSVID, one authoritative monorepo, one integrated business platform. Admin, Official, Dealer, My and business domains do not become cloned backends/databases. Web/API/Worker are processes of one system. Work on short branches off current `main`; keep data ownership, public contracts, and inter-module tests intact. Change upstream and downstream consumers together; do not defer integration to another agent. Never use production data/secrets for AI development. Verify actual CI before claiming completion.

For detailed architecture, permissions, collaboration and release rules, obey `AGENTS.md` and the linked contract. If instructions conflict, stop and flag the conflict instead of quietly creating a new system.
