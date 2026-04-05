FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate

RUN npm run build

FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 9000

CMD [ "node", "dist/src/server.js" ]
