# Secret — App para Entrenadores Personales

Aplicación móvil para entrenadores personales que permite gestionar clientes, ejercicios, rutinas y agenda semanal.

## Tecnologías

| Tecnología | Versión |
|---|---|
| React Native | 0.81.5 |
| Expo SDK | 54 |
| Expo Router | 6 |
| TypeScript | 5.9 |
| React | 19.1 |

## Requisitos Previos

- **Node.js** >= 18
- **npm** o **yarn**
- **Expo CLI**: `npm install -g expo-cli` (opcional, se puede usar `npx`)
- **Expo Go** en tu dispositivo móvil (iOS/Android) para pruebas rápidas
- **Xcode** (solo macOS, para simulador iOS)
- **Android Studio** (para emulador Android)

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd Secret

# Instalar dependencias
npm install
```

## Ejecutar la App

```bash
# Iniciar servidor de desarrollo
npx expo start

# Iniciar directamente en iOS
npx expo start --ios

# Iniciar directamente en Android
npx expo start --android

# Iniciar en navegador web
npx expo start --web
```

### Tareas de VS Code

El proyecto incluye tareas preconfiguradas en `.vscode/tasks.json`:

- **Start Expo Dev Server** — Inicia el servidor de desarrollo (tarea por defecto)
- **Start iOS Simulator** — Inicia directamente en simulador iOS
- **Start Android Emulator** — Inicia directamente en emulador Android
- **TypeScript Check** — Verifica tipos TypeScript
- **Export for Production** — Exporta la app para producción

Ejecutar con `Cmd+Shift+B` (macOS) o `Ctrl+Shift+B` (Windows/Linux).

## Estructura del Proyecto

```
Secret/
├── app/                        # Rutas (Expo Router - file-based routing)
│   ├── _layout.tsx             # Layout raíz (providers)
│   ├── index.tsx               # Redirect inicial
│   ├── (tabs)/                 # Navegación por tabs
│   │   ├── _layout.tsx         # Configuración de tabs
│   │   ├── clients.tsx         # Listado de clientes
│   │   ├── routines.tsx        # Listado de rutinas
│   │   ├── exercises.tsx       # Catálogo de ejercicios
│   │   └── calendar.tsx        # Agenda semanal
│   ├── clients/                # Rutas de clientes
│   │   ├── [id].tsx            # Detalle del cliente (dashboard)
│   │   ├── add.tsx             # Agregar cliente
│   │   ├── edit.tsx            # Editar cliente
│   │   ├── measurements.tsx    # Mediciones / evaluaciones
│   │   ├── photos.tsx          # Fotos de progreso
│   │   ├── goals.tsx           # Objetivos del cliente
│   │   ├── plan.tsx            # Plan de entrenamiento
│   │   ├── workout.tsx         # Registrar sesión
│   │   ├── workout-history.tsx # Historial de entrenamientos
│   │   ├── exercise-history.tsx# Historial por ejercicio
│   │   └── edit-workout.tsx    # Editar sesión pasada
│   ├── exercises/              # Rutas de ejercicios
│   │   ├── [id].tsx            # Detalle del ejercicio
│   │   └── add.tsx             # Agregar ejercicio
│   └── routines/               # Rutas de rutinas
│       ├── [id].tsx            # Detalle / editar rutina
│       └── create.tsx          # Crear rutina
├── src/
│   ├── context/
│   │   └── AppDataContext.tsx   # Estado global (Context API + AsyncStorage)
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   └── assets/
│       └── exerciseGifs.ts     # Mapeo de GIFs de ejercicios
├── assets/
│   ├── gifs/                   # GIFs animados de ejercicios
│   └── icons/exercises/        # Íconos de ejercicios
├── app.json                    # Configuración de Expo
├── package.json                # Dependencias
└── tsconfig.json               # Configuración TypeScript
```

## Funcionalidades

### Clientes
- CRUD completo de clientes
- Foto de perfil con cámara del dispositivo
- Registro de mediciones corporales (peso, grasa, perímetros)
- Fotos de progreso (frontal, espalda, lateral) con cámara
- Objetivos personalizados con seguimiento
- Planes de entrenamiento personalizados
- Alertas de evaluación pendiente (cada 15 días)

### Ejercicios
- Catálogo de ~75 ejercicios preconfigurados
- Búsqueda por nombre y filtro por categoría muscular
- GIFs animados de técnica (20 ejercicios)
- Información detallada: músculos primarios/secundarios, instrucciones, tips, errores comunes
- Niveles de dificultad y popularidad
- Agregar ejercicios personalizados

### Rutinas
- Crear rutinas como plantillas
- Seleccionar ejercicios del catálogo
- Configurar series, repeticiones y descanso
- Asignar rutinas como planes a clientes

### Entrenamientos
- Registrar sesiones cargando desde rutina o ejercicios individuales
- Seguimiento de series, peso y repeticiones
- Volumen total calculado automáticamente
- Historial de entrenamientos agrupado por fecha
- Progresión por ejercicio con gráfico visual
- Editar sesiones pasadas

### Agenda
- Vista semanal con planes activos por día
- Navegación entre semanas
- Indicador del día actual

### Persistencia
- Datos almacenados localmente con AsyncStorage
- Se conservan entre sesiones de la app

## Módulos Principales

| Módulo | Archivo | Líneas |
|---|---|---|
| Estado Global | `src/context/AppDataContext.tsx` | ~600 |
| Tipos | `src/types/index.ts` | ~130 |
| Detalle Ejercicio | `app/exercises/[id].tsx` | ~520 |
| Plan de Cliente | `app/clients/plan.tsx` | ~625 |
| Dashboard Cliente | `app/clients/[id].tsx` | ~440 |
| Registrar Sesión | `app/clients/workout.tsx` | ~380 |

## Temas y Diseño

La app utiliza un tema oscuro consistente:

| Elemento | Color |
|---|---|
| Fondo principal | `#0a192f` (Navy) |
| Fondo tarjetas | `#112240` |
| Fondo secundario | `#233554` |
| Acento primario | `#64ffda` (Cyan) |
| Texto principal | `#ccd6f6` |
| Texto secundario | `#8892b0` |
| Peligro/Error | `#ff6b6b` |
| Éxito | `#4ade80` |

## Licencia

Proyecto privado. Todos los derechos reservados.
