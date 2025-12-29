# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json i instal·lar dependències
COPY package*.json ./
RUN npm ci --only=production

# Copiar el codi de l'aplicació
COPY . .

# Crear directoris necessaris
RUN mkdir -p uploads database

# Exposar port
EXPOSE 3001

# Comanda per iniciar
CMD ["node", "server.js"]