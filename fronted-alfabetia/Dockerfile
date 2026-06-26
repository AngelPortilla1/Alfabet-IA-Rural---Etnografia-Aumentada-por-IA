# Etapa 1: Build con Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar configuración y dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiar código fuente
COPY . .

# Construir aplicación de Vite
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Eliminar el default de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar el build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
