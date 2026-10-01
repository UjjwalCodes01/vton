# FabricVTON backend (React Router + Shopify app + customer API), for ECS on AWS.
#
# Node 24 to match .node-version and package.json engines (">=22.12 <25" with
# engine-strict; the previous node:20 template could not install). Migrations
# are NOT run at start: with several tasks starting together they would race.
# The deploy pipeline runs them once, as a one-off task of this same image:
#   command override: ["npx", "prisma", "migrate", "deploy"]

FROM node:24-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund \
 && npx prisma generate

FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/aws-start.mjs ./
USER node
EXPOSE 3000
CMD ["node", "aws-start.mjs"]
