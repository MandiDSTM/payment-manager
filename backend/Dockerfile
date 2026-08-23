FROM node:22-bookworm AS deps

WORKDIR /app

ENV npm_config_build_from_source=true \
    npm_config_nodedir=/usr/local

COPY package.json package-lock.json ./
RUN npm config set registry https://package-mirror.liara.ir/repository/npm/ --global \
    && npm ci --omit=dev


FROM node:22-bookworm-slim

WORKDIR /app

RUN mkdir -p /app/data /app/uploads/receipts

COPY --from=deps /app/node_modules ./node_modules
COPY . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/database.sqlite

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
