# Clothsy admin dashboard (Next.js, server actions), for ECS on AWS.
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be the same in every build and task.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=""
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1 NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/aws-start.mjs ./
USER node
EXPOSE 3000
CMD ["node", "aws-start.mjs"]
