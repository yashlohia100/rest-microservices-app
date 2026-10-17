# Build stage
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json .
# RUN npm ci
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tsconfig.json .
COPY src ./src

RUN npm run build

# Production stage
FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json .
# RUN npm ci --omit=dev
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY --from=build /app/dist ./dist

USER node

EXPOSE 12000

CMD [ "node", "--enable-source-maps", "dist/src/server.js" ]
