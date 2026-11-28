# Built from the repo root (docker compose does it), since tsconfig.json extends ../tsconfig.base.json
FROM node:24-slim AS build
WORKDIR /app/backend
COPY tsconfig.base.json /app/
COPY backend/package*.json ./
RUN npm ci
COPY backend ./
RUN npm run build

FROM node:24-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/backend/dist dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
