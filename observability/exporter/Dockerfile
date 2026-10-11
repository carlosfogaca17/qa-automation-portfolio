# Imagem enxuta para o exporter de métricas dos testes.
FROM node:20-alpine

WORKDIR /app

# Instala apenas dependências de produção.
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./

ENV REPORTS_DIR=/reports \
    SUITES=web,api \
    PORT=9101 \
    REFRESH_INTERVAL_MS=15000

EXPOSE 9101

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:9101/health || exit 1

CMD ["node", "server.js"]
