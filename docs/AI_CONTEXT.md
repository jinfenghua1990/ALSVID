# ALSVID AI Context

## Purpose

This document exists so future AI assistants, developers, and maintainers understand why ALSVID is designed this way before making changes.

## ALSVID Positioning

ALSVID is a bicycle brand digital platform focused on vehicle lifecycle management.

ALSVID manages:

- Vehicle identity (VIN)
- Vehicle 360 records
- Customer ownership relationship
- Warranty
- Service history
- After-sales processes
- Dealer service information

## What ALSVID is NOT

ALSVID is not:

- A replacement for Shopify
- A replacement for WMS
- An OMS system
- A full ERP replacement

The goal is to connect business systems and preserve important vehicle lifecycle information, not duplicate existing mature systems.

## Core Business Boundary

Shopify owns:

- Ecommerce
- Products
- Orders
- Payments
- Customer purchase transactions

WMS owns:

- Inventory
- Warehouse operations
- Picking
- Shipping execution
- Logistics execution

ALSVID receives required business facts from these systems and provides vehicle lifecycle services.

## Core Architecture Principles

1. Keep business logic independent from vendors.
2. Use PostgreSQL standards to avoid database lock-in.
3. Keep deployment containerized and portable.
4. Do not add complexity before business requirements require it.
5. Preserve clear ownership boundaries between Shopify, WMS and ALSVID.
6. Do not redesign confirmed architecture without reviewing existing decisions.

## Current Infrastructure Decisions

Runtime:

- Primary: Google Cloud Run
- Fallback 1: Railway
- Fallback 2: Apply.Build

Database:

- Primary: Neon PostgreSQL
- Alternative: Supabase PostgreSQL

Storage:

- Cloudflare R2

Development and CI:

- Local workstation and Docker for development.
- Disposable GitHub-hosted runners for automated checks, with temporary PostgreSQL and no Production secrets.
- The former shared cloud Development/Test runtime is retired.

Production:

- Google Cloud Run in `alsvid-prod`.
- Neon PostgreSQL.
- Cloudflare R2.

## Future AI Rule

Before changing architecture, check:

- Why was the current choice made?
- What problem does the change solve?
- Does it violate ALSVID boundaries?
- Is there a simpler solution?


## Environment and release model (2026-10-14)

The current cloud runtime is Production only (`alsvid-prod`). Local Docker and ephemeral GitHub CI are the development/validation environments. The former cloud Development/Test runtime and automatic promotion flow are retired. Pull requests target `main`; Production deployment requires successful CI for the exact commit. Treat older Development references elsewhere in the docs as historical unless explicitly updated. Verify live cloud inventory before claiming a resource exists or was deleted.
