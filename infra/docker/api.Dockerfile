FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @alsvid/api build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY --from=build /app /app
ENV API_PORT=8080
EXPOSE 8080
CMD ["pnpm", "--filter", "@alsvid/api", "start"]
