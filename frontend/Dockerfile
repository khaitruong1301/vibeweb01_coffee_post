# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Địa chỉ backend nhìn từ container frontend — được chốt vào cấu hình rewrites lúc build.
ARG BACKEND_URL=http://backend:4100
ENV BACKEND_URL=$BACKEND_URL
# Header HSTS chỉ khi chạy HTTPS (next.config.ts)
ARG ENABLE_HSTS=false
ENV ENABLE_HSTS=$ENABLE_HSTS
RUN npm run build

# ---- runtime: bản standalone (chỉ file cần chạy) ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
