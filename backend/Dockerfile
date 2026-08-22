FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev


FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data /app/uploads/receipts \
    && chown -R node:node /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

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
