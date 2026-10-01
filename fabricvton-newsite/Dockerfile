# clothsyai.fabricvton.com (Next.js marketing site and API docs), for ECS on AWS.
# TRYON_API_ORIGIN is read at build time for the /look/* rewrite to the backend.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ARG TRYON_API_ORIGIN=""
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1 TRYON_API_ORIGIN=$TRYON_API_ORIGIN
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
