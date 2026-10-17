FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

# RUN npm ci
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

RUN npm run build


FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY --from=build /app/dist ./dist

USER node

EXPOSE 9000

CMD [ "node", "--enable-source-maps", "dist/src/server.js" ]
