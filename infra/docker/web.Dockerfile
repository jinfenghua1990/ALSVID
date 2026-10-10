FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @alsvid/web build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY --from=build /app /app
EXPOSE 8080
CMD ["pnpm", "--filter", "@alsvid/web", "start"]
