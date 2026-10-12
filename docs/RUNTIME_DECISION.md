# Runtime Platform Decision

## Purpose

This document records which platform runs ALSVID, why it was selected, which alternatives were considered, and when a future migration should be evaluated. The goal is to prevent future developers or AI agents from reopening the same decision without a real business reason.

## Decision summary

- **Primary production runtime:** Google Cloud Run
- **Fallback option 1:** Railway
- **Fallback option 2:** Apply.Build
- **Deployment principle:** ALSVID must remain containerized and portable. Runtime vendors are replaceable infrastructure, not business dependencies.

## Why Google Cloud Run is primary

ALSVID is primarily an internal operating platform with customer after-sales and vehicle-facing surfaces. It is not a high-frequency public commerce engine. The desired runtime therefore needs to be reliable, low-maintenance, Docker/container friendly, globally reachable, and able to keep cost low when traffic is light.

Google Cloud Run is currently preferred because:

- it is operated by a large, established cloud provider;
- it runs containerized applications directly;
- it supports scale-to-zero for low-traffic services;
- it avoids maintaining a traditional virtual server;
- it integrates with GitHub/CI-based deployment workflows;
- it can expose a default HTTPS URL before ALSVID owns a custom domain;
- it supports a future path to managed secrets, logs, IAM, jobs and other production controls if ALSVID grows.

## Why Cloud Run is not a permanent lock-in

Cloud Run is a current provider decision, not an architectural dependency. ALSVID must keep:

- Docker/container definitions under version control;
- configuration through environment variables/secrets;
- PostgreSQL as the database contract;
- S3-compatible object storage behind adapters/ports;
- business domains free of Google-specific APIs unless explicitly approved.

If Cloud Run becomes too expensive, operationally inconvenient, regionally unsuitable, or commercially unattractive, the runtime may move without redesigning ALSVID business logic.

## Why not run Production on the M1 Mac

The M1 is a development and Test workstation, not a production server. Production on a personal workstation would create avoidable risks around uptime, networking, power, remote access, security, deployment consistency and customer availability.

## Why not use a traditional VPS first

A VPS can run ALSVID, but it also creates server administration work: operating-system patching, firewall maintenance, process supervision, reverse proxy management, certificate renewal, monitoring and capacity planning. ALSVID does not currently need this operational burden.

A VPS may be reconsidered later only if there is a clear cost, networking or regulatory reason.

## Fallback option 1: Railway

Railway is the first fallback because it is simple to deploy from GitHub and works well with containerized applications. It is easier operationally than a self-managed server.

Railway is not primary because its free/credit model and long-term pricing can change, and ALSVID currently prefers the stability and provider scale of Google Cloud.

## Fallback option 2: Apply.Build

Apply.Build is retained as a second fallback because it supports GitHub/Docker-style deployment and may be useful as a low-cost emergency or experimental runtime.

It is not primary because it is a smaller platform and ALSVID prefers a larger provider for the main production service.

## Cloudflare runtime note

Cloudflare remains strategically important for R2 object storage. Cloudflare Workers are useful for lightweight edge functions but are not the selected runtime for the full ALSVID application. Cloudflare Containers may be reconsidered later if its pricing and product maturity become a better fit.

## Development/Test versus Production

Current stage:

- **M1 + Docker:** fast local Development/Test feedback
- **Google Cloud Run in `alsvid-dev`:** shared Development/Test runtime for GitHub commits
- **Google Cloud Run in `alsvid-prod`:** Production runtime

The shared Cloud Run Development/Test runtime exists because multiple developers and coding agents need a reproducible deployed target. It uses separate Neon Test and R2 Test resources and must never receive Production secrets.

## Promotion rule

Test approval promotes a software version, not Test data.

The intended flow is:

1. build/run the production-oriented container definition on M1;
2. test against isolated Test database/storage resources;
3. approve a specific Git commit/version;
4. deploy that same approved version to Cloud Run Production;
5. Production connects only to Production database/storage/secrets.

## Change rule

Do not replace Cloud Run merely because another platform is fashionable or temporarily cheaper. A runtime migration must identify a concrete problem, demonstrate that ALSVID remains portable, and document the decision before changing Production.
