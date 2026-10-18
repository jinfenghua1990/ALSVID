#!/usr/bin/env bash
set -euo pipefail
# Match package.json and CI; never install production secrets or migrate here.
sudo corepack enable
corepack prepare pnpm@10.34.6 --activate
pnpm install --frozen-lockfile
