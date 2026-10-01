# Clothsy portal (Next.js, server-rendered with server actions), for ECS on AWS.
#
# CLOTHSY_API_BASE is read at build time for the /i/ rewrite and at run time by
# the server; NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be the same in every
# build and task so server actions keep working across instances and deploys.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ARG CLOTHSY_API_BASE=""
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=""
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1 \
    CLOTHSY_API_BASE=$CLOTHSY_API_BASE NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
