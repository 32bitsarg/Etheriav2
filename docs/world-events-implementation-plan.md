# World Events Implementation Plan

## Objetivo

Agregar una capa de eventos publicos del mundo para que Etheria se sienta vivo: progreso de aldeas, batallas, temporadas, barbaros, ranking y alianzas deben dejar huellas visibles sin sacar al jugador de la aldea o del mapa.

El sistema debe funcionar como una bitacora filtrable del mundo. Los bots y los jugadores humanos deben generar eventos usando los mismos servicios de dominio, de modo que la actividad automatizada tambien ayude a testear y poblar el mundo.

## Principios

- No hardcodear valores de gameplay: limites, visibilidad, TTL y tipos destacados deben vivir en config.
- No escribir eventos desde rutas cuando exista un domain service compartido.
- Los eventos deben ser derivados de acciones reales, no inventados por UI.
- El feed no debe revelar informacion tactica sensible, como tropas exactas de un enemigo o recursos privados.
- Cada cambio implementado debe actualizar `CHANGELOG.md` bajo `[Unreleased]`.

## MVP

El MVP debe mostrar un modal/panel de "Mundo" accesible desde el sidebar/HUD sin cambiar la ruta actual. Debe listar eventos recientes con filtros por tipo.

Eventos iniciales:

- `BUILDING_COMPLETED`: una aldea completo una mejora importante.
- `RESEARCH_COMPLETED`: una aldea completo una investigacion.
- `BATTLE_CREATED`: una aldea lanzo un ataque contra otra aldea.
- `BATTLE_RESOLVED`: una batalla fue resuelta.
- `BARBARIAN_CAMP_SPAWNED`: aparecio un campamento barbaro relevante.
- `BARBARIAN_CAMP_DEFEATED`: una aldea derroto un campamento barbaro.
- `SEASON_CHANGED`: cambio la temporada o fase del mundo.
- `RANKING_MILESTONE`: una aldea entro al top del ranking.
- `ALLIANCE_EVENT`: evento diplomatico o social relevante.

## Modelo de datos

Modificar `packages/database/prisma/schema.prisma`.

Agregar enum:

```prisma
enum WorldEventType {
  BUILDING_COMPLETED
  RESEARCH_COMPLETED
  BATTLE_CREATED
  BATTLE_RESOLVED
  BARBARIAN_CAMP_SPAWNED
  BARBARIAN_CAMP_DEFEATED
  SEASON_CHANGED
  RANKING_MILESTONE
  ALLIANCE_EVENT
}
```

Agregar modelo:

```prisma
model WorldEvent {
  id              String         @id
  type            WorldEventType
  title           String
  description     String?
  severity        String         @default("INFO")
  visibility      String         @default("PUBLIC")
  cityId          String?
  cityName        String?
  targetCityId    String?
  targetCityName  String?
  allianceId      String?
  battleId        String?
  barbarianCampId String?
  season          String?
  zoneId          String?
  metadata        Json?
  occurredAt      DateTime       @default(now())
  createdAt       DateTime       @default(now())

  @@index([occurredAt])
  @@index([type, occurredAt])
  @@index([cityId, occurredAt])
  @@index([zoneId, occurredAt])
  @@map("world_events")
}
```

Notas:

- `title` y `description` deben ser texto publico ya preparado por backend.
- `metadata` debe contener solo datos no sensibles para filtros o UI.
- `severity` permite diferenciar eventos normales, importantes y criticos sin hardcodear estilos por texto.

## Config

Crear `apps/api/src/domain/worldEventConfigData.ts`.

Contenido sugerido:

- `maxFeedItems`: cantidad maxima por respuesta.
- `defaultFeedItems`: cantidad por defecto.
- `importantBuildingLevels`: niveles que generan evento publico.
- `importantResearchLevels`: niveles que generan evento publico.
- `rankingTopThreshold`: top que dispara milestone.
- `eventRetentionDays`: retencion para limpieza futura.
- `enabledEventTypes`: feature switch por tipo.

Ejemplo:

```ts
export const LOCAL_WORLD_EVENT_CONFIG = {
  defaultFeedItems: 50,
  maxFeedItems: 100,
  rankingTopThreshold: 10,
  importantBuildingLevels: [5, 10, 15, 20],
  importantResearchLevels: [1, 3, 5],
  eventRetentionDays: 30,
  enabledEventTypes: {
    BUILDING_COMPLETED: true,
    RESEARCH_COMPLETED: true,
    BATTLE_CREATED: true,
    BATTLE_RESOLVED: true,
    BARBARIAN_CAMP_SPAWNED: true,
    BARBARIAN_CAMP_DEFEATED: true,
    SEASON_CHANGED: true,
    RANKING_MILESTONE: true,
    ALLIANCE_EVENT: true
  }
} as const;
```

