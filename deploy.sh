#!/bin/bash
set -e

echo "=== Preparando despliegue de AlfabetIA Rural ==="

# 1. Crear .env si no existe
if [ ! -f .env ]; then
    echo "=> Archivo .env no encontrado. Creando a partir de .env.example..."
    cp .env.example .env
    echo "=> ATENCIÓN: Por favor verifica el archivo .env antes de continuar."
    exit 1
fi

# 2. Asegurar que el directorio runtime existe para SQLite
mkdir -p runtime

# 3. Validar docker y docker compose
if ! command -v docker &> /dev/null
then
    echo "docker no pudo ser encontrado. Por favor instálalo."
    exit 1
fi

# 4. Construir y levantar contenedores
echo "=> Construyendo y levantando contenedores con docker-compose..."
docker compose up -d --build

echo ""
echo "=== Despliegue Exitoso ==="
echo "Frontend: http://localhost:80"
echo "Backend API: http://localhost:8000"
echo "Revisa los logs con: docker compose logs -f"
