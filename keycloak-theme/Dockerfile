FROM node:22-slim AS build

RUN apt-get update && apt-get install -y default-jdk maven && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-keycloak-theme

FROM scratch AS export
COPY --from=build /app/dist_keycloak/ /