## Backend

### Nuevo domain service

Crear `apps/api/src/domain/worldEvents.ts`.

Responsabilidades:

- `createWorldEvent(input)`: valida tipo, aplica config y persiste.
- `listWorldEvents(filters)`: pagina y filtra por tipo, ciudad, zona, alianza.
- `emitBuildingCompletedEvent(...)`.
- `emitResearchCompletedEvent(...)`.
- `emitBattleCreatedEvent(...)`.
- `emitBattleResolvedEvent(...)`.
- `emitBarbarianCampSpawnedEvent(...)`.
- `emitBarbarianCampDefeatedEvent(...)`.
- `emitSeasonChangedEvent(...)`.
- `emitRankingMilestoneEvent(...)`.
- `emitAllianceEvent(...)`.

Reglas:

- El servicio nunca debe tirar abajo la accion principal si falla el evento. Debe loguear el error y continuar.
- Para evitar spam, debe aplicar filtros de importancia desde config.
- Debe aceptar datos ya conocidos por el caller para evitar queries extra cuando sea posible.

### Colecciones compat

Modificar:

- `apps/api/src/infrastructure/matecito.ts`
- `apps/api/src/infrastructure/postgresCompat.ts`
- `apps/api/src/infrastructure/matecitoRecord.ts` si requiere timestamps/campos logicos.

Agregar collection `WORLD_EVENTS: "world_events"` para mantener el patron actual de acceso.

### Rutas

Modificar `apps/api/src/routes/world.ts`.

Agregar:

- `GET /world/events`

Query params:

- `limit`
- `type`
- `cityId`
- `zoneId`
- `allianceId`
- `cursor` o `before`

Respuesta:

```ts
{
  events: WorldEventDto[],
  nextCursor?: string
}
```

### Emision desde acciones existentes

Modificar `apps/api/src/domain/cityActions.ts`.

- En `attackCityAction`, emitir `BATTLE_CREATED` despues de crear el battle.
- No emitir building/research completion aca porque estas acciones solo encolan trabajo.

Modificar `apps/api/src/workers/queueWorker.ts`.

- Al completar una build queue, emitir `BUILDING_COMPLETED`.
- Al completar research queue, emitir `RESEARCH_COMPLETED`.
- Al resolver una batalla PvP, emitir `BATTLE_RESOLVED`.
- Al finalizar retorno si hace falta, no duplicar evento de resolucion.
- Al resolver barbarian battle, emitir `BARBARIAN_CAMP_DEFEATED` cuando corresponda.

Modificar `apps/api/src/domain/barbarians.ts`.

- Cuando se persiste un campamento nuevo relevante, emitir `BARBARIAN_CAMP_SPAWNED`.
- Aplicar config para no publicar cada spawn menor si genera ruido.

Modificar `apps/api/src/domain/seasons.ts` o `apps/api/src/workers/seasonWorker.ts`.

- Cuando cambie temporada o fase importante, emitir `SEASON_CHANGED`.
- Evitar repetir eventos si el worker corre varias veces sobre el mismo estado.

Modificar `apps/api/src/domain/alliances.ts`.

- Emitir `ALLIANCE_EVENT` para tratados, cambios de estado diplomatico o eventos compartidos relevantes.

Modificar `apps/api/src/domain/cityPower.ts` o crear worker posterior.

- Detectar `RANKING_MILESTONE` cuando una aldea entra al top configurado.
- Para MVP, se puede emitir al consultar ranking si detecta entrada nueva, pero lo ideal es un worker/servicio dedicado para no mezclar lectura con escritura.

## Frontend

### Hooks

Modificar `apps/web/src/hooks/useCity.ts` o separar en `apps/web/src/hooks/useWorldEvents.ts`.

Agregar:

- `useWorldEvents(filters)`
- tipos `WorldEvent`, `WorldEventType`
- invalidacion liviana cada 20-30 segundos o polling configurable.

Preferencia: crear `useWorldEvents.ts` para que `useCity.ts` no siga creciendo.

### UI

Modificar `apps/web/src/components/village/VillageView.tsx`.

- Agregar estado `showWorldEvents`.
- Agregar boton/icono en el sidebar/HUD para abrir el modal.
- Reutilizar el patron del ranking modal para no cambiar de ruta.

Crear componente:

- `apps/web/src/components/world/WorldEventsModal.tsx`

Contenido:

- Header compacto: "Mundo".
- Filtros por tipo con tabs o segmented control.
- Lista de eventos con icono, titulo, descripcion corta y tiempo relativo.
- Estado vacio.
- Estado loading/error.

