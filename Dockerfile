# syntax=docker/dockerfile:1
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# These are public LIFF identifiers, never LINE tokens or backend secrets.
ARG NEXT_PUBLIC_LINE_WEB_LIFF_ID
ARG NEXT_PUBLIC_LINE_WORKER_LIFF_ID
ENV NEXT_PUBLIC_LINE_WEB_LIFF_ID=$NEXT_PUBLIC_LINE_WEB_LIFF_ID
ENV NEXT_PUBLIC_LINE_WORKER_LIFF_ID=$NEXT_PUBLIC_LINE_WORKER_LIFF_ID
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
