# Despliegue en Producción - AlfabetIA Rural

Este documento describe los pasos necesarios para desplegar **AlfabetIA Rural** en un entorno de producción (o de pruebas) utilizando **Docker** y **Docker Compose**.

## Requisitos Previos

- **Docker**: Asegúrate de tener Docker instalado en el servidor.
- **Docker Compose**: Incluido con las versiones recientes de Docker Desktop o Docker Engine.
- **Ollama**: Se recomienda correr Ollama *fuera* de los contenedores (directamente en el host) si cuentas con GPU, para evitar configuraciones complejas de NVIDIA Container Toolkit.

## Estructura de Despliegue

La solución está dockerizada y dividida en dos contenedores:
1. **Frontend**: Aplicación de React servida estáticamente a través de Nginx (Puerto `80`).
2. **Backend**: Aplicación FastAPI servida con Uvicorn (Puerto `8000`).

La base de datos SQLite se almacena en el host, en la carpeta `./runtime`, y es inyectada mediante un volumen al backend para asegurar la **persistencia de datos**.

## Pasos para el Despliegue

### 1. Clonar el Repositorio
Ubicado en el directorio raíz de este proyecto.

### 2. Configurar Variables de Entorno
Copia el archivo base `.env.example` para crear el archivo `.env` que Docker Compose leerá automáticamente.

```bash
cp .env.example .env
```

Abre el archivo `.env` y edita lo siguiente según corresponda:
- `VITE_API_URL`: Coloca la URL donde residirá tu backend si accedes desde internet (ej. `http://tu-ip:8000`). Si está en la misma red local o es una prueba local, `http://localhost:8000` es suficiente.
- `ALFABETIA_OLLAMA_BASE_URL`: El contenedor asume que Ollama corre en el host. 
  - En Mac/Windows, usa `http://host.docker.internal:11434`.
  - En Linux, intenta usar la IP de la interfaz docker0 (suele ser `http://172.17.0.1:11434`).

### 3. Iniciar el Despliegue
Puedes utilizar el script facilitado:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Alternativamente**, puedes hacerlo de forma manual con Docker Compose:
```bash
# Crea la carpeta runtime si no existe
mkdir -p runtime

# Levanta los contenedores en modo 'detached' (segundo plano)
docker compose up -d --build
```

### 4. Verificación
Una vez terminado el proceso:
- **Frontend** estará disponible en: `http://localhost` (u `http://<tu-ip>`).
- **Backend Swagger Docs** estará en: `http://localhost:8000/docs` (u `http://<tu-ip>:8000/docs`).

Verifica la salud del sistema accediendo a `http://localhost:8000/health`.

### 5. Lectura de Logs y Mantenimiento

Para visualizar los logs en tiempo real:
```bash
docker compose logs -f
```

Para bajar los contenedores de forma segura:
```bash
docker compose down
```

## Arquitectura Detectada & Decisiones
- El framework de desarrollo original de React utiliza Vite. En la etapa Docker se introdujo un **Build Multi-stage** para compilar la aplicación Vite estática y montarla sobre **Nginx**, lo que asegura un rendimiento y eficiencia óptimos.
- Se ha parametrizado el **CORS** en FastAPI (`ALFABETIA_CORS_ORIGINS`) y la URL base en React (`VITE_API_URL`) para no depender de `localhost` en entornos productivos.
