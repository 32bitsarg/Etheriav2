# Etheria

**Etheria** es un juego web de estrategia medieval-fantastica en desarrollo, inspirado por la construccion de ciudades, gestion de recursos, alianzas, mapa mundial y conflictos asincronicos.

El proyecto vive en un monorepo con frontend Next.js, backend Hono, paquetes compartidos TypeScript y persistencia principal en MatecitoDB. El foco actual es construir una base jugable: ciudad, economia, investigacion, combate, diplomacia, temporadas y amenazas del mundo.

## Estado Del Proyecto

Etheria esta en una etapa temprana. Hay sistemas funcionales, pero la API, el balance, los datos persistidos y la direccion visual todavia pueden cambiar sin garantia de compatibilidad.

Version documentada: `0.1.0` con trabajo activo en `[Unreleased]`.

### Ya Implementado

- Ciudad con edificios, mejoras, colas de construccion y produccion pasiva.
- Recursos principales: oro, madera, piedra, comida y gemas.
- Entrenamiento de unidades, investigacion tecnologica y modificadores de combate/economia.
- Batallas asincronicas con tiempos de marcha, reportes y devolucion de tropas.
- Autenticacion con sesiones HTTP-only sobre MatecitoDB.
- Mapa mundial con ciudades persistentes y campamentos barbaros.
- Alianzas, roles basicos, diplomacia, correo y chat global/de alianza.
- Temporadas con efectos progresivos sobre produccion, zonas y presion invernal.
- Configuracion de balance en codigo local versionado bajo `apps/api/src/domain`.
- Tests unitarios con Vitest para logica de dominio (`winterPressure`, `production`).
- Soporte dual MatecitoDB / PostgreSQL con compat layer (`postgresCompat.ts`).

### En Desarrollo

- Pulido visual de ciudad, mapa y HUD.
- Balance fino de economia, combate, temporadas y barbaros.
- Herramientas de administracion y operaciones.
- Endurecimiento de seguridad y flujo de despliegue.
- Mejoras de onboarding, accesibilidad y feedback de usuario.

## Stack

| Capa | Tecnologia |
| --- | --- |
| Frontend | Next.js 15, React 19, Phaser 3, Tailwind CSS v4 |
| Backend | Hono, Zod, Node.js |
| Persistencia | MatecitoDB; Prisma/PostgreSQL queda como soporte legado |
| Estado cliente | Zustand, TanStack Query |
| Monorepo | pnpm workspaces, Turborepo |
| Lenguaje | TypeScript |

## Estructura

```text
etheria/
+-- apps/
|   +-- api/          # API Hono, workers y dominio del juego
|   +-- web/          # Next.js, React UI y escenas Phaser
+-- packages/
|   +-- shared/       # Schemas Zod y tipos compartidos
|   +-- database/     # Prisma/PostgreSQL legado
+-- docs/             # Planes tecnicos y documentos de diseno
+-- CHANGELOG.md      # Historial obligatorio de cambios
+-- GUIDELINES.md     # Reglas de desarrollo del proyecto
```

## Requisitos

- Node.js 20+
- pnpm 10+
- Credenciales de MatecitoDB para desarrollo

## Configuracion Local

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env
```

Completa `.env` con tus credenciales locales. No publiques claves reales. El backend usa `MATECITO_SERVICE_KEY`; el frontend solo debe recibir variables `NEXT_PUBLIC_*`.

3. Crear o actualizar colecciones runtime:

```bash
pnpm db:setup
```

4. Si usas PostgreSQL (legado), sincroniza el schema despues de pullar cambios:

```bash
pnpm db:pg:push
```

5. Levantar el proyecto:

```bash
pnpm dev
```

Servicios por defecto:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Comandos

```bash
pnpm dev                    # Levanta frontend y backend
pnpm build                  # Compila todo el monorepo
pnpm lint                   # Typecheck/lint segun cada paquete
pnpm test                   # Corre tests unitarios (Vitest)
pnpm test:run               # Corre tests una sola vez (CI)
pnpm db:setup               # Crea colecciones runtime en MatecitoDB
pnpm db:seed                # Nota informativa: balance estatico vive en codigo
pnpm db:seed:legacy         # Seed legado de configuraciones antiguas
pnpm db:pg:generate         # Prisma generate para soporte PostgreSQL legado
pnpm db:pg:push             # Prisma push para soporte PostgreSQL legado
pnpm db:pg:studio           # Prisma Studio legado
```

Para deploy con Vercel + Supabase Postgres, ver `docs/vercel-supabase-deploy.md` y `docs/vercel-deploy.md`.

Para correr servicios por separado:

```bash
pnpm --filter @etheria/api dev
pnpm --filter @etheria/web dev
```

## Balance Y Configuracion De Juego

Los valores jugables no deben quedar hardcodeados dentro de rutas o UI. La configuracion vive en archivos versionados del dominio:

```text
apps/api/src/domain/buildingConfigSeedData.ts
apps/api/src/domain/unitConfigData.ts
apps/api/src/domain/techConfigData.ts
apps/api/src/domain/worldConfigData.ts
apps/api/src/domain/seasonConfigData.ts
apps/api/src/domain/barbarianConfigData.ts
```

Flujo recomendado:

1. Editar la fuente de configuracion correspondiente.
2. Actualizar `CHANGELOG.md`.
3. Reiniciar la API para recargar datos.
4. Verificar el caso afectado desde UI o endpoint.

## Seguridad

- Nunca commitear `.env`, `.env.local`, claves de servicio, dumps, certificados ni archivos `.pem`.
- `.env.example` debe contener placeholders, no credenciales reales.
- Las claves `NEXT_PUBLIC_*` pueden llegar al navegador; no poner secretos ahi.
- Si una clave real fue publicada por error, rotarla en el proveedor antes de seguir trabajando.
- Antes de publicar, revisar con una busqueda de secretos y confirmar que `dist`, `.next`, `.turbo`, `tmp` y archivos temporales no entren al paquete.

## Colaboracion

Se aceptan colaboraciones, con limitaciones. Etheria todavia no es un proyecto abierto para cambios grandes sin coordinacion previa.

Antes de abrir un PR:

- Habla primero si el cambio toca balance, economia, combate, autenticacion, persistencia, datos existentes o direccion visual.
- Mantene los PRs chicos y enfocados.
- Actualiza `CHANGELOG.md` bajo `[Unreleased]`.
- Segui `GUIDELINES.md`, especialmente la regla de no hardcodear valores jugables.
- No incluyas claves, assets temporales, builds generados ni cambios de formato masivos.
- Usa commits con prefijos como `[CORE]`, `[UI]`, `[BALANCE]`, `[INFRA]`, `[SOCIAL]` o `[ECONOMY]`.

Mi tag de git para referencia del proyecto es `32bitsarg`.

## Documentacion

- [CHANGELOG.md](./CHANGELOG.md): historial y estado funcional.
- [GUIDELINES.md](./GUIDELINES.md): reglas de desarrollo.
- [docs/seasonal-world-and-barbarians-plan.md](./docs/seasonal-world-and-barbarians-plan.md): plan de temporadas, mapa y barbaros.

## Licencia

La licencia del proyecto debe confirmarse antes de publicar una distribucion formal. El README anterior mencionaba MIT, pero no hay un archivo `LICENSE` en este arbol de trabajo.
