# Fronted AlfabetIA Rural

Interfaz web moderna para **AlfabetIA Rural**, una plataforma offline-first de gestión consentida de narrativas rurales, modelos mentales comunitarios y rutas pedagógicas contextualizadas.

## 🎯 Características principales

- **Dashboard de Resumen** — Vista consolidada del estado del sistema y métricas clave
- **Gestión de Consentimiento** — Recopilación y auditoría de consentimiento informado granular
- **Registro de Relatos** — Interfaz para captura de narrativas con proveniencia y seguridad
- **Análisis de Modelos Mentales** — Visualización interactiva de redes conceptuales y creencias comunitarias
- **Rutas Pedagógicas** — Planificación y seguimiento de trayectorias de aprendizaje personalizadas
- **Cola de Revisiones** — Sistema de aprobación humana para decisiones del sistema
- **Segmentación Comunitaria** — Agrupamiento y análisis de poblaciones según similitud pedagógica
- **Auditoría Arquitectónica** — Trazabilidad completa de decisiones y transformaciones de datos

## 🚀 Inicio rápido

### Requisitos
- Node.js 16+
- npm o yarn
- Backend AlfabetIA ejecutándose en `http://localhost:8000` (por defecto)

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Construcción para producción

```bash
npm run build
npm run preview
```

## 🏗️ Stack tecnológico

- **React 19** — UI reactiva y componentes
- **Vite** — Bundler ultrarrápido
- **React Router 7** — Navegación SPA
- **Tailwind CSS 4** — Estilos utilitarios
- **React Force Graph** — Visualización de redes conceptuales

## 📁 Estructura de proyecto

```
src/
├── components/        # Componentes reutilizables
│   └── agents/       # Visualización de estado de agentes
├── pages/            # Páginas principales (P0-P7)
├── hooks/            # Hooks personalizados (estado, API)
├── api/              # Cliente HTTP para backend
└── App.jsx           # Punto de entrada principal
```

## 🔗 Integración con Backend

El frontend se comunica con la arquitectura AlfabetIA Python mediante:

```javascript
// src/api/client.js
const API_BASE = process.env.VITE_API_BASE || 'http://localhost:8000'
```

Variables de entorno:
- `VITE_API_BASE` — URL base del backend (default: `http://localhost:8000`)

## 📚 Documentación relacionada

- [Arquitectura Multiagente](../Arquitectura-Multiagente-AlfabetIA/docs/ARQUITECTURA.md)
- [Modelo Mental y Agrupamiento](../Arquitectura-Multiagente-AlfabetIA/docs/MODELO_MENTAL_Y_AGRUPAMIENTO.md)
- [Seguridad y Gobernanza](../Arquitectura-Multiagente-AlfabetIA/docs/SEGURIDAD_GOBERNANZA.md)

## 🧪 Control de calidad

```bash
npm run lint     # Ejecutar ESLint
```

## 📝 Licencia

Ver LICENSE del proyecto raíz.

---

**Nota**: Este frontend es parte integral de AlfabetIA Rural y requiere el backend multiagente para funcionar correctamente.
