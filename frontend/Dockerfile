# frontend/Dockerfile
# Etapa de construcció
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar fitxers de configuració
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Instal·lar dependències
RUN npm ci

# Copiar codi font
COPY public/ ./public/
COPY src/ ./src/
COPY index.html ./

# Construir l'aplicació
RUN npm run build

# Etapa de producció
FROM nginx:alpine

# Copiar configuració de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar l'aplicació construïda
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposar port
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]