# ---- build: cài đủ dependencies, sinh Prisma Client, biên dịch NestJS ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- runtime: chỉ dependencies production + dist ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json /app/prisma.config.ts ./
COPY --chown=node:node docker-entrypoint.sh ./
USER node
EXPOSE 4100
CMD ["sh", "docker-entrypoint.sh"]
