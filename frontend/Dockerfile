# Built from the repo root (docker compose does it), since tsconfig.json extends ../tsconfig.base.json
FROM node:24-slim AS build
WORKDIR /app/frontend
COPY tsconfig.base.json /app/
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
# The API address the page calls, fixed in its JavaScript; empty means http://localhost:3000
ARG VITE_API_URL
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/frontend/dist /usr/share/nginx/html
