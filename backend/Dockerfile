FROM node:18-alpine

# Dependències per a better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copiar package.json i lockfile si existeix
COPY package*.json ./

# Instal·lar dependencies
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production --no-audit --progress=false; \
    else \
      npm install --only=production --no-audit --progress=false; \
    fi

# Copiar la resta
COPY . .

# Crear directoris
RUN mkdir -p uploads database

EXPOSE 3001

# Health check opcional
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/salut || exit 1

CMD ["node", "server.js"]