No usar cards anidadas. La lista puede ser una superficie modal con rows densas.

### UX

El jugador debe poder abrir el feed desde:

- `/aldea` sin salir de la vista.
- `/mapa` sin salir de la vista.

Los eventos deben mostrar nombres de aldeas, no nombres de usuario, respetando la direccion actual del ranking.

## Tipos de eventos y copy publico

Ejemplos:

- `BUILDING_COMPLETED`: "Highwatch completo Cuartel nivel 5"
- `RESEARCH_COMPLETED`: "Riverford completo Forja nivel 3"
- `BATTLE_CREATED`: "Stormhold envio un ataque hacia una aldea cercana"
- `BATTLE_RESOLVED`: "Una batalla termino cerca de Northreach"
- `BARBARIAN_CAMP_DEFEATED`: "Ironvale derroto un campamento barbaro nivel 4"
- `SEASON_CHANGED`: "El mundo entro en Invierno"
- `RANKING_MILESTONE`: "Goldmere entro al top 10 de Fuerza"
- `ALLIANCE_EVENT`: "Una alianza firmo un nuevo tratado"

Para PvP, evitar mostrar resultado exacto si todavia queremos niebla estrategica.

## Testing

Backend:

- Testear `createWorldEvent` con tipo habilitado/deshabilitado.
- Testear filtros de `listWorldEvents`.
- Testear que una falla al crear evento no rompe build/research/battle.
- Testear que eventos importantes se emiten una sola vez.

Manual/dev:

- Correr `pnpm db:pg:push`.
- Correr seed o crear aldeas locales.
- Completar una build/research con tiempos dev.
- Lanzar ataque PvP.
- Atacar campamento barbaro.
- Forzar season advance.
- Verificar `GET /world/events`.
- Verificar modal desde aldea y mapa.

Bots:

- Dejar bots corriendo y validar que generen eventos reales.
- Si los bots encuentran errores, deben seguir escribiendo en `docs/bot-error-reports.md`.

## Archivos a crear

- `docs/world-events-implementation-plan.md`
- `apps/api/src/domain/worldEvents.ts`
- `apps/api/src/domain/worldEventConfigData.ts`
- `apps/web/src/hooks/useWorldEvents.ts`
- `apps/web/src/components/world/WorldEventsModal.tsx`

## Archivos a modificar

- `CHANGELOG.md`
- `packages/database/prisma/schema.prisma`
- `apps/api/src/infrastructure/matecito.ts`
- `apps/api/src/infrastructure/postgresCompat.ts`
- `apps/api/src/infrastructure/matecitoRecord.ts`
- `apps/api/src/routes/world.ts`
- `apps/api/src/domain/cityActions.ts`
- `apps/api/src/workers/queueWorker.ts`
- `apps/api/src/domain/barbarians.ts`
- `apps/api/src/domain/seasons.ts` o `apps/api/src/workers/seasonWorker.ts`
- `apps/api/src/domain/alliances.ts`
- `apps/api/src/domain/cityPower.ts` o un nuevo worker de ranking milestones
- `apps/web/src/components/village/VillageView.tsx`

## Riesgos

- Spam de eventos si se emite cada accion menor. Mitigacion: niveles importantes y tipos habilitados desde config.
- Filtracion de informacion tactica. Mitigacion: DTO publico con datos resumidos.
- Duplicados por workers. Mitigacion: metadata con keys logicas o checks antes de emitir.
- Crecimiento de tabla. Mitigacion: retencion configurable y futura limpieza por worker.
- Mezclar lectura con escritura en ranking. Mitigacion: servicio separado para milestones.

## Orden recomendado

1. Schema Prisma + compat collections.
2. Config + `worldEvents.ts`.
3. Endpoint `GET /world/events`.
4. Emitir eventos desde queue worker para build/research/battle.
5. Emitir eventos desde barbaros y seasons.
6. Hook frontend.
7. Modal frontend conectado al HUD/sidebar.
8. Ranking milestone y alliance events como segunda pasada.
9. Tests/verificacion manual.
10. Actualizar `CHANGELOG.md`.

## Criterio de listo

- El feed abre desde aldea y mapa sin cambiar de ruta.
- Los eventos muestran nombres de aldeas.
- Una build completada, una investigacion completada, una batalla y un cambio de temporada aparecen en `/world/events`.
- Los bots generan eventos al usar las mismas acciones que los jugadores.
- No hay valores de gameplay nuevos fuera de config.
- `pnpm --filter @etheria/api lint` y `pnpm --filter @etheria/web build` pasan.
