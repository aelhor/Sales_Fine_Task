FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN rm -f tsconfig.tsbuildinfo && npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/knexfile.ts ./knexfile.ts
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/seeds ./seeds

USER node

EXPOSE 3000

CMD ["node", "dist/main"]
