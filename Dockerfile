# ---- Build Stage ----
FROM oven/bun:1.2.13 as builder
LABEL org.opencontainers.image.source="https://github.com/vessup/based"
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# ---- Production Stage ----
FROM oven/bun:1.2.13 as runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /app .
EXPOSE ${PORT}
CMD ["sh", "-c", "bun run start -- -p $PORT"] 