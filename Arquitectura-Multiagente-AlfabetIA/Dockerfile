FROM python:3.11-slim

# Evitar escritura de .pyc y forzar stdout sin buffer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias (por ejemplo para compilación si hiciera falta)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar todo el código (incluyendo src, README.md y pyproject.toml)
COPY . .

# Instalar el paquete y sus dependencias
RUN pip install --no-cache-dir build && \
    pip install --no-cache-dir .


# Variables de entorno por defecto
ENV ALFABETIA_DB_PATH=runtime/alfabetia_rural.db

EXPOSE 8000

# Usar uvicorn explícitamente para producción, apuntando a src/alfabetia_rural/api/app.py
# y asumiendo que el paquete está instalado o src está en PYTHONPATH
ENV PYTHONPATH=/app/src

CMD ["uvicorn", "alfabetia_rural.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
