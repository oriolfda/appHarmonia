FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json i lockfile si existeix
COPY package*.json ./

# Instal·lar dependencies (si no hi ha lockfile, crea'l)
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --progress=false; \
    else \
      npm config set legacy-peer-deps true && \
      npm install --no-audit --progress=false --legacy-peer-deps; \
    fi

# Copiar la resta
COPY . .

# Construir
RUN npm run build

FROM nginx:alpine

# Configuració nginx si no existeix el fitxer
RUN if [ ! -f /etc/nginx/conf.d/default.conf ]; then \
      echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files \$uri \$uri/ /index.html; } }' \
      > /etc/nginx/conf.d/default.conf; \
    fi

COPY nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || true
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]