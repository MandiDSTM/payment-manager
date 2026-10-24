FROM node:22.23.4-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm config set registry https://package-mirror.liara.ir/repository/npm/ \
    && npm ci

COPY . .

ARG VITE_API_BASE=/api
ARG VITE_FILE_ORIGIN=
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_FILE_ORIGIN=$VITE_FILE_ORIGIN

RUN npm run build


FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /usr/share/caddy

EXPOSE 80